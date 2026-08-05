"""
VISIORA — Progress / Profile / Session / Quiz Router
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import List

from ..auth.firebase_auth import require_auth
from ..middleware.rate_limit import apply_ai_rate_limit
from ..services.progress import (
    get_user_profile,
    get_full_progress,
    update_class_code,
    update_profile_fields,
    record_session,
    record_quiz_result,
    VALID_GRADES,
    VALID_AVATARS,
    CONCEPT_IDS,
)
from ..data.quiz_bank import QUIZ_BANK, QUIZ_INDEX
from ..router import success

log = structlog.get_logger()
router = APIRouter(tags=["Progress"])


# ══════════════════════════════════════════════════════════════════
# PROGRESS — combined payload
# ══════════════════════════════════════════════════════════════════

@router.get("/progress")
async def get_progress(user: dict = Depends(require_auth)):
    """GET /api/v1/progress — full profile + mastery + sessions + quizzes in one call."""
    data = await get_full_progress(user["uid"])
    return success(data)


# ══════════════════════════════════════════════════════════════════
# PROFILE
# ══════════════════════════════════════════════════════════════════

class ClassCodeUpdate(BaseModel):
    classCode: str = Field(..., max_length=20)


class ProfileUpdate(BaseModel):
    name:   str = Field(..., min_length=1, max_length=40)
    grade:  str
    avatar: str

    @field_validator("grade")
    @classmethod
    def validate_grade(cls, v):
        if v not in VALID_GRADES:
            raise ValueError(f"grade must be one of {sorted(VALID_GRADES)}")
        return v

    @field_validator("avatar")
    @classmethod
    def validate_avatar(cls, v):
        if v not in VALID_AVATARS:
            raise ValueError(f"avatar must be one of the approved set")
        return v


@router.get("/progress/me")
async def get_my_profile(user: dict = Depends(require_auth)):
    profile = await get_user_profile(user["uid"])
    return success(profile)


@router.put("/profile/me")
async def update_profile(request: ProfileUpdate, user: dict = Depends(require_auth)):
    profile = await update_profile_fields(
        uid=user["uid"],
        name=request.name,
        grade=request.grade,
        avatar=request.avatar,
    )
    return success(profile)


@router.post("/progress/class")
async def set_class_code(request: ClassCodeUpdate, user: dict = Depends(require_auth)):
    profile = await update_class_code(user["uid"], request.classCode)
    return success(profile)


# ══════════════════════════════════════════════════════════════════
# SESSIONS
# ══════════════════════════════════════════════════════════════════

class SessionLog(BaseModel):
    conceptId:        str = Field(..., min_length=1, max_length=50)
    durationSeconds:  int = Field(..., ge=0, le=86400)
    questionsAsked:   int = Field(0, ge=0)
    variablesChanged: List[str] = Field(default_factory=list)

    @field_validator("conceptId")
    @classmethod
    def validate_concept(cls, v):
        if v not in CONCEPT_IDS:
            raise ValueError(f"conceptId must be one of {CONCEPT_IDS}")
        return v


@router.post("/sessions")
async def log_session(request: SessionLog, user: dict = Depends(require_auth)):
    result = await record_session(
        uid=user["uid"],
        concept_id=request.conceptId,
        duration_seconds=request.durationSeconds,
        questions_asked=request.questionsAsked,
        variables_changed=request.variablesChanged,
    )
    return success(result)


# ══════════════════════════════════════════════════════════════════
# QUIZ
# ══════════════════════════════════════════════════════════════════

@router.get("/quiz/{concept_id}")
async def get_quiz(concept_id: str):
    """Returns questions with correct_index and explanation STRIPPED."""
    if concept_id not in QUIZ_BANK:
        raise HTTPException(status_code=404, detail=f"No quiz found for concept: {concept_id}")
    questions = QUIZ_BANK[concept_id]
    safe = [
        {"id": q["id"], "question": q["question"], "options": q["options"]}
        for q in questions
    ]
    return success({"conceptId": concept_id, "questions": safe, "total": len(safe)})

class SingleAnswer(BaseModel):
    questionId:    str = Field(..., min_length=1, max_length=20)
    selectedIndex: int = Field(..., ge=0, le=3)


@router.post("/quiz/{concept_id}/answer", dependencies=[Depends(apply_ai_rate_limit)])
async def grade_single_answer(concept_id: str, request: SingleAnswer, user: dict = Depends(require_auth)):
    """Grade one question immediately after the student commits an answer.
    
    The correct_index is never sent to the client before this call —
    it is revealed here only because the student has already locked in
    their choice (selectedIndex is required). This preserves the
    security model while enabling immediate per-question feedback.
    
    Auth and AI-tier rate limiting are enforced to prevent bulk scraping
    of the answer key by malicious actors.
    """
    if concept_id not in QUIZ_BANK:
        raise HTTPException(status_code=404, detail=f"No quiz found for concept: {concept_id}")

    entry = QUIZ_INDEX.get(request.questionId)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Question not found: {request.questionId}")
    if entry["concept_id"] != concept_id:
        raise HTTPException(status_code=422, detail="Question does not belong to this concept")

    correct = request.selectedIndex == entry["correct_index"]
    return success({
        "correct":      correct,
        "correctIndex": entry["correct_index"],
        "explanation":  entry["explanation"],
    })


class QuizSubmission(BaseModel):
    conceptId: str = Field(..., min_length=1, max_length=50)
    answers:   List[int]   # index of chosen option per question

    @field_validator("conceptId")
    @classmethod
    def validate_concept(cls, v):
        if v not in QUIZ_BANK:
            raise ValueError(f"conceptId not found")
        return v


@router.post("/quiz/submit")
async def submit_quiz(request: QuizSubmission, user: dict = Depends(require_auth)):
    """Grade quiz server-side. Returns score + explanations + updated mastery."""
    bank = QUIZ_BANK.get(request.conceptId, [])
    if len(request.answers) != len(bank):
        raise HTTPException(
            status_code=422,
            detail=f"Expected {len(bank)} answers, got {len(request.answers)}"
        )

    correct_count = 0
    graded = []
    for i, q in enumerate(bank):
        chosen = request.answers[i]
        is_correct = (chosen == q["correct_index"])
        if is_correct:
            correct_count += 1
        graded.append({
            "id": q["id"],
            "correct": is_correct,
            "correctIndex": q["correct_index"],
            "explanation": q["explanation"],
        })

    raw_score = correct_count / len(bank) if bank else 0
    # Estimate ~5 min session equivalent for quiz time-on-task
    result = await record_quiz_result(
        uid=user["uid"],
        scene=request.conceptId,
        score=raw_score,
        time_spent_mins=5.0,
    )

    return success({
        "conceptId":    request.conceptId,
        "score":        correct_count,
        "total":        len(bank),
        "rawScore":     raw_score,
        "mastery":      result.get("mastery", 0),
        "newBadges":    result.get("newBadges", []),
        "graded":       graded,
    })
