def compute_mastery(avg_quiz_score: float, time_on_task_minutes: float) -> float:
    """
    v1 mastery formula. Deliberately excludes tutor-question count as a
    negative signal — asking the AI tutor questions is the intended,
    encouraged behavior, not evidence of struggle. Do not add a penalty
    for tutor usage without real usage data supporting the correlation.

    # TODO (post-v1): A safer "struggle signal" would be: flag a concept
    # as needing review only if a student asks a tutor question about the
    # same sub-topic immediately after failing a quiz question on it —
    # a repeated-confusion signal, not a raw question count.
    """
    QUIZ_WEIGHT = 0.7
    TIME_WEIGHT = 0.3

    score = (
        QUIZ_WEIGHT * (avg_quiz_score * 100)
        + TIME_WEIGHT * min(time_on_task_minutes / 10, 100)
    )
    return max(0.0, min(100.0, score))
