"""
VISIORA — Intent Parsing Service
2-tier system: keyword shortcut → LLM fallback.
LLM only called when keyword matching is ambiguous.
"""
import json
import re
import structlog
from .llm import llm, LLMUnavailableError

log = structlog.get_logger()

VALID_SCENES = {"gravity", "projectile", "pendulum", "collision", "angular"}

# ── Keyword Shortcuts (no LLM call needed) ───────────────────────
KEYWORD_MAP: list[tuple[re.Pattern, str, dict]] = [
    (re.compile(r"\b(gravity|free.?fall|drop|fall)\b", re.I),      "gravity",    {}),
    (re.compile(r"\b(projectile|launch|throw|shoot|angle|range)\b", re.I), "projectile", {}),
    (re.compile(r"\b(pendulum|swing|period|oscillat)\b", re.I),    "pendulum",   {}),
    (re.compile(r"\b(collisi|collide|crash|elastic|inelastic|momentum)\b", re.I), "collision", {}),
    (re.compile(r"\b(angular|spin|skater|rotat|moment.of.inertia)\b", re.I), "angular",   {}),
]

# Parameter extraction patterns
PARAM_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:kg|kilogram)", re.I), "mass1"),
    (re.compile(r"angle\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:degree|°)?", re.I), "angle"),
    (re.compile(r"height\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:m|meter)?", re.I), "height"),
    (re.compile(r"length\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:m|meter)?", re.I), "length"),
    (re.compile(r"velocity\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:m/s)?", re.I), "velocity"),
    (re.compile(r"speed\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:m/s)?", re.I), "velocity"),
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:m/s|meters per second)", re.I), "velocity"),
    (re.compile(r"gravity\s+(?:of\s+)?(\d+(?:\.\d+)?)", re.I), "gravity"),
]


def keyword_match(text: str) -> dict | None:
    """Try to match intent locally without LLM."""
    for pattern, scene, extra_params in KEYWORD_MAP:
        if pattern.search(text):
            params = extract_params(text)
            params.update(extra_params)
            log.info("intent_keyword_match", scene=scene)
            return {"scene": scene, "parameters": params, "confidence": 0.85, "source": "keyword"}
    return None


def extract_params(text: str) -> dict:
    """Extract numeric parameters from natural language."""
    params = {}
    for pattern, param_name in PARAM_PATTERNS:
        m = pattern.search(text)
        if m:
            try:
                params[param_name] = float(m.group(1))
            except ValueError:
                pass
    return params


LLM_INTENT_PROMPT = """You are a physics simulation assistant. Extract the user's intent from their query.

Available scenes: gravity (free fall), projectile (projectile motion), pendulum (simple pendulum), collision (elastic/inelastic collisions), angular (angular momentum).

User query: "{text}"

Return ONLY valid JSON with this exact structure:
{{
  "scene": "<scene_id or null if no match>",
  "parameters": {{<extracted numeric params, e.g. "angle": 45, "mass1": 2.0>}},
  "confidence": <0.0-1.0>,
  "explanation": "<one sentence about what the user wants>"
}}

Rules:
- If the concept doesn't match any scene, return scene: null and confidence < 0.5
- NEVER make up a simulation that doesn't exist
- Parameters should be in SI units (kg, m, m/s, degrees)"""


async def parse_intent(text: str) -> dict:
    """
    Parse user query into structured intent.
    Returns { scene, parameters, confidence, explanation, source }
    """
    # Tier 1: keyword match (free)
    kw = keyword_match(text)
    if kw:
        return kw

    # Tier 2: LLM (paid)
    try:
        provider = llm()
        raw = await provider.generate(LLM_INTENT_PROMPT.format(text=text[:500]))
        # Extract JSON (handle markdown code blocks)
        json_str = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()
        result = json.loads(json_str)

        # Validate
        scene = result.get("scene")
        if scene and scene not in VALID_SCENES:
            scene = None
        confidence = float(result.get("confidence", 0))

        log.info("intent_llm_parsed", scene=scene, confidence=confidence)

        return {
            "scene": scene,
            "parameters": result.get("parameters", {}),
            "confidence": confidence,
            "explanation": result.get("explanation", ""),
            "source": "llm",
        }
    except (json.JSONDecodeError, KeyError) as e:
        log.warning("intent_parse_error", error=str(e))
        return {"scene": None, "parameters": {}, "confidence": 0.0, "source": "error"}
    except LLMUnavailableError as e:
        log.warning("intent_llm_unavailable", error=str(e))
        return {"scene": None, "parameters": {}, "confidence": 0.0, "source": "unavailable"}
