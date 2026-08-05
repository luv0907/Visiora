"""
VISIORA — Server-Side Physics Variable Validator
Clamps all physics input values to safe ranges.
Prevents malicious/malformed requests from crashing the formula engine.
"""
from fastapi import HTTPException

# Must mirror VARIABLE_LIMITS in frontend/src/config/physics.js
VARIABLE_CONSTRAINTS: dict[str, dict] = {
    "height":          {"min": 0.0,   "max": 200.0},
    "mass":            {"min": 0.01,  "max": 10000.0},
    "mass1":           {"min": 0.01,  "max": 10000.0},
    "mass2":           {"min": 0.01,  "max": 10000.0},
    "gravity":         {"min": 0.1,   "max": 30.0},
    "velocity":        {"min": 0.0,   "max": 500.0},
    "velocity1":       {"min": -500.0,"max": 500.0},
    "velocity2":       {"min": -500.0,"max": 500.0},
    "angle":           {"min": 0.0,   "max": 90.0},
    "length":          {"min": 0.01,  "max": 100.0},
    "angularVelocity": {"min": 0.0,   "max": 100.0},
    "armRadius":       {"min": 0.01,  "max": 10.0},
    "restitution":     {"min": 0.0,   "max": 1.0},
}


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def validate_and_clamp_variables(scene: str, variables: dict) -> dict:
    """
    Validates and clamps all variable values for a scene.
    Raises HTTPException(422) if a variable is completely invalid (NaN, infinite).
    Returns clamped dict safe for formula computation.
    """
    cleaned = {}
    for key, value in (variables or {}).items():
        # Type safety
        try:
            value = float(value)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail=f"Variable '{key}' must be a number, got: {value!r}"
            )

        import math
        if math.isnan(value) or math.isinf(value):
            raise HTTPException(
                status_code=422,
                detail=f"Variable '{key}' has invalid value: {value}"
            )

        # Clamp to known limits
        constraints = VARIABLE_CONSTRAINTS.get(key)
        if constraints:
            value = clamp(value, constraints["min"], constraints["max"])

        cleaned[key] = value

    return cleaned


VALID_SCENES = {"gravity", "projectile", "pendulum", "collision", "angular"}


def validate_scene(scene: str) -> str:
    if scene not in VALID_SCENES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown scene '{scene}'. Valid: {sorted(VALID_SCENES)}"
        )
    return scene
