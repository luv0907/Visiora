"""
VISIORA — API Router
All endpoints organized by domain. Rate limiting applied to AI endpoints.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from typing import Optional, TypeVar, Generic, Any, List, Dict

DataT = TypeVar("DataT")

class SuccessResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: DataT
    error: None = None

def success(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}

from .services.intent import parse_intent
from .services.tutor import get_reactive_explanation, get_proactive_message
from .services.tts import synthesize_speech, TTSUnavailableError
from .physics.validator import validate_and_clamp_variables, validate_scene
from .middleware.rate_limit import apply_ai_rate_limit
from .auth.firebase_auth import optional_auth
from .data.knowledge_graph import KNOWLEDGE_GRAPH

log = structlog.get_logger()
router = APIRouter()


# ══════════════════════════════════════════════════════════════════
# INTENT ENDPOINT
# ══════════════════════════════════════════════════════════════════

class IntentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def sanitize_text(cls, v):
        return v.strip()


class IntentResponse(BaseModel):
    scene: Optional[str]
    parameters: dict
    confidence: float
    explanation: str = ""
    source: str = "unknown"


@router.post("/intent", response_model=SuccessResponse[IntentResponse], dependencies=[Depends(apply_ai_rate_limit)])
async def get_intent(request: IntentRequest):
    result = await parse_intent(request.text)

    if not result["scene"]:
        return success(IntentResponse(
            scene=None,
            parameters={},
            confidence=result.get("confidence", 0),
            explanation="That concept isn't available in VISIORA yet — but check back soon! You can explore gravity, projectile motion, pendulum, collisions, and angular momentum.",
            source=result.get("source", "unknown"),
        ))

    # Clamp any extracted parameters to safe ranges
    safe_params = {}
    if result.get("parameters") and result["scene"]:
        try:
            safe_params = validate_and_clamp_variables(result["scene"], result["parameters"])
        except HTTPException:
            safe_params = {}

    return success(IntentResponse(
        scene=result["scene"],
        parameters=safe_params,
        confidence=result["confidence"],
        explanation=result.get("explanation", ""),
        source=result.get("source", "llm"),
    ))


# ══════════════════════════════════════════════════════════════════
# TUTOR ENDPOINTS
# ══════════════════════════════════════════════════════════════════

class TutorReactRequest(BaseModel):
    scene: str = Field(..., min_length=1, max_length=50)
    event: str = Field(..., min_length=1, max_length=500)
    variables: dict = Field(default_factory=dict)
    idle_time: int = Field(0, ge=0, le=3600)


class TutorProactiveRequest(BaseModel):
    scene: str = Field(..., min_length=1, max_length=50)
    variables: dict = Field(default_factory=dict)


class TutorResponse(BaseModel):
    message: str


@router.post("/tutor/react", response_model=SuccessResponse[TutorResponse], dependencies=[Depends(apply_ai_rate_limit)])
async def tutor_react(request: TutorReactRequest):
    scene = validate_scene(request.scene)
    safe_vars = validate_and_clamp_variables(scene, request.variables)
    message = await get_reactive_explanation(scene, request.event, safe_vars)
    return success(TutorResponse(message=message))


@router.post("/tutor/proactive", response_model=SuccessResponse[TutorResponse], dependencies=[Depends(apply_ai_rate_limit)])
async def tutor_proactive(request: TutorProactiveRequest):
    scene = validate_scene(request.scene)
    safe_vars = validate_and_clamp_variables(scene, request.variables)
    message = await get_proactive_message(scene, safe_vars)
    return success(TutorResponse(message=message))


# ══════════════════════════════════════════════════════════════════
# TTS ENDPOINT
# ══════════════════════════════════════════════════════════════════

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    speed: float = Field(1.0, ge=0.5, le=2.0)


@router.post("/tts", dependencies=[Depends(apply_ai_rate_limit)])
async def text_to_speech(request: TTSRequest):
    try:
        audio_bytes = await synthesize_speech(request.text, request.speed)
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={"Cache-Control": "no-cache"},
        )
    except TTSUnavailableError as e:
        raise HTTPException(status_code=503, detail=f"Voice unavailable: {str(e)}")


# ══════════════════════════════════════════════════════════════════
# GENERATION ENDPOINT
# ══════════════════════════════════════════════════════════════════

class GenerateSimRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)

from .physics.schema import GenerationResult as PhysicsGenerationResult
from .services.generation import generate_concept

@router.post("/generate-sim", response_model=SuccessResponse[PhysicsGenerationResult], dependencies=[Depends(apply_ai_rate_limit)])
async def generate_simulation(request: GenerateSimRequest):
    result = await generate_concept(request.text)
    return success(result)


# ══════════════════════════════════════════════════════════════════
# KNOWLEDGE GRAPH
# ══════════════════════════════════════════════════════════════════

@router.get("/knowledge-graph")
async def get_knowledge_graph():
    return success(KNOWLEDGE_GRAPH)


# ══════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════

class FirebaseLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=10, max_length=4096)


@router.post("/auth/login")
async def login_with_firebase(request_body: FirebaseLoginRequest):
    from .auth.firebase_auth import verify_firebase_token
    user = await verify_firebase_token(request_body.id_token)
    return success({
        "uid": user.get("uid"),
        "email": user.get("email"),
        "name": user.get("name", user.get("email", "Student")),
    })


@router.get("/auth/me")
async def get_current_user(user: dict = Depends(optional_auth)):
    if not user:
        return success({"authenticated": False})
    return success({"authenticated": True, "uid": user.get("uid"), "email": user.get("email")})


# ══════════════════════════════════════════════════════════════════
# ANALYTICS (best-effort)
# ══════════════════════════════════════════════════════════════════

class AnalyticsEvent(BaseModel):
    session_id: str = Field(..., max_length=64)
    type: str = Field(..., max_length=64)
    data: dict = Field(default_factory=dict)
    ts: str = Field(default="")


@router.post("/analytics/event", status_code=202)
async def track_event(event: AnalyticsEvent):
    # Best-effort: log and return 202 Accepted
    log.info("analytics_event", session=event.session_id, type=event.type)
    return success({"accepted": True})


# ══════════════════════════════════════════════════════════════════
# AI INTERACTIVE 2D VISUAL TUTOR
# ══════════════════════════════════════════════════════════════════

class AIVisualTutorRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    apiKey: Optional[str] = None
    model: Optional[str] = "qwen"
    messages: Optional[List[Dict[str, Any]]] = None


@router.post("/ai/visual-tutor")
async def ai_visual_tutor(request: AIVisualTutorRequest):
    from .services.ai_visual_tutor import generate_ai_visual_tutor_response
    result = await generate_ai_visual_tutor_response(
        prompt=request.prompt,
        api_key=request.apiKey,
        model=request.model,
        messages=request.messages
    )
    return success(result)


