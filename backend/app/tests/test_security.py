"""Security checks: admin routes need a verified admin, uploads take only images, the tutor needs sign-in."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import firebase_auth
from app.config import settings

client = TestClient(app)

STUDENT = {"uid": "student_1", "email": "kid@gmail.com", "email_verified": True}
OWNER = {"uid": "owner_1", "email": "owner@gmail.com", "email_verified": True}
CLAIMED = {"uid": "claimed_1", "email": "x@y.com", "admin": True}
UNVERIFIED_OWNER = {"uid": "fake_1", "email": "owner@gmail.com", "email_verified": False}
TOKENS = {"student": STUDENT, "owner": OWNER, "claimed": CLAIMED, "unverified": UNVERIFIED_OWNER}


@pytest.fixture(autouse=True)
def fake_tokens(monkeypatch, tmp_path):
    """Stand in for Firebase: each test token maps to a decoded user. Keep the store in a temp file."""
    async def verify(token):
        if token in TOKENS:
            return TOKENS[token]
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
    monkeypatch.setattr(firebase_auth, "verify_firebase_token", verify)
    monkeypatch.setattr(settings, "ADMIN_EMAILS", ["Owner@gmail.com"])
    from app.routes import admin_router
    monkeypatch.setattr(admin_router, "STORE_PATH", str(tmp_path / "store.json"))
    monkeypatch.setattr(admin_router, "UPLOAD_DIR", str(tmp_path))


def auth(who):
    return {"Authorization": f"Bearer {who}"}


ADMIN_CALLS = [
    ("post", "/api/v1/admin/config", {"json": {"bannerImage": "/x.jpg"}}),
    ("post", "/api/v1/admin/experiments", {"json": {"title": "T", "type": "2d"}}),
    ("delete", "/api/v1/admin/experiments/anything", {}),
    ("post", "/api/v1/admin/experiments/anything/toggle", {}),
    ("get", "/api/v1/admin/users", {}),
    ("post", "/api/v1/admin/upload", {"files": {"file": ("a.png", b"\x89PNG\r\n\x1a\n0000", "image/png")}}),
    ("get", "/api/admin/users", {}),  # the old /api alias too
]


@pytest.mark.parametrize("method,path,kw", ADMIN_CALLS)
def test_admin_routes_reject_strangers_and_students(method, path, kw):
    assert getattr(client, method)(path, **kw).status_code == 401
    assert getattr(client, method)(path, headers=auth("student"), **kw).status_code == 403
    assert getattr(client, method)(path, headers=auth("unverified"), **kw).status_code == 403


def test_admin_by_verified_email_or_custom_claim():
    assert client.get("/api/v1/admin/users", headers=auth("owner")).status_code == 200
    assert client.get("/api/v1/admin/users", headers=auth("claimed")).status_code == 200


def test_an_email_containing_admin_is_not_enough():
    TOKENS["sneaky"] = {"uid": "s", "email": "admin.hacker@gmail.com", "email_verified": True}
    assert client.get("/api/v1/admin/users", headers=auth("sneaky")).status_code == 403


def test_public_config_never_lists_admin_emails():
    data = client.get("/api/v1/admin/config").json()
    assert "authorizedGoogleEmails" not in data
    assert set(data) <= {"bannerImage", "showcaseImage", "lastUpdated"}


def test_students_can_still_read_experiments():
    assert client.get("/api/v1/admin/experiments").status_code == 200


def test_login_tracking_uses_the_token_not_the_body():
    r = client.post("/api/v1/admin/users/track", json={"uid": "owner_1", "email": "owner@gmail.com"}, headers=auth("student"))
    assert r.status_code == 200
    users = client.get("/api/v1/admin/users", headers=auth("owner")).json()
    assert [(u["uid"], u["role"]) for u in users] == [("student_1", "Student")]
    assert client.post("/api/v1/admin/users/track", json={"uid": "x"}).status_code == 401


@pytest.mark.parametrize("name,body,ok", [
    ("pic.png", b"\x89PNG\r\n\x1a\n" + b"0" * 32, True),
    ("pic.jpg", b"\xff\xd8\xff\xe0" + b"0" * 32, True),
    ("pic.webp", b"RIFF0000WEBPVP8 " + b"0" * 16, True),
    ("evil.html", b"<html><script>alert(1)</script></html>", False),
    ("evil.png", b"<svg onload=alert(1)>", False),  # a script dressed up as a PNG
])
def test_upload_takes_only_real_images(name, body, ok):
    r = client.post("/api/v1/admin/upload", headers=auth("owner"), files={"file": (name, body, "image/png")})
    assert (r.status_code == 200) == ok
    if ok:
        stored = r.json()["filename"]
        assert name not in stored and "/" not in stored  # the browser's filename is never used


def test_upload_size_limit():
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (2 * 1024 * 1024)
    r = client.post("/api/v1/admin/upload", headers=auth("owner"), files={"file": ("big.png", big, "image/png")})
    assert r.status_code == 413


def test_visual_tutor_needs_sign_in_and_ignores_client_keys():
    assert client.post("/api/v1/ai/visual-tutor", json={"prompt": "hi"}).status_code == 401
    r = client.post("/api/v1/ai/visual-tutor", json={"prompt": "hi", "apiKey": "stolen", "model": "offline"}, headers=auth("student"))
    assert r.status_code == 200


def test_bad_content_length_is_a_400_not_a_crash():
    r = client.post("/api/v1/admin/users/track", content=b"{}", headers={"Content-Length": "abc", "Content-Type": "application/json"})
    assert r.status_code == 400


def test_rate_limit_uses_the_proxys_address_not_the_clients():
    from starlette.requests import Request
    from app.middleware.rate_limit import get_client_ip
    req = Request({"type": "http", "headers": [(b"x-forwarded-for", b"1.2.3.4, 9.9.9.9")], "client": ("10.0.0.1", 1)})
    assert get_client_ip(req) == "9.9.9.9"
