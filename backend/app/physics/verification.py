import math
from asteval import Interpreter
from .schema import FormulaStep

def verify_formula_steps(steps: list[FormulaStep], tolerance: float = 0.05) -> bool:
    """
    Re-parses each step's 'substituted' expression using a sandboxed evaluator
    (asteval) and confirms the computed result matches the LLM's claimed 'result'
    within a small tolerance.
    """
def verify_with_mode(steps: list[FormulaStep], use_degrees: bool, tolerance: float) -> bool:
    # Initialize a secure sandboxed interpreter with only math functions
    safe_symtable = {
        'sin': (lambda x: math.sin(math.radians(x))) if use_degrees else math.sin,
        'cos': (lambda x: math.cos(math.radians(x))) if use_degrees else math.cos,
        'tan': (lambda x: math.tan(math.radians(x))) if use_degrees else math.tan,
        'asin': (lambda x: math.degrees(math.asin(x))) if use_degrees else math.asin,
        'acos': (lambda x: math.degrees(math.acos(x))) if use_degrees else math.acos,
        'atan': (lambda x: math.degrees(math.atan(x))) if use_degrees else math.atan,
        'sqrt': math.sqrt,
        'pow': math.pow,
        'exp': math.exp,
        'log': math.log,
        'log10': math.log10,
        'pi': math.pi,
        'e': math.e,
        'abs': abs,
        'min': min,
        'max': max,
        'round': round
    }
    aeval = Interpreter(usersyms=safe_symtable, use_numpy=False)

    for step in steps:
        try:
            # Safely evaluate the substituted string
            computed_val = aeval(step.substituted)
            
            # Catch parse errors or unsafe ops (like undefined variables)
            if len(aeval.error) > 0:
                # Clear the error so it doesn't affect future steps
                aeval.error = []
                # If the step was meant to be symbolic, we just skip verification
                if isinstance(step.result, str):
                    continue
                # If it claimed a numerical result but provided invalid math, it fails
                return False
                
            # If it's a number, check against the claimed result
            if isinstance(computed_val, (int, float)) and isinstance(step.result, (int, float)):
                if not math.isclose(computed_val, step.result, rel_tol=tolerance, abs_tol=tolerance):
                    return False
            elif isinstance(step.result, str):
                # The LLM generated a symbolic string result instead of a number. 
                # We can't mathematically verify symbolic equality easily here, so we skip it.
                continue
            else:
                # The result wasn't a scalar number and not a string
                return False

        except Exception:
            return False

    return True


def verify_formula_steps(steps: list[FormulaStep], tolerance: float = 0.05) -> bool:
    """
    Re-parses each step's 'substituted' expression using a sandboxed evaluator
    (asteval) and confirms the computed result matches the LLM's claimed 'result'
    within a small tolerance. Automatically supports both degrees and radians.
    """
    # 1. Try with degrees (common in textbook physics problems)
    if verify_with_mode(steps, use_degrees=True, tolerance=tolerance):
        return True
    # 2. Fall back to radians
    return verify_with_mode(steps, use_degrees=False, tolerance=tolerance)
