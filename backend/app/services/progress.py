"""
VISIORA — Extended Progress Service
Streak, badge, session logging, full progress payload, and profile update.
"""
import structlog
from datetime import datetime, timezone, timedelta
from typing import Optional

log = structlog.get_logger()

# ── Badge constants ─────────────────────────────────────────────────────────
ALL_BADGE_IDS = [
    "first_session",
    "five_day_streak",
    "concept_mastered_gravity",
    "concept_mastered_projectile",
    "concept_mastered_pendulum",
    "concept_mastered_collision",
    "concept_mastered_angular",
    "all_rounder",
]

VALID_GRADES   = {"6", "7", "8", "9", "10", "11", "12"}
VALID_AVATARS  = {"🦊", "🐧", "🐬", "🦄", "🚀", "⭐", "🌙", "🔭", "🧲", "🌊"}

CONCEPT_IDS = ["gravity", "projectile", "pendulum", "collision", "angular"]


def get_db():
    from ..auth.firebase_auth import _get_firebase_app
    app = _get_firebase_app()
    if app:
        from firebase_admin import firestore
        return firestore.client()
    return None


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _utc_yesterday() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")


# ── Profile helpers ─────────────────────────────────────────────────────────

async def get_user_profile(uid: str) -> dict:
    db = get_db()
    if not db:
        return _default_profile(uid)
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        return _ensure_profile_defaults(doc.to_dict(), uid)
    profile = _default_profile(uid)
    db.collection("users").document(uid).set(profile)
    return profile


def _default_profile(uid: str) -> dict:
    return {
        "uid": uid,
        "name": "",
        "grade": "",
        "avatar": "🚀",
        "classCode": None,
        "streak": 0,
        "lastSessionDate": None,
        "badges": [],
        "mastery": {c: {"score": 0, "lastUpdated": None} for c in CONCEPT_IDS},
    }


def _ensure_profile_defaults(p: dict, uid: str) -> dict:
    defaults = _default_profile(uid)
    for k, v in defaults.items():
        p.setdefault(k, v)
    # Ensure mastery has all 5 concepts
    for c in CONCEPT_IDS:
        p["mastery"].setdefault(c, {"score": 0, "lastUpdated": None})
    return p


async def update_class_code(uid: str, class_code: str) -> dict:
    db = get_db()
    if not db:
        return await get_user_profile(uid)
    db.collection("users").document(uid).set({"classCode": class_code}, merge=True)
    return await get_user_profile(uid)


async def update_profile_fields(uid: str, name: str, grade: str, avatar: str) -> dict:
    """PUT /profile/me — update name, grade, avatar."""
    db = get_db()
    if not db:
        return await get_user_profile(uid)
    db.collection("users").document(uid).set(
        {"name": name, "grade": grade, "avatar": avatar}, merge=True
    )
    return await get_user_profile(uid)


# ── Session logging ─────────────────────────────────────────────────────────

async def record_session(
    uid: str,
    concept_id: str,
    duration_seconds: int,
    questions_asked: int,
    variables_changed: list,
) -> dict:
    """POST /sessions — log session, recompute streak and badges."""
    db = get_db()
    today = _utc_today()

    if not db:
        log.warning("record_session.no_db", uid=uid)
        return {"streak": 1, "newBadges": []}

    from firebase_admin import firestore

    # Clamp duration to a sane max (e.g. 90 minutes) to prevent mastery inflation
    duration_seconds = min(duration_seconds, 5400)

    # Write session doc
    session_data = {
        "conceptId": concept_id,
        "durationSeconds": duration_seconds,
        "questionsAsked": questions_asked,
        "variablesChanged": variables_changed,
        "date": today,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    db.collection("users").document(uid).collection("sessions").add(session_data)

    # Recompute streak
    profile = await get_user_profile(uid)
    last_date = profile.get("lastSessionDate")
    streak = profile.get("streak", 0)

    if last_date == today:
        pass  # already counted today
    elif last_date == _utc_yesterday():
        streak += 1
    else:
        streak = 1  # missed a day, reset

    update_payload = {"streak": streak, "lastSessionDate": today}

    # Badge check
    existing_badges = set(profile.get("badges", []))
    new_badges = []

    # first_session
    if "first_session" not in existing_badges:
        new_badges.append("first_session")

    # five_day_streak
    if streak >= 5 and "five_day_streak" not in existing_badges:
        new_badges.append("five_day_streak")

    if new_badges:
        all_badges = list(existing_badges | set(new_badges))
        update_payload["badges"] = all_badges

    db.collection("users").document(uid).set(update_payload, merge=True)

    return {"streak": streak, "newBadges": new_badges}


# ── Quiz recording ──────────────────────────────────────────────────────────

async def record_quiz_result(uid: str, scene: str, score: float, time_spent_mins: float) -> dict:
    db = get_db()
    if not db:
        log.warning("record_quiz_result.no_db", uid=uid)
        return {}

    from firebase_admin import firestore
    from .mastery import compute_mastery

    result = {
        "scene": scene,
        "score": score,
        "time_spent_mins": time_spent_mins,
        "timestamp": firestore.SERVER_TIMESTAMP,
    }
    db.collection("users").document(uid).collection("quiz_history").add(result)

    # Recalculate mastery from all quiz history for this scene
    docs = db.collection("users").document(uid).collection("quiz_history").where("scene", "==", scene).get()
    total_score, total_time, count = 0.0, 0.0, 0
    for doc in docs:
        data = doc.to_dict()
        total_score += data.get("score", 0)
        total_time += data.get("time_spent_mins", 0)
        count += 1

    avg_score = total_score / count if count > 0 else 0
    new_mastery = compute_mastery(avg_score, total_time)

    now_iso = datetime.now(timezone.utc).isoformat()
    db.collection("users").document(uid).set(
        {"mastery": {scene: {"score": new_mastery, "lastUpdated": now_iso}}}, merge=True
    )

    # Check concept-mastered and all_rounder badges
    profile = await get_user_profile(uid)
    existing_badges = set(profile.get("badges", []))
    new_badges = []

    badge_key = f"concept_mastered_{scene}"
    if new_mastery >= 80 and badge_key not in existing_badges:
        new_badges.append(badge_key)

    # Check all_rounder: re-fetch mastery after update
    mastery_map = profile.get("mastery", {})
    mastery_map[scene] = {"score": new_mastery}
    all_above_50 = all(
        mastery_map.get(c, {}).get("score", 0) >= 50 for c in CONCEPT_IDS
    )
    if all_above_50 and "all_rounder" not in existing_badges:
        new_badges.append("all_rounder")

    if new_badges:
        all_badges = list(existing_badges | set(new_badges))
        db.collection("users").document(uid).set({"badges": all_badges}, merge=True)

    return {
        "scene": scene,
        "mastery": new_mastery,
        "avg_score": avg_score,
        "total_time_mins": total_time,
        "newBadges": new_badges,
    }


# ── Full progress payload ───────────────────────────────────────────────────

async def get_full_progress(uid: str) -> dict:
    """GET /progress — return everything needed for Home and Progress screens in one call."""
    db = get_db()
    profile = await get_user_profile(uid)

    recent_sessions = []
    recent_quizzes = []

    if db:
        try:
            sess_docs = (
                db.collection("users").document(uid).collection("sessions")
                .order_by("createdAt", direction="DESCENDING")
                .limit(20)
                .get()
            )
            recent_sessions = [d.to_dict() for d in sess_docs]
        except Exception as e:
            log.warning("get_full_progress.sessions_error", error=str(e))

        try:
            quiz_docs = (
                db.collection("users").document(uid).collection("quiz_history")
                .order_by("timestamp", direction="DESCENDING")
                .limit(20)
                .get()
            )
            recent_quizzes = [d.to_dict() for d in quiz_docs]
        except Exception as e:
            log.warning("get_full_progress.quizzes_error", error=str(e))

    return {
        "profile": {
            "name":      profile.get("name", ""),
            "grade":     profile.get("grade", ""),
            "avatar":    profile.get("avatar", "🚀"),
            "classCode": profile.get("classCode"),
            "streak":    profile.get("streak", 0),
            "badges":    profile.get("badges", []),
        },
        "mastery":        profile.get("mastery", {c: {"score": 0} for c in CONCEPT_IDS}),
        "recentSessions": _serialize_timestamps(recent_sessions),
        "recentQuizzes":  _serialize_timestamps(recent_quizzes),
    }


def _serialize_timestamps(docs: list) -> list:
    """Convert Firestore timestamps to ISO strings for JSON serialisation."""
    result = []
    for d in docs:
        clean = {}
        for k, v in d.items():
            if hasattr(v, "isoformat"):
                clean[k] = v.isoformat()
            elif hasattr(v, "seconds"):   # Firestore Timestamp object
                clean[k] = datetime.fromtimestamp(v.seconds, tz=timezone.utc).isoformat()
            else:
                clean[k] = v
        result.append(clean)
    return result
