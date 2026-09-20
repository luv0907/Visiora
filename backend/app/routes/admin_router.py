"""
VISIORA — Admin Router
Handles 2D Visualizations CRUD, Dynamic Home Page Images, and User Login Intelligence.
"""
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "admin_store.json")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_default_experiments() -> list:
    return [
        {
            "id": "ohmslaw",
            "type": "3d",
            "title": "Ohm's Law Virtual Lab",
            "subtitle": "Interactive 3D laboratory bench with analog meters, rheostat & V-I graph",
            "category": "Electromagnetism",
            "formula": "V = I · R",
            "targetUrl": "/virtual-lab/index.html",
            "imageUrl": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
            "badge": "Unity 3D Lab",
            "icon": "ohmslaw",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": True,
            "order": 1,
            "clicks": 340,
            "authorTeam": "Visiora Virtual Labs Core",
            "gradeLevel": "Class 8-10",
            "createdAt": "2026-09-10T10:00:00Z"
        },
        {
            "id": "projectile",
            "type": "3d",
            "title": "Projectile Motion Simulator",
            "subtitle": "Parabolic trajectories, air drag, launch angles, and velocity vector components",
            "category": "Kinematics & Dynamics",
            "formula": "R = (v₀² sin 2θ)/g",
            "targetUrl": "/sim?lab=projectile",
            "imageUrl": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
            "badge": "3D Physics Engine",
            "icon": "projectile",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": True,
            "order": 2,
            "clicks": 285,
            "authorTeam": "Dynamics Lab Alpha",
            "gradeLevel": "Class 9-12",
            "createdAt": "2026-09-10T11:00:00Z"
        },
        {
            "id": "gravity",
            "type": "3d",
            "title": "Free Fall & Gravitational Orbits",
            "subtitle": "Mass-independent acceleration and Keplerian gravitational orbital mechanics",
            "category": "Gravitation & Astrophysics",
            "formula": "y(t) = h₀ - ½gt²",
            "targetUrl": "/sim?lab=gravity",
            "imageUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
            "badge": "Galileo Lab",
            "icon": "gravity",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 3,
            "clicks": 195,
            "authorTeam": "Astrophysics Group",
            "gradeLevel": "Class 9-12",
            "createdAt": "2026-09-10T11:30:00Z"
        },
        {
            "id": "pendulum",
            "type": "3d",
            "title": "Pendulum Mechanics & Chaos",
            "subtitle": "Harmonic oscillation, phase space trajectories, and double pendulum chaos",
            "category": "Harmonics & Waves",
            "formula": "T = 2π√(L/g)",
            "targetUrl": "/sim?lab=pendulum",
            "imageUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
            "badge": "Harmonics 3D",
            "icon": "pendulum",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 4,
            "clicks": 160,
            "authorTeam": "Oscillations Team",
            "gradeLevel": "Class 10-12",
            "createdAt": "2026-09-10T12:00:00Z"
        },
        {
            "id": "buoyancy",
            "type": "3d",
            "title": "Fluid Buoyancy & Density",
            "subtitle": "Fluid displacement, density thresholds, and Archimedes upward buoyant force",
            "category": "Fluid Mechanics",
            "formula": "F_b = ρ_f · V_sub · g",
            "targetUrl": "/sim?lab=buoyancy",
            "imageUrl": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80",
            "badge": "Archimedes Lab",
            "icon": "buoyancy",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 5,
            "clicks": 140,
            "authorTeam": "Fluid Dynamics Lab",
            "gradeLevel": "Class 9-11",
            "createdAt": "2026-09-10T12:30:00Z"
        },
        {
            "id": "collision",
            "type": "3d",
            "title": "Elastic & Inelastic Collisions",
            "subtitle": "Conservation of linear momentum and kinetic energy exchange across velocities",
            "category": "Mechanics & Momentum",
            "formula": "p = m₁v₁ + m₂v₂",
            "targetUrl": "/sim?lab=collision",
            "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
            "badge": "Conservation Law",
            "icon": "collision",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 6,
            "clicks": 115,
            "authorTeam": "Classical Mechanics Unit",
            "gradeLevel": "Class 11-12",
            "createdAt": "2026-09-10T13:00:00Z"
        },
        {
            "id": "vis-energy-forms",
            "type": "2d",
            "title": "Energy Forms & Thermal Physics",
            "subtitle": "Experiment with heat conduction, thermal equilibrium, floating energy packets, and power generation",
            "category": "Thermodynamics",
            "formula": "Q = mcΔT",
            "targetUrl": "https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html",
            "imageUrl": "/images/energy_forms_changes_banner.jpg",
            "badge": "Featured 2D Lab",
            "icon": "flame",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": True,
            "order": 7,
            "clicks": 215,
            "authorTeam": "PhET & Visiora Atelier",
            "gradeLevel": "Class 8-12",
            "createdAt": "2026-09-11T09:00:00Z"
        },
        {
            "id": "vis-phet-circuits",
            "type": "2d",
            "title": "Circuit Construction Kit: DC",
            "subtitle": "Interactive schematic builder for resistors, batteries, capacitors and voltage analysis",
            "category": "Electromagnetism",
            "formula": "V = I · R",
            "targetUrl": "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html",
            "imageUrl": "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80",
            "badge": "PhET Simulation",
            "icon": "zap",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 8,
            "clicks": 142,
            "authorTeam": "Circuits Studio",
            "gradeLevel": "Class 8-10",
            "createdAt": "2026-09-10T12:00:00Z"
        },
        {
            "id": "vis-wave-string",
            "type": "2d",
            "title": "Wave Interference & Standing Harmonics",
            "subtitle": "Explore frequency, amplitude, damping and boundary reflection in 2D mechanical strings",
            "category": "Wave Mechanics",
            "formula": "v = f · λ",
            "targetUrl": "https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_all.html",
            "imageUrl": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
            "badge": "Interactive 2D",
            "icon": "activity",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 9,
            "clicks": 98,
            "authorTeam": "Acoustics & Waves",
            "gradeLevel": "Class 9-12",
            "createdAt": "2026-09-10T14:30:00Z"
        },
        {
            "id": "vis-optics-ray",
            "type": "2d",
            "title": "Geometric Optics & Snell's Refraction",
            "subtitle": "Precision ray tracing through convex lenses, concave mirrors and refractive prisms",
            "category": "Optics & Light",
            "formula": "n₁ sin θ₁ = n₂ sin θ₂",
            "targetUrl": "https://phet.colorado.edu/sims/html/geometric-optics/latest/geometric-optics_all.html",
            "imageUrl": "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
            "badge": "Optics Lab",
            "icon": "eye",
            "embedMode": "embed",
            "isActive": True,
            "isFeatured": False,
            "order": 10,
            "clicks": 76,
            "authorTeam": "Photonics Team",
            "gradeLevel": "Class 10-12",
            "createdAt": "2026-09-11T08:15:00Z"
        }
    ]


def _load_store() -> dict:
    if not os.path.exists(STORE_PATH):
        store = {
            "config": {
                "bannerImage": "/images/physics_doodle_banner_16x9.jpg",
                "showcaseImage": "/images/physics_doodle_portrait.jpg",
                "authorizedGoogleEmails": ["admin@visiora.edu", "director@visiora.org", "bouroju@gmail.com"],
                "allowAnyGoogleLoginInDev": True
            },
            "experiments": _get_default_experiments(),
            "visualizations2D": [],
            "userLogins": []
        }
        return store
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            store = json.load(f)
            if "experiments" not in store or not store["experiments"]:
                store["experiments"] = _get_default_experiments()
                _save_store(store)
            return store
    except Exception:
        return {
            "config": {},
            "experiments": _get_default_experiments(),
            "visualizations2D": [],
            "userLogins": []
        }


def _save_store(data: dict):
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


class ConfigUpdateRequest(BaseModel):
    bannerImage: Optional[str] = None
    showcaseImage: Optional[str] = None
    authorizedGoogleEmails: Optional[List[str]] = None


class ExperimentCreate(BaseModel):
    type: str = Field("3d", description="'3d' or '2d'")
    title: str
    subtitle: Optional[str] = ""
    category: str = "Mechanics & Kinematics"
    formula: Optional[str] = ""
    targetUrl: str
    imageUrl: Optional[str] = ""
    badge: Optional[str] = "Interactive Lab"
    icon: Optional[str] = "atom"
    embedMode: Optional[str] = "embed"  # 'embed' or 'tab'
    isActive: bool = True
    isFeatured: bool = False
    order: Optional[int] = 0
    authorTeam: Optional[str] = "Visiora Team"
    gradeLevel: Optional[str] = "Class 8-12"


class ExperimentUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: Optional[str] = None
    formula: Optional[str] = None
    targetUrl: Optional[str] = None
    imageUrl: Optional[str] = None
    badge: Optional[str] = None
    icon: Optional[str] = None
    embedMode: Optional[str] = None
    isActive: Optional[bool] = None
    isFeatured: Optional[bool] = None
    order: Optional[int] = None
    authorTeam: Optional[str] = None
    gradeLevel: Optional[str] = None


class Visualization2DCreate(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    category: str = "Kinematics & Dynamics"
    targetUrl: str
    imageUrl: Optional[str] = ""
    badge: Optional[str] = "Interactive 2D"
    isActive: bool = True
    order: Optional[int] = 0


class Visualization2DUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: Optional[str] = None
    targetUrl: Optional[str] = None
    imageUrl: Optional[str] = None
    badge: Optional[str] = None
    isActive: Optional[bool] = None
    order: Optional[int] = None


class UserLoginTrack(BaseModel):
    uid: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    provider: Optional[str] = "google.com"
    photoURL: Optional[str] = None
    streak: Optional[int] = 1
    mastery: Optional[int] = 0


# ── Configuration & Home Images ──────────────────────────────────────
@router.get("/config")
def get_admin_config():
    store = _load_store()
    return store.get("config", {})


@router.post("/config")
def update_admin_config(payload: ConfigUpdateRequest):
    store = _load_store()
    cfg = store.setdefault("config", {})
    if payload.bannerImage is not None:
        cfg["bannerImage"] = payload.bannerImage.strip()
    if payload.showcaseImage is not None:
        cfg["showcaseImage"] = payload.showcaseImage.strip()
    if payload.authorizedGoogleEmails is not None:
        cfg["authorizedGoogleEmails"] = payload.authorizedGoogleEmails
    cfg["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    _save_store(store)
    return {"status": "success", "config": cfg}


# ── Unified 2D & 3D Experiments CRUD ─────────────────────────────────
@router.get("/experiments")
def list_experiments(exp_type: Optional[str] = None, active_only: bool = False):
    store = _load_store()
    items = store.get("experiments", [])
    if exp_type:
        items = [i for i in items if i.get("type", "3d").lower() == exp_type.lower()]
    if active_only:
        items = [i for i in items if i.get("isActive", True)]
    items.sort(key=lambda x: x.get("order", 0))
    return items


@router.post("/experiments")
def create_experiment(payload: ExperimentCreate):
    store = _load_store()
    items = store.setdefault("experiments", [])
    new_id = f"exp-{payload.type.lower()}-{uuid.uuid4().hex[:8]}"
    default_img = "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80"
    new_item = {
        "id": new_id,
        "type": payload.type.lower(),
        "title": payload.title.strip(),
        "subtitle": payload.subtitle.strip() if payload.subtitle else "",
        "category": payload.category.strip() if payload.category else "Physics",
        "formula": payload.formula.strip() if payload.formula else "",
        "targetUrl": payload.targetUrl.strip(),
        "imageUrl": payload.imageUrl.strip() if payload.imageUrl else default_img,
        "badge": payload.badge.strip() if payload.badge else ("3D Physics Lab" if payload.type == "3d" else "Interactive 2D"),
        "icon": payload.icon or ("atom" if payload.type == "3d" else "activity"),
        "embedMode": payload.embedMode or "embed",
        "isActive": payload.isActive,
        "isFeatured": payload.isFeatured,
        "order": payload.order or (len(items) + 1),
        "authorTeam": payload.authorTeam.strip() if payload.authorTeam else "Visiora Team",
        "gradeLevel": payload.gradeLevel.strip() if payload.gradeLevel else "Class 8-12",
        "clicks": 0,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    items.append(new_item)
    _save_store(store)
    return new_item


@router.put("/experiments/{exp_id}")
def update_experiment(exp_id: str, payload: ExperimentUpdate):
    store = _load_store()
    items = store.get("experiments", [])
    target = next((i for i in items if i["id"] == exp_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if payload.type is not None:
        target["type"] = payload.type.lower()
    if payload.title is not None:
        target["title"] = payload.title.strip()
    if payload.subtitle is not None:
        target["subtitle"] = payload.subtitle.strip()
    if payload.category is not None:
        target["category"] = payload.category.strip()
    if payload.formula is not None:
        target["formula"] = payload.formula.strip()
    if payload.targetUrl is not None:
        target["targetUrl"] = payload.targetUrl.strip()
    if payload.imageUrl is not None:
        target["imageUrl"] = payload.imageUrl.strip()
    if payload.badge is not None:
        target["badge"] = payload.badge.strip()
    if payload.icon is not None:
        target["icon"] = payload.icon.strip()
    if payload.embedMode is not None:
        target["embedMode"] = payload.embedMode.strip()
    if payload.isActive is not None:
        target["isActive"] = payload.isActive
    if payload.isFeatured is not None:
        target["isFeatured"] = payload.isFeatured
    if payload.order is not None:
        target["order"] = payload.order
    if payload.authorTeam is not None:
        target["authorTeam"] = payload.authorTeam.strip()
    if payload.gradeLevel is not None:
        target["gradeLevel"] = payload.gradeLevel.strip()

    target["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _save_store(store)
    return target


@router.delete("/experiments/{exp_id}")
def delete_experiment(exp_id: str):
    store = _load_store()
    items = store.get("experiments", [])
    filtered = [i for i in items if i["id"] != exp_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Experiment not found")
    store["experiments"] = filtered
    _save_store(store)
    return {"status": "success", "deleted_id": exp_id}


@router.post("/experiments/{exp_id}/toggle")
def toggle_experiment(exp_id: str):
    store = _load_store()
    items = store.get("experiments", [])
    target = next((i for i in items if i["id"] == exp_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Experiment not found")
    target["isActive"] = not target.get("isActive", True)
    target["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _save_store(store)
    return {"status": "success", "isActive": target["isActive"]}


@router.post("/experiments/{exp_id}/click")
def track_experiment_click(exp_id: str):
    store = _load_store()
    items = store.get("experiments", [])
    target = next((i for i in items if i["id"] == exp_id), None)
    if target:
        target["clicks"] = target.get("clicks", 0) + 1
        _save_store(store)
        return {"status": "success", "clicks": target["clicks"]}
    return {"status": "not_found"}


# ── Legacy 2D Visualizations Endpoints (Backward Compatibility) ──────
@router.get("/visualizations")
def list_visualizations(active_only: bool = False):
    store = _load_store()
    # Pull from unified experiments where type == '2d'
    items = [i for i in store.get("experiments", []) if i.get("type") == "2d"]
    if active_only:
        items = [i for i in items if i.get("isActive", True)]
    items.sort(key=lambda x: x.get("order", 0))
    return items


@router.post("/visualizations")
def create_visualization(payload: Visualization2DCreate):
    store = _load_store()
    items = store.setdefault("visualizations2D", [])
    new_id = f"vis-{uuid.uuid4().hex[:8]}"
    new_item = {
        "id": new_id,
        "title": payload.title.strip(),
        "subtitle": payload.subtitle.strip(),
        "category": payload.category.strip(),
        "targetUrl": payload.targetUrl.strip(),
        "imageUrl": payload.imageUrl.strip() if payload.imageUrl else "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
        "badge": payload.badge.strip() if payload.badge else "Interactive 2D",
        "isActive": payload.isActive,
        "order": payload.order or (len(items) + 1),
        "clicks": 0,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    items.append(new_item)
    _save_store(store)
    return new_item


@router.put("/visualizations/{vis_id}")
def update_visualization(vis_id: str, payload: Visualization2DUpdate):
    store = _load_store()
    items = store.get("visualizations2D", [])
    target = next((i for i in items if i["id"] == vis_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Visualization not found")

    if payload.title is not None:
        target["title"] = payload.title.strip()
    if payload.subtitle is not None:
        target["subtitle"] = payload.subtitle.strip()
    if payload.category is not None:
        target["category"] = payload.category.strip()
    if payload.targetUrl is not None:
        target["targetUrl"] = payload.targetUrl.strip()
    if payload.imageUrl is not None:
        target["imageUrl"] = payload.imageUrl.strip()
    if payload.badge is not None:
        target["badge"] = payload.badge.strip()
    if payload.isActive is not None:
        target["isActive"] = payload.isActive
    if payload.order is not None:
        target["order"] = payload.order

    target["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _save_store(store)
    return target


@router.delete("/visualizations/{vis_id}")
def delete_visualization(vis_id: str):
    store = _load_store()
    items = store.get("visualizations2D", [])
    filtered = [i for i in items if i["id"] != vis_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Visualization not found")
    store["visualizations2D"] = filtered
    _save_store(store)
    return {"status": "success", "deleted_id": vis_id}


@router.post("/visualizations/{vis_id}/click")
def track_visualization_click(vis_id: str):
    store = _load_store()
    items = store.get("visualizations2D", [])
    target = next((i for i in items if i["id"] == vis_id), None)
    if target:
        target["clicks"] = target.get("clicks", 0) + 1
        _save_store(store)
        return {"status": "success", "clicks": target["clicks"]}
    return {"status": "not_found"}


# ── User Logins Directory ────────────────────────────────────────────
@router.get("/users")
def get_user_logins():
    store = _load_store()
    users = store.get("userLogins", [])
    # Sort by lastLogin descending
    users.sort(key=lambda x: x.get("lastLogin", ""), reverse=True)
    return users


@router.post("/users/track")
def track_user_login(payload: UserLoginTrack):
    store = _load_store()
    users = store.setdefault("userLogins", [])
    now_iso = datetime.now(timezone.utc).isoformat()
    
    existing = next((u for u in users if u["uid"] == payload.uid or (payload.email and u.get("email") == payload.email)), None)
    if existing:
        existing["lastLogin"] = now_iso
        if payload.displayName:
            existing["displayName"] = payload.displayName
        if payload.photoURL:
            existing["photoURL"] = payload.photoURL
        if payload.provider:
            existing["provider"] = payload.provider
        if payload.streak is not None:
            existing["streak"] = max(existing.get("streak", 1), payload.streak)
        if payload.mastery is not None:
            existing["mastery"] = max(existing.get("mastery", 0), payload.mastery)
    else:
        # Determine role based on email whitelist
        auth_emails = store.get("config", {}).get("authorizedGoogleEmails", [])
        is_admin = bool(payload.email and (payload.email in auth_emails or "admin" in payload.email.lower()))
        new_user = {
            "uid": payload.uid,
            "email": payload.email or f"{payload.uid[:8]}@visiora.user",
            "displayName": payload.displayName or "Physicist Scholar",
            "provider": payload.provider or "google.com",
            "photoURL": payload.photoURL,
            "lastLogin": now_iso,
            "createdAt": now_iso,
            "role": "Admin" if is_admin else "Student",
            "streak": payload.streak or 1,
            "mastery": payload.mastery or 0
        }
        users.insert(0, new_user)

    _save_store(store)
    return {"status": "success"}


# ── File Upload Endpoint ─────────────────────────────────────────────
@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Return accessible relative URL
    return {"url": f"/api/v1/admin/uploads/{filename}", "filename": filename}
