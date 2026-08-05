import json
import re
import structlog
from typing import Optional, Dict, Any

from .llm import llm, LLMUnavailableError
from ..physics.schema import (
    GenerationOutcome,
    GenerationResult,
    ConceptDefinition
)
from ..physics.verification import verify_formula_steps

log = structlog.get_logger()

# ── PROMPTS ─────────────────────────────────────────────────────────────

CLASSIFICATION_PROMPT = """You are a strict safety and physics classifier.
User request: "{text}"

Classify the request into EXACTLY ONE of these categories:
- safe_physics: A valid physics concept that can be simulated or diagrammed.
- needs_reframing: A physics concept framed unsafely (e.g., "car crash at 200mph" -> classify as needs_reframing so we can reframe it as a generic two-body collision).
- not_physics: Requests about chemistry, biology, history, etc.
- impossible: Violates known conservation laws or physics (e.g., FTL travel, perpetual motion).
- unsafe: Glorifies real-world harm, self-harm, or violence in a way that cannot be reframed.

Return ONLY a JSON object with this exact structure:
{{
  "classification": "<category>",
  "reason": "<one sentence explaining why>"
}}
"""

GENERATION_PROMPT = """You are an expert physics engine generator.
You must return a strictly valid JSON object representing a ConceptDefinition.
The domain can be "mechanics_3d" (for physical simulations) or "diagram_2d" (for circuits/flowcharts).
Available 3D MotionTypes: oscillate_y, rotate_y, fall, pendulum, translate_x, static, decay_oscillate, orbit_path, static_balance, decelerate_x.

User request: "{text}"

GOLDEN EXAMPLES (Follow these structures closely):

1. Orbital Gravity (Mechanics 3D)
{{
  "id": "orbital_gravity",
  "title": "Earth Orbiting Sun",
  "description": "An elliptical orbit demonstrating Kepler's laws.",
  "domain": "mechanics_3d",
  "objects_3d": [
    {{"id": "sun", "type": "sphere", "label": "Sun", "mass": 1000, "position": [0,0,0], "color": "#FFCC00", "motion_type": "static"}},
    {{"id": "earth", "type": "sphere", "label": "Earth", "mass": 10, "position": [5,0,0], "color": "#0099FF", "motion_type": "orbit_path", "trail": true, "orbit_path": {{"center": [0,0,0], "semi_major_axis": 5.0, "eccentricity": 0.2}}}},
    {{"id": "gravity_vector", "type": "arrow", "label": "Fg", "position": [5,0,0], "color": "#EF4444", "motion_type": "static", "direction": [-1, 0, 0], "length": 2.0}}
  ],
  "formula_steps": [
    {{"description": "Calculate orbital velocity (approx)", "equation": "v = sqrt(G*M/r)", "substituted": "sqrt(1 * 1000 / 5)", "result": 14.142}}
  ]
}}

2. Ohm's Law Circuit (Diagram 2D)
{{
  "id": "ohms_law",
  "title": "Simple Circuit",
  "description": "A basic resistor-battery circuit.",
  "domain": "diagram_2d",
  "diagram": {{
    "nodes": [
      {{"id": "v1", "type": "battery", "label": "9V Battery", "position": [0, 5]}},
      {{"id": "r1", "type": "resistor", "label": "100Ω Resistor", "position": [5, 5]}}
    ],
    "edges": [
      {{"from_node": "v1", "to_node": "r1", "label": "I = 90mA"}}
    ]
  }},
  "formula_steps": [
    {{"description": "Calculate Current", "equation": "I = V / R", "substituted": "9 / 100", "result": 0.09}}
  ]
}}

RULES:
1. "substituted" must be a valid math string (e.g. "9 / 100" or "sin(30) * 10") that exactly equals the "result" when evaluated. If the equation is purely symbolic, you may put a symbolic string in "result" as well.
2. If the request is too vague, return a JSON object with exactly: {{"needs_clarification": true, "clarifying_question": "<your question>"}}
3. TEXTBOOK VISUALS: To make the simulation look like a physics textbook, you MUST include `type: "arrow"` objects to represent vectors (force, velocity) where applicable, specifying `direction: [x,y,z]` and `length: float`. You MUST also set `"trail": true` on moving objects (like planets, pendulums, projectiles) to visualize their paths.

Return ONLY valid JSON.
"""

# ── SERVICES ────────────────────────────────────────────────────────────

def extract_json(raw: str) -> dict:
    """Extract JSON from potential markdown block."""
    json_str = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE)
    json_str = re.sub(r"```$", "", json_str, flags=re.MULTILINE).strip()
    return json.loads(json_str)

async def classify_request(text: str) -> GenerationResult | None:
    """
    Step 1: Classification Gate.
    Returns a GenerationResult if it fails the gate (unsafe, impossible),
    or None if it passes.
    """
    provider = llm()
    try:
        raw = await provider.generate(CLASSIFICATION_PROMPT.format(text=text[:500]), schema=True)
        result = extract_json(raw)
        cat = result.get("classification")
        reason = result.get("reason", "")
        
        if cat in ("not_physics", "impossible", "unsafe"):
            outcome = GenerationOutcome.IMPOSSIBLE if cat == "impossible" else GenerationOutcome.DECLINED
            log.info("generation_gate_failed", category=cat, reason=reason)
            return GenerationResult(outcome=outcome, reason=reason)
            
        # safe_physics or needs_reframing pass the gate
        # (needs_reframing tells the main prompt to reframe it safely, though
        # our main prompt handles it generically right now).
        return None
        
    except Exception as e:
        log.error("classification_error", error=str(e))
        # Default to safe if classification fails to not break the app entirely,
        # but in a strict prod env, we might decline.
        return None

async def generate_concept(text: str) -> GenerationResult:
    """
    Step 2 & 3: Main Generation and Verification Gate.
    """
    # 1. Classification
    gate_result = await classify_request(text)
    if gate_result:
        return gate_result
        
    provider = llm()
    max_retries = 1
    
    for attempt in range(max_retries + 1):
        try:
            raw = await provider.generate(GENERATION_PROMPT.format(text=text[:1000]), schema=True)
            data = extract_json(raw)
            
            # Handle needs_clarification
            if data.get("needs_clarification"):
                return GenerationResult(
                    outcome=GenerationOutcome.NEEDS_CLARIFICATION,
                    reason="The request was too vague.",
                    clarifying_question=data.get("clarifying_question", "Could you provide more details?")
                )
                
            concept = ConceptDefinition(**data)
            
            # 3. Arithmetic Verification Gate
            if not verify_formula_steps(concept.formula_steps):
                log.warn("arithmetic_verification_failed", attempt=attempt, steps=[s.model_dump() for s in concept.formula_steps])
                if attempt < max_retries:
                    # Append error context to text for retry?
                    # For now, just retry the exact same prompt (LLM variance might fix it).
                    continue
                else:
                    return GenerationResult(
                        outcome=GenerationOutcome.DECLINED,
                        reason="Failed to verify the physics mathematics safely. Please try again or rephrase."
                    )
            
            log.info("generation_success", domain=concept.domain)
            return GenerationResult(outcome=GenerationOutcome.SUCCESS, concept=concept)
            
        except Exception as e:
            log.error("generation_parse_error", attempt=attempt, error=str(e))
            if attempt >= max_retries:
                return GenerationResult(
                    outcome=GenerationOutcome.DECLINED,
                    reason=f"Failed to generate valid physics structure: {str(e)}"
                )
                
    return GenerationResult(outcome=GenerationOutcome.DECLINED, reason="Unknown error during generation.")
