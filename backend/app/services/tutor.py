"""
VISIORA — Tutor Explanation Service
Generates contextual physics explanations using current scene + variable state.
"""
import structlog
from .llm import llm, LLMUnavailableError

log = structlog.get_logger()

SCENE_CONTEXT = {
    "gravity": "This scene shows free fall. Explain that objects fall at the same rate no matter how heavy they are. Think of dropping a feather and a bowling ball in a vacuum—they hit the ground together.",
    "projectile": "This scene shows projectile motion. Explain it like throwing a ball. Going sideways and falling down happen separately, like two things happening at once but not affecting each other.",
    "pendulum": "This scene shows a swinging pendulum. Explain it like a swing at a playground. How fast it swings back and forth only depends on how long the chain is and gravity, not how heavy the person is.",
    "collision": "This scene shows collisions. Explain it like cars bumping into each other. Momentum is always passed around and saved (total before equals total after). Elastic means they bounce perfectly, inelastic means they smoosh together and lose some bounce energy.",
    "angular": "This scene shows angular momentum. Explain it like a spinning ice skater. When they pull their arms in, they spin much faster because their mass is closer to the center, but their total 'spinning energy' stays the same.",
}

REACTIVE_PROMPT = """You are VISIORA's friendly physics tutor, explaining things to a complete beginner or a curious kid. Answer the student's question concisely and clearly using simple, everyday language.

Scene: {scene}
Physics context: {context}
Current variables on screen: {variables}
Student event/question: {event}

Guidelines:
- Explain the concept with real-world, everyday examples (like throwing a ball, a swing, or an ice skater).
- Always tie your explanation directly to the actual current variable values shown on screen right now.
- Keep the conversation small and engaging (maximum 3-4 sentences total).
- End your response by asking a related Multiple Choice Question (MCQ) to test their understanding. Provide options A, B, and C.
- You can mention graphs or images if it helps the explanation (e.g., "Notice how the angle graph goes up and down...").
- CRITICAL: Simplify the language, never the physics. Do not make scientifically inaccurate statements just to sound simple.

Respond with the explanation and the MCQ directly (no JSON, no markdown outside of bolding text)."""

PROACTIVE_PROMPT = """You are VISIORA's friendly physics tutor for complete beginners. The student has been idle — proactively spark their curiosity in very simple language.

Scene: {scene}
Physics context: {context}
Current variables on screen: {variables}

Guidelines:
- Generate an intriguing question or observation about what they're currently seeing on screen.
- Use everyday comparisons and completely jargon-free language.
- CRITICAL: Simplify the language, never the physics.
- Maximum 2 sentences. Warm, curious, patient teacher tone. No preamble."""


async def get_reactive_explanation(scene: str, event: str, variables: dict) -> str:
    context = SCENE_CONTEXT.get(scene, "General physics simulation.")
    vars_str = ", ".join(f"{k}={v}" for k, v in (variables or {}).items())

    try:
        provider = llm()
        return await provider.generate(
            REACTIVE_PROMPT.format(
                scene=scene,
                context=context,
                variables=vars_str or "default values",
                event=event[:300],
            )
        )
    except LLMUnavailableError:
        return _fallback_explanation(scene, event)


async def get_proactive_message(scene: str, variables: dict) -> str:
    context = SCENE_CONTEXT.get(scene, "General physics simulation.")
    vars_str = ", ".join(f"{k}={v}" for k, v in (variables or {}).items())

    try:
        provider = llm()
        return await provider.generate(
            PROACTIVE_PROMPT.format(
                scene=scene,
                context=context,
                variables=vars_str or "default values",
            )
        )
    except LLMUnavailableError:
        return _proactive_fallback(scene)


def _fallback_explanation(scene: str, event: str) -> str:
    fallbacks = {
        "gravity":    "Both balls hit the ground at the same time — mass doesn't affect free fall! Galileo proved this by (supposedly) dropping objects from the Leaning Tower of Pisa.",
        "projectile": "Notice how changing the angle affects the range? 45° gives the maximum range for a flat surface. Try comparing 30° and 60° — they give the same range!",
        "pendulum":   "The period only depends on the pendulum's length and gravity — not the mass! This is why pendulum clocks work so reliably.",
        "collision":  "Momentum is always conserved — the total before equals the total after. But kinetic energy is only conserved in perfectly elastic collisions.",
        "angular":    "Watch the spin speed change as you adjust the arm radius — just like a figure skater pulling their arms in to spin faster!",
    }
    return fallbacks.get(scene, "Physics is fascinating — try adjusting a variable to see what changes!")


def _proactive_fallback(scene: str) -> str:
    proactives = {
        "gravity":    "Try changing the height slider — can you predict how much longer the fall will take?",
        "projectile": "What angle do you think gives the maximum range? Make a prediction before adjusting!",
        "pendulum":   "Does the mass of the bob affect the period? Try changing it and see what happens!",
        "collision":  "Set the elasticity to 0 for a perfectly inelastic collision — what do you notice about the balls after they collide?",
        "angular":    "Try pulling the arm radius all the way in. How much faster does the spinner go? Can you calculate it from the formula?",
    }
    return proactives.get(scene, "Try adjusting one of the variables and observe what changes in the formula panel!")
