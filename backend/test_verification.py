from app.physics.schema import FormulaStep
from app.physics.verification import verify_formula_steps

steps = [
    FormulaStep(
        description="test",
        equation="A * B",
        substituted="A * B",
        result="A * (2 * cos(2 * w * t) * sin(2 * k * x + \phi))"
    )
]

print("Verification Result:", verify_formula_steps(steps))
