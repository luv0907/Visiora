from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional

# ── DOMAINS & OUTCOMES ──────────────────────────────────────────────

class ConceptDomain(str, Enum):
    MECHANICS_3D = "mechanics_3d"
    DIAGRAM_2D = "diagram_2d"

class GenerationOutcome(str, Enum):
    SUCCESS = "success"
    DECLINED = "declined"                        # unsafe, out-of-scope, or not physics
    IMPOSSIBLE = "impossible"                    # violates known physics (FTL, perpetual motion, etc.)
    NEEDS_CLARIFICATION = "needs_clarification"  # too vague to generate safely


# ── MOTION TYPES ────────────────────────────────────────────────────

class MotionType(str, Enum):
    OSCILLATE_Y = "oscillate_y"
    ROTATE_Y = "rotate_y"
    FALL = "fall"
    PENDULUM = "pendulum"
    TRANSLATE_X = "translate_x"
    STATIC = "static"
    # New additions for golden coverage
    DECAY_OSCILLATE = "decay_oscillate"   # damped motion
    ORBIT_PATH = "orbit_path"             # parametric path following
    STATIC_BALANCE = "static_balance"     # equilibrium around a pivot
    DECELERATE_X = "decelerate_x"         # friction / non-conservative


# ── 3D MECHANICS SCHEMA ─────────────────────────────────────────────

class OrbitPath(BaseModel):
    center: tuple[float, float, float]
    semi_major_axis: float
    eccentricity: float

class Object3D(BaseModel):
    id: str
    type: str  # "sphere", "box", "spring", "arrow", etc.
    label: str
    mass: Optional[float] = None
    position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    color: Optional[str] = None
    motion_type: MotionType = MotionType.STATIC
    orbit_path: Optional[OrbitPath] = None
    # For objects with paths:
    trail: bool = False
    # For type="arrow":
    direction: Optional[tuple[float, float, float]] = None
    length: Optional[float] = None


# ── 2D DIAGRAM SCHEMA ───────────────────────────────────────────────

class DiagramNode(BaseModel):
    id: str
    type: str  # "battery", "resistor", "wire_junction", etc.
    label: str
    position: tuple[float, float]  # 2D layout position

class DiagramEdge(BaseModel):
    from_node: str
    to_node: str
    label: Optional[str] = None  # e.g., current direction/value

class Diagram2D(BaseModel):
    nodes: list[DiagramNode]
    edges: list[DiagramEdge]


# ── FORMULA VERIFICATION ────────────────────────────────────────────

class FormulaStep(BaseModel):
    description: str
    equation: str
    substituted: str
    result: float | str


# ── ROOT GENERATION SCHEMA ──────────────────────────────────────────

class ConceptDefinition(BaseModel):
    id: str
    title: str
    description: str
    domain: ConceptDomain
    objects_3d: Optional[list[Object3D]] = None    # Only if MECHANICS_3D
    diagram: Optional[Diagram2D] = None            # Only if DIAGRAM_2D
    formula_steps: list[FormulaStep] = Field(default_factory=list)


class GenerationResult(BaseModel):
    outcome: GenerationOutcome
    concept: Optional[ConceptDefinition] = None    # present only if SUCCESS
    reason: Optional[str] = None                   # present for DECLINED/IMPOSSIBLE/NEEDS_CLARIFICATION
    clarifying_question: Optional[str] = None      # present only for NEEDS_CLARIFICATION
