# Knowledge graph data served from backend (can be updated without redeploy)
KNOWLEDGE_GRAPH = {
    "nodes": [
        {"id": "newtons_laws", "label": "Newton's Laws",         "scene": None,         "difficulty": 1},
        {"id": "gravity",      "label": "Free Fall",             "scene": "gravity",    "difficulty": 1},
        {"id": "projectile",   "label": "Projectile Motion",     "scene": "projectile", "difficulty": 2},
        {"id": "energy",       "label": "Energy Conservation",   "scene": None,         "difficulty": 2},
        {"id": "pendulum",     "label": "Simple Pendulum",       "scene": "pendulum",   "difficulty": 2},
        {"id": "momentum",     "label": "Linear Momentum",       "scene": None,         "difficulty": 2},
        {"id": "collision",    "label": "Collisions",            "scene": "collision",  "difficulty": 3},
        {"id": "rotation",     "label": "Rotational Motion",     "scene": None,         "difficulty": 3},
        {"id": "angular",      "label": "Angular Momentum",      "scene": "angular",    "difficulty": 3},
    ],
    "edges": [
        {"from": "newtons_laws", "to": "gravity",    "type": "prerequisite"},
        {"from": "gravity",      "to": "projectile", "type": "leads-to"},
        {"from": "newtons_laws", "to": "energy",     "type": "leads-to"},
        {"from": "energy",       "to": "pendulum",   "type": "prerequisite"},
        {"from": "gravity",      "to": "pendulum",   "type": "related"},
        {"from": "newtons_laws", "to": "momentum",   "type": "leads-to"},
        {"from": "momentum",     "to": "collision",  "type": "prerequisite"},
        {"from": "energy",       "to": "collision",  "type": "prerequisite"},
        {"from": "newtons_laws", "to": "rotation",   "type": "leads-to"},
        {"from": "rotation",     "to": "angular",    "type": "prerequisite"},
        {"from": "momentum",     "to": "angular",    "type": "related"},
    ],
}
