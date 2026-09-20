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


def _load_store() -> dict:
    if not os.path.exists(STORE_PATH):
        return {
            "config": {
                "bannerImage": "/images/physics_doodle_banner_16x9.jpg",
                "showcaseImage": "/images/physics_doodle_portrait.jpg",
                "authorizedGoogleEmails": ["admin@visiora.edu", "director@visiora.org", "bouroju@gmail.com"],
                "allowAnyGoogleLoginInDev": True
            },
            "visualizations2D": [],
            "userLogins": []
        }
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"config": {}, "visualizations2D": [], "userLogins": []}


def _save_store(data: dict):
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Pydantic Models ──────────────────────────────────────────────────
class ConfigUpdateRequest(BaseModel):
    bannerImage: Optional[str] = None
    showcaseImage: Optional[str] = None
    authorizedGoogleEmails: Optional[List[str]] = None


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


# ── 2D Visualizations CRUD ───────────────────────────────────────────
@router.get("/visualizations")
def list_visualizations(active_only: bool = False):
    store = _load_store()
    items = store.get("visualizations2D", [])
    if active_only:
        items = [i for i in items if i.get("isActive", True)]
    # Sort by order ascending
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
