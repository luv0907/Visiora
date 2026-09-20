"""
VISIORA — AI Interactive 2D Visual Tutor Service
Generates physics conceptual explanations alongside interactive 2D simulation
specifications (parameters, live sliders, formulas, telemetry metrics).
Supports Google Gemini, Groq, OpenRouter, and includes a built-in deterministic
high-fidelity physics engine fallback.
"""
import os
import json
import re
import httpx
import structlog
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

log = structlog.get_logger()


class SliderParam(BaseModel):
    id: str
    label: str
    min: float
    max: float
    step: float
    default: float
    unit: str


class VisualSceneSpec(BaseModel):
    topic: str
    concept: str
    explanation: str
    formula: str
    visualType: str  # 'projectile' | 'pendulum' | 'refraction' | 'circuit' | 'wave' | 'gravity'
    sliders: List[SliderParam]
    telemetryMetrics: List[Dict[str, str]]
    takeaways: List[str]


# ── Built-in Deterministic Visual Presets ─────────────────────────────
DETERMINISTIC_SCENES: Dict[str, VisualSceneSpec] = {
    "projectile": VisualSceneSpec(
        topic="Projectile Motion & Ballistics",
        concept="Two-Dimensional Parabolic Trajectories Under Gravity",
        explanation=(
            "When an object is launched into the air with an initial velocity $v_0$ at an angle $\\theta$, "
            "its motion decomposes into two independent orthogonal vectors: constant horizontal velocity "
            "$v_x = v_0 \\cos\\theta$ and vertically accelerated motion $v_y(t) = v_0 \\sin\\theta - gt$. "
            "Because gravity acts purely downward, the horizontal velocity remains constant throughout the flight, "
            "producing a symmetric parabola in the absence of aerodynamic drag."
        ),
        formula="R = \\frac{v_0^2 \\sin(2\\theta)}{g}, \\quad H_{max} = \\frac{v_0^2 \\sin^2\\theta}{2g}",
        visualType="projectile",
        sliders=[
            SliderParam(id="launchVelocity", label="Launch Velocity (v₀)", min=5, max=50, step=1, default=24, unit="m/s"),
            SliderParam(id="launchAngle", label="Launch Angle (θ)", min=10, max=85, step=1, default=45, unit="°"),
            SliderParam(id="gravity", label="Gravitational Field (g)", min=1.6, max=25.0, step=0.2, default=9.8, unit="m/s²"),
            SliderParam(id="airDrag", label="Air Drag Coefficient (k)", min=0.0, max=0.15, step=0.01, default=0.0, unit="")
        ],
        telemetryMetrics=[
            {"id": "range", "label": "Horizontal Range (R)", "unit": "m"},
            {"id": "maxHeight", "label": "Max Peak Height (H)", "unit": "m"},
            {"id": "timeOfFlight", "label": "Time of Flight (T)", "unit": "s"},
            {"id": "vx", "label": "Horizontal Velocity (vₓ)", "unit": "m/s"}
        ],
        takeaways=[
            "45° launch angle maximizes range in vacuum conditions.",
            "Horizontal and vertical motions are strictly independent.",
            "Air resistance causes an asymmetric trajectory with a steeper landing path."
        ]
    ),
    "pendulum": VisualSceneSpec(
        topic="Simple Harmonic Motion & Pendulum Dynamics",
        concept="Restoring Force and Period Invariance",
        explanation=(
            "A simple pendulum consists of a point mass $m$ suspended by a string of length $L$. "
            "The restoring force driving the bob back toward equilibrium is the tangential component of gravity: "
            "$F = -mg \\sin\\theta$. For small angular displacements $(\\theta < 15^\\circ)$, "
            "$\\sin\\theta \\approx \\theta$ (in radians), transforming the differential equation into classic Simple Harmonic Motion. "
            "Remarkably, the oscillation period $T$ is completely independent of the bob's mass!"
        ),
        formula="T = 2\\pi \\sqrt{\\frac{L}{g}}, \\quad \\omega = \\sqrt{\\frac{g}{L}}",
        visualType="pendulum",
        sliders=[
            SliderParam(id="length", label="String Length (L)", min=0.3, max=3.0, step=0.1, default=1.5, unit="m"),
            SliderParam(id="gravity", label="Gravitational Field (g)", min=1.6, max=25.0, step=0.2, default=9.8, unit="m/s²"),
            SliderParam(id="initialAngle", label="Initial Amplitude (θ₀)", min=5, max=60, step=1, default=25, unit="°"),
            SliderParam(id="damping", label="Air Damping (b)", min=0.0, max=0.08, step=0.005, default=0.01, unit="s⁻¹")
        ],
        telemetryMetrics=[
            {"id": "period", "label": "Oscillation Period (T)", "unit": "s"},
            {"id": "frequency", "label": "Natural Frequency (f)", "unit": "Hz"},
            {"id": "maxSpeed", "label": "Max Speed at Equilibrium", "unit": "m/s"},
            {"id": "totalEnergy", "label": "Mechanical Energy (E)", "unit": "J"}
        ],
        takeaways=[
            "Period quadruples when string length is multiplied by four (square root relationship).",
            "Mass has zero effect on the period of oscillation.",
            "Higher gravity (like Jupiter) accelerates the restoring swing and decreases the period."
        ]
    ),
    "refraction": VisualSceneSpec(
        topic="Wave Optics & Snell's Law of Refraction",
        concept="Phase Velocity Boundary Transition and Light Bending",
        explanation=(
            "When a light wave traverses the boundary between two optical media of differing refractive indices "
            "($n_1$ and $n_2$), its propagation velocity changes from $v_1 = c/n_1$ to $v_2 = c/n_2$. "
            "By Fermat's Principle of Least Time, the wavefront refracts at the interface such that the product "
            "$n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2$ is strictly conserved. If light travels from an optically denser medium "
            "to a rarer medium beyond the critical angle $\\theta_c = \\arcsin(n_2/n_1)$, total internal reflection occurs."
        ),
        formula="n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2, \\quad \\theta_c = \\arcsin\\left(\\frac{n_2}{n_1}\\right)",
        visualType="refraction",
        sliders=[
            SliderParam(id="incidentAngle", label="Incident Angle (θ₁)", min=0, max=85, step=1, default=40, unit="°"),
            SliderParam(id="n1", label="Medium 1 Index (n₁)", min=1.0, max=2.5, step=0.05, default=1.0, unit=""),
            SliderParam(id="n2", label="Medium 2 Index (n₂)", min=1.0, max=2.5, step=0.05, default=1.52, unit=""),
            SliderParam(id="wavelength", label="Wavelength (λ)", min=380, max=750, step=10, default=532, unit="nm")
        ],
        telemetryMetrics=[
            {"id": "refractedAngle", "label": "Refracted Angle (θ₂)", "unit": "°"},
            {"id": "criticalAngle", "label": "Critical Angle (θ_c)", "unit": "°"},
            {"id": "v2", "label": "Phase Velocity in Medium 2", "unit": "×10⁸ m/s"},
            {"id": "isTIR", "label": "Total Internal Reflection?", "unit": ""}
        ],
        takeaways=[
            "Light bends toward the normal when entering a denser medium ($n_2 > n_1$).",
            "Total Internal Reflection allows optical fiber data transfer across continents.",
            "Wavelength shortens in the denser medium, but wave frequency remains invariant."
        ]
    ),
    "circuit": VisualSceneSpec(
        topic="Ohm's Law & DC Circuit Electrodynamics",
        concept="Charge Drift, Potential Drop, and Joule Heating",
        explanation=(
            "Ohm's Law expresses that the electric current $I$ flowing through an ideal conductor is directly "
            "proportional to the electrical potential difference $V$ across its terminals, inversely proportional "
            "to resistance $R$: $I = V / R$. When charge carriers (electrons) drift through the metallic lattice, "
            "inelastic collisions dissipate electrical potential energy into thermal kinetic energy, "
            "described by Joule heating: $P = I^2 R = V I$."
        ),
        formula="V = I \\cdot R, \\quad P = V \\cdot I = I^2 R = \\frac{V^2}{R}",
        visualType="circuit",
        sliders=[
            SliderParam(id="voltage", label="Source Potential (V)", min=1.0, max=24.0, step=0.5, default=9.0, unit="V"),
            SliderParam(id="resistance", label="Load Resistance (R)", min=1.0, max=100.0, step=1.0, default=10.0, unit="Ω"),
            SliderParam(id="internalR", label="Internal Battery R", min=0.0, max=5.0, step=0.1, default=0.5, unit="Ω")
        ],
        telemetryMetrics=[
            {"id": "current", "label": "Loop Current (I)", "unit": "A"},
            {"id": "power", "label": "Thermal Power Dissipated (P)", "unit": "W"},
            {"id": "vLoad", "label": "Terminal Voltage (V_load)", "unit": "V"},
            {"id": "electronSpeed", "label": "Relative Drift Flow", "unit": "arb"}
        ],
        takeaways=[
            "Doubling voltage doubles the current, quadrupling power dissipation.",
            "Internal battery resistance causes the terminal voltage to sag under heavy load.",
            "Current is constant throughout a single closed series loop."
        ]
    ),
    "buoyancy": VisualSceneSpec(
        topic="Archimedes' Principle & Buoyancy",
        concept="Fluid Displacement and Net Vertical Force",
        explanation=(
            "Archimedes' Principle states that any body completely or partially submerged in a fluid "
            "is buoyed up by a force equal to the weight of the fluid displaced by the body: $F_b = \\rho_{fluid} V_{disp} g$. "
            "When the buoyant force exceeds the object's gravitational weight ($F_g = m g = \\rho_{obj} V g$), "
            "the net upward acceleration causes it to float to the surface. Conversely, when object density exceeds fluid density, it sinks."
        ),
        formula="F_b = \\rho_{fluid} \\cdot V_{disp} \\cdot g, \\quad F_{net} = (\\rho_{fluid} - \\rho_{obj}) V g",
        visualType="buoyancy",
        sliders=[
            SliderParam(id="fluidDensity", label="Fluid Density (ρ_f)", min=500, max=2000, step=25, default=1000, unit="kg/m³"),
            SliderParam(id="objectDensity", label="Object Density (ρ_obj)", min=100, max=2500, step=25, default=650, unit="kg/m³"),
            SliderParam(id="objectVolume", label="Object Volume (V)", min=0.01, max=0.5, step=0.01, default=0.1, unit="m³"),
            SliderParam(id="gravity", label="Gravitational Field (g)", min=1.6, max=25.0, step=0.2, default=9.8, unit="m/s²")
        ],
        telemetryMetrics=[
            {"id": "buoyantForce", "label": "Buoyant Force (F_b)", "unit": "N"},
            {"id": "weight", "label": "Gravity Weight (F_g)", "unit": "N"},
            {"id": "netForce", "label": "Net Vertical Force", "unit": "N"},
            {"id": "status", "label": "Equilibrium State", "unit": ""}
        ],
        takeaways=[
            "An object floats when its average density is less than the surrounding fluid or air.",
            "Buoyant force depends entirely on the fluid displaced, not the material inside the object.",
            "Hot air balloons float because heating the internal air decreases its density below the cool morning air."
        ]
    ),
    "wave": VisualSceneSpec(
        topic="Harmonic Waves & Wave Mechanics",
        concept="Propagation Velocity, Frequency, and Wavelength",
        explanation=(
            "A continuous sinusoidal wave represents the spatial and temporal propagation of a physical disturbance "
            "without transporting net matter. The wave speed $v$ satisfies the fundamental wave relation: $v = f \\lambda$. "
            "Particles in the medium oscillate with simple harmonic motion around their equilibrium positions, "
            "governed by the wave equation $y(x, t) = A \\sin(k x - \\omega t)$, where $k = 2\\pi/\\lambda$ and $\\omega = 2\\pi f$."
        ),
        formula="v = f \\cdot \\lambda, \\quad y(x, t) = A \\sin(kx - \\omega t)",
        visualType="wave",
        sliders=[
            SliderParam(id="amplitude", label="Wave Amplitude (A)", min=10, max=80, step=2, default=40, unit="px"),
            SliderParam(id="frequency", label="Frequency (f)", min=0.5, max=5.0, step=0.1, default=1.5, unit="Hz"),
            SliderParam(id="wavelength", label="Wavelength (λ)", min=60, max=300, step=10, default=150, unit="px"),
            SliderParam(id="waveSpeed", label="Phase Velocity (v)", min=50, max=400, step=10, default=225, unit="px/s")
        ],
        telemetryMetrics=[
            {"id": "period", "label": "Oscillation Period (T)", "unit": "s"},
            {"id": "omega", "label": "Angular Frequency (ω)", "unit": "rad/s"},
            {"id": "waveNumber", "label": "Wave Number (k)", "unit": "rad/m"},
            {"id": "phaseSpeed", "label": "Phase Velocity (v)", "unit": "m/s"}
        ],
        takeaways=[
            "Wave speed depends solely on medium properties, not on amplitude or frequency alone.",
            "Higher frequency compresses the wavelength when speed is constant ($f \\propto 1/\\lambda$).",
            "Energy carried by a wave scales quadratically with both frequency and amplitude ($E \\propto A^2 f^2$)."
        ]
    ),
    "spring": VisualSceneSpec(
        topic="Hooke's Law & Harmonic Spring Oscillations",
        concept="Elastic Restoring Force and Energy Interchange",
        explanation=(
            "Hooke's Law states that the restoring force exerted by an ideal elastic spring is directly proportional "
            "to its displacement from equilibrium: $F = -k x$. When released, the mass-spring system undergoes simple "
            "harmonic motion where potential energy $U = \\frac{1}{2}kx^2$ continually converts into kinetic energy "
            "$K = \\frac{1}{2}mv^2$. The oscillation period is independent of amplitude!"
        ),
        formula="F = -k x, \\quad T = 2\\pi \\sqrt{\\frac{m}{k}}, \\quad E = \\frac{1}{2} k A^2",
        visualType="spring",
        sliders=[
            SliderParam(id="k", label="Spring Stiffness (k)", min=5, max=100, step=5, default=25, unit="N/m"),
            SliderParam(id="mass", label="Oscillating Mass (m)", min=0.2, max=5.0, step=0.1, default=1.0, unit="kg"),
            SliderParam(id="amplitude", label="Displacement (x₀)", min=0.1, max=0.8, step=0.05, default=0.4, unit="m"),
            SliderParam(id="damping", label="Damping Friction (b)", min=0.0, max=0.5, step=0.02, default=0.04, unit="N·s/m")
        ],
        telemetryMetrics=[
            {"id": "period", "label": "Oscillation Period (T)", "unit": "s"},
            {"id": "frequency", "label": "Natural Frequency (f)", "unit": "Hz"},
            {"id": "restoringForce", "label": "Max Restoring Force", "unit": "N"},
            {"id": "totalEnergy", "label": "Total Elastic Energy", "unit": "J"}
        ],
        takeaways=[
            "Stiffer springs (higher k) oscillate faster with a shorter period.",
            "Heavier masses oscillate slower due to greater inertia.",
            "Mechanical energy is conserved between kinetic and elastic potential states."
        ]
    ),
    "collision": VisualSceneSpec(
        topic="Conservation of Linear Momentum & Impact Mechanics",
        concept="Momentum Conservation and Coefficient of Restitution",
        explanation=(
            "In an isolated physical system, total linear momentum is strictly conserved across any collision: "
            "$m_1 v_{1i} + m_2 v_{2i} = m_1 v_{1f} + m_2 v_{2f}$. The coefficient of restitution $e$ determines "
            "the elasticity of the collision: $e = 1$ is perfectly elastic (kinetic energy conserved), whereas "
            "$e = 0$ is completely inelastic (objects stick together and dissipate maximum kinetic energy into heat)."
        ),
        formula="m_1 v_1 + m_2 v_2 = \\text{const}, \\quad e = \\frac{v_{2f} - v_{1f}}{v_{1i} - v_{2i}}",
        visualType="collision",
        sliders=[
            SliderParam(id="m1", label="Mass 1 (m₁)", min=0.5, max=10.0, step=0.5, default=2.0, unit="kg"),
            SliderParam(id="v1", label="Velocity 1 (v₁)", min=1.0, max=15.0, step=0.5, default=6.0, unit="m/s"),
            SliderParam(id="m2", label="Mass 2 (m₂)", min=0.5, max=10.0, step=0.5, default=3.0, unit="kg"),
            SliderParam(id="cor", label="Restitution (e)", min=0.0, max=1.0, step=0.05, default=0.85, unit="")
        ],
        telemetryMetrics=[
            {"id": "totalMomentum", "label": "Total Momentum (P)", "unit": "kg·m/s"},
            {"id": "kineticEnergy", "label": "System Kinetic Energy", "unit": "J"},
            {"id": "v1Final", "label": "Post-Impact v₁", "unit": "m/s"},
            {"id": "v2Final", "label": "Post-Impact v₂", "unit": "m/s"}
        ],
        takeaways=[
            "Total momentum is always conserved regardless of elasticity.",
            "Tennis balls bounce lower than basketballs because their materials have a lower coefficient of restitution.",
            "In a head-on collision of equal masses, velocities swap completely."
        ]
    ),
    "gravity": VisualSceneSpec(
        topic="Newton's Law of Universal Gravitation & Orbits",
        concept="Inverse-Square Gravitational Attraction and Orbital Centripetal Force",
        explanation=(
            "Every particle in the universe attracts every other particle with a gravitational force directly proportional "
            "to the product of their masses and inversely proportional to the square of the distance between their centers: "
            "$F = G \\frac{M m}{r^2}$. In circular orbit, gravity provides the exact centripetal force required to keep "
            "the satellite in orbit: $v_{orb} = \\sqrt{G M / r}$. The orbital period satisfies Kepler's Third Law."
        ),
        formula="F_g = \\frac{G M m}{r^2}, \\quad v_{orb} = \\sqrt{\\frac{G M}{r}}, \\quad T^2 = \\frac{4\\pi^2}{GM} r^3",
        visualType="gravity",
        sliders=[
            SliderParam(id="centralMass", label="Central Planet Mass (M)", min=1.0, max=20.0, step=0.5, default=6.0, unit="×10²⁴ kg"),
            SliderParam(id="orbitRadius", label="Orbital Altitude (r)", min=50, max=250, step=10, default=130, unit="km"),
            SliderParam(id="satelliteSpeed", label="Orbital Velocity (v)", min=3.0, max=12.0, step=0.2, default=7.8, unit="km/s"),
            SliderParam(id="eccentricity", label="Eccentricity (e)", min=0.0, max=0.8, step=0.05, default=0.1, unit="")
        ],
        telemetryMetrics=[
            {"id": "orbitVelocity", "label": "Circular Velocity", "unit": "km/s"},
            {"id": "orbitPeriod", "label": "Orbital Period", "unit": "min"},
            {"id": "gravityAcc", "label": "Local Acceleration (g)", "unit": "m/s²"},
            {"id": "centripetalF", "label": "Gravitational Force", "unit": "kN"}
        ],
        takeaways=[
            "Satellites do not fall because their high horizontal speed causes them to 'fall around' Earth's curvature.",
            "Orbital speed decreases as orbital altitude increases ($v \\propto 1/\\sqrt{r}$).",
            "Astronauts feel weightless not because gravity is zero, but because they are in continuous free-fall."
        ]
    )
}


def _classify_topic(prompt: str) -> str:
    p = prompt.lower()
    if any(k in p for k in ["balloon", "buoy", "float", "sink", "archimedes", "density", "submerge", "displace", "water tank", "boat", "ship"]):
        return "buoyancy"
    if any(k in p for k in ["spring", "hooke", "elasticity", "stiffness"]):
        return "spring"
    if any(k in p for k in ["collision", "momentum", "collide", "billiard", "restitution", "bounce", "drop height"]):
        return "collision"
    if any(k in p for k in ["orbit", "satellite", "gravity", "planet", "kepler", "space station", "gravitational"]):
        return "gravity"
    if any(k in p for k in ["wave", "sound", "ripple", "frequency", "wavelength", "amplitude", "sinusoid", "guitar string"]):
        return "wave"
    if any(k in p for k in ["snell", "refract", "optics", "light", "lens", "prism", "index", "tir", "reflection"]):
        return "refraction"
    if any(k in p for k in ["ohm", "circuit", "resistor", "current", "voltage", "battery", "ampere", "joule"]):
        return "circuit"
    if any(k in p for k in ["pendulum", "shm", "bob", "period", "string"]):
        return "pendulum"
    return "projectile"


def _infer_visual_type(prompt: str, llm_type: Optional[str] = None) -> str:
    p = prompt.lower()
    valid_types = ["buoyancy", "projectile", "pendulum", "refraction", "circuit", "wave", "spring", "collision", "gravity"]
    
    # Priority keyword overrides so questions about buoyancy/balloons never show projectile
    if any(k in p for k in ["balloon", "buoy", "float", "sink", "archimedes", "density", "submerge", "displace", "water tank", "boat", "ship"]):
        return "buoyancy"
    if any(k in p for k in ["spring", "hooke", "elasticity", "stiffness"]):
        return "spring"
    if any(k in p for k in ["collision", "momentum", "collide", "impulse", "billiard", "restitution"]):
        return "collision"
    if any(k in p for k in ["orbit", "satellite", "kepler", "gravitational field", "planet", "space station"]):
        return "gravity"
    if any(k in p for k in ["wave", "sound", "ripple", "frequency", "wavelength", "amplitude", "sinusoid", "guitar string"]):
        return "wave"
    if any(k in p for k in ["snell", "refract", "optics", "lens", "prism", "index of refraction", "tir", "reflection"]):
        return "refraction"
    if any(k in p for k in ["ohm", "circuit", "resistor", "current", "voltage", "battery"]):
        return "circuit"
    if any(k in p for k in ["pendulum", "swinging bob"]):
        return "pendulum"
    if any(k in p for k in ["projectile", "ballistic", "cannon", "launch angle", "trajectory", "parabola"]):
        return "projectile"

    if llm_type in valid_types:
        return llm_type
    return _classify_topic(prompt)


def _get_openrouter_key() -> str:
    try:
        from ..config import settings
        if settings and getattr(settings, "OPENROUTER_API_KEY", ""):
            return settings.OPENROUTER_API_KEY
    except Exception:
        pass
    try:
        from app.config import settings
        if settings and getattr(settings, "OPENROUTER_API_KEY", ""):
            return settings.OPENROUTER_API_KEY
    except Exception:
        pass
    return os.getenv("OPENROUTER_API_KEY", "")


def _get_gemini_key(api_key: Optional[str] = None) -> str:
    if api_key:
        return api_key
    try:
        from ..config import settings
        if settings and getattr(settings, "GEMINI_API_KEY", ""):
            return settings.GEMINI_API_KEY
    except Exception:
        pass
    try:
        from app.config import settings
        if settings and getattr(settings, "GEMINI_API_KEY", ""):
            return settings.GEMINI_API_KEY
    except Exception:
        pass
    return os.getenv("GEMINI_API_KEY", "")


def _get_groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "")


async def generate_ai_visual_tutor_response(
    prompt: str,
    api_key: Optional[str] = None,
    model: Optional[str] = "qwen",
    messages: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Main entry point: Generates a dynamic conceptual explanation and an interactive 2D simulation spec.
    Uses multi-model cascading fallback via OpenRouter for high uptime and sub-3s response latency.
    """
    category = _classify_topic(prompt)
    fallback = DETERMINISTIC_SCENES.get(category, DETERMINISTIC_SCENES["projectile"])

    if model == "offline":
        return fallback.dict()

    system_prompt = (
        "You are VISIORA Atelier's interactive physics tutor — an inspiring, friendly physics mentor for high-school students (around 14 years old).\n"
        "Explain physics principles with intuition, clarity, warmth, and exact scientific precision without overwhelming jargon.\n"
        "Respond dynamically and specifically to the user's exact question, scenario, numbers, and thought experiment.\n"
        "Alongside the explanation, specify an interactive 2D simulation canvas with 2 to 4 interactive sliders that users can adjust in real time.\n"
        "CRITICAL RULES FOR visualType SELECTION:\n"
        "- 'buoyancy': for hot air balloons, floating/sinking objects, Archimedes principle, fluid density, displaced volume, boats, submarines\n"
        "- 'collision': for ball collisions, momentum conservation, bouncing balls, coefficient of restitution, elastic/inelastic impacts\n"
        "- 'spring': for Hooke's law, spring-mass oscillation, stiffness k, elastic energy\n"
        "- 'gravity': for planetary orbits, satellites, gravitational attraction, Kepler's laws, weightlessness\n"
        "- 'projectile': for ballistics, thrown objects, cannons, jumping, trajectory arcs\n"
        "- 'pendulum': for swinging bobs, simple harmonic motion, clocks\n"
        "- 'refraction': for light bending, lenses, prisms, Snell's law, fiber optics, index of refraction\n"
        "- 'circuit': for Ohm's law, voltage, current, resistors, batteries\n"
        "- 'wave': for sound waves, water ripples, light frequencies, sinusoidal oscillations, amplitude\n\n"
        "Only include 'takeaways' (1-3 bullet points) if the topic is complex or conceptually challenging; otherwise leave takeaways empty.\n"
        "Respond strictly with pure valid JSON matching this schema:\n"
        "{\n"
        '  "topic": "Concise topic title tailored to the question",\n'
        '  "concept": "Core concept phrase",\n'
        '  "explanation": "Engaging markdown text specifically answering their question with intuition, analogies, and step-by-step reasoning",\n'
        '  "formula": "Clean scientific formula string, e.g. F_b = V * (rho_air - rho_balloon) * g",\n'
        '  "visualType": "buoyancy" | "collision" | "spring" | "gravity" | "projectile" | "pendulum" | "refraction" | "circuit" | "wave",\n'
        '  "sliders": [\n'
        '    {"id": "uniqueKey", "label": "Label with symbol", "min": float, "max": float, "step": float, "default": float, "unit": "String"}\n'
        "  ],\n"
        '  "telemetryMetrics": [{"id": "key", "label": "Metric Name", "unit": "String"}],\n'
        '  "takeaways": ["Specific key insight 1", "Specific key insight 2"]\n'
        "}"
    )

    # Build multi-turn context if available (last 6 messages max)
    history_context = []
    if messages and isinstance(messages, list):
        for m in messages[-6:]:
            role = m.get("role", "user")
            content = m.get("content", "")
            if content and role in ("user", "assistant"):
                history_context.append({"role": role, "content": content})

    # 1. OpenRouter with Multi-Model Fallback (Fastest & Most Reliable)
    openrouter_key = _get_openrouter_key()
    if openrouter_key and openrouter_key != "your_openrouter_api_key_here":
        try:
            chat_msgs = [{"role": "system", "content": system_prompt}]
            chat_msgs.extend(history_context)
            if not history_context or history_context[-1].get("content") != prompt:
                chat_msgs.append({"role": "user", "content": prompt})

            # Multi-model priority array (max 3 items per OpenRouter specification)
            models_to_try = [
                "meta-llama/llama-3.3-70b-instruct",
                "deepseek/deepseek-chat",
                "mistralai/mistral-small-24b-instruct-2501"
            ]

            async with httpx.AsyncClient(timeout=18.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key}",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "VISIORA",
                    },
                    json={
                        "models": models_to_try,
                        "messages": chat_msgs,
                        "temperature": 0.4,
                        "response_format": {"type": "json_object"}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    cleaned = re.sub(r"^```(?:json)?", "", content, flags=re.MULTILINE)
                    cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE).strip()
                    parsed = json.loads(cleaned)
                    parsed["visualType"] = _infer_visual_type(prompt, parsed.get("visualType"))
                    return parsed
                else:
                    log.warn("ai_visual_tutor_openrouter_status", status=res.status_code, body=res.text[:200])
        except Exception as e:
            log.warn("ai_visual_tutor_openrouter_failed", error=str(e))

    # 2. If Groq selected or fallback
    groq_key = _get_groq_key()
    if groq_key:
        try:
            chat_msgs = [{"role": "system", "content": system_prompt}]
            chat_msgs.extend(history_context)
            if not history_context or history_context[-1].get("content") != prompt:
                chat_msgs.append({"role": "user", "content": prompt})

            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": chat_msgs,
                        "temperature": 0.4,
                        "response_format": {"type": "json_object"}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    cleaned = re.sub(r"^```(?:json)?", "", content, flags=re.MULTILINE)
                    cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE).strip()
                    parsed = json.loads(cleaned)
                    parsed["visualType"] = _infer_visual_type(prompt, parsed.get("visualType"))
                    return parsed
        except Exception as e:
            log.warn("ai_visual_tutor_groq_failed", error=str(e))

    # 3. Google Gemini
    gemini_key = _get_gemini_key(api_key)
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            prior_text = ""
            if history_context:
                prior_text = "Prior conversation context:\n" + "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in history_context]) + "\n\n"
            user_content = f"{prior_text}User Question: {prompt}\n\nDeliver the explanation and 2D interactive canvas spec."

            async with httpx.AsyncClient(timeout=14.0) as client:
                res = await client.post(
                    url,
                    json={
                        "contents": [
                            {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]}
                        ],
                        "generationConfig": {
                            "temperature": 0.4,
                            "responseMimeType": "application/json"
                        }
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = re.sub(r"^```(?:json)?", "", text, flags=re.MULTILINE)
                    cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE).strip()
                    parsed = json.loads(cleaned)
                    parsed["visualType"] = _infer_visual_type(prompt, parsed.get("visualType"))
                    return parsed
        except Exception as e:
            log.warn("ai_visual_tutor_gemini_failed", error=str(e))

    # 4. Tailored deterministic fallback
    return fallback.dict()


def openrouter_key_present() -> bool:
    return bool(_get_openrouter_key() and _get_openrouter_key() != "your_openrouter_api_key_here")
