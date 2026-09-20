# Existing Visora Project Audit

**Date:** 2026-09-16
**Auditor:** Antigravity AI Agent
**Repository:** /Users/bouroju/Documents/mini-ai-video
**Git Branch:** main (2 commits)

---

## 1. Architecture Overview

Visora is a production AI-powered physics education platform with:
- **React 19 SPA frontend** (Vite 8, deployed on Vercel)
- **FastAPI Python backend** (deployed on Railway)
- **Firebase** for authentication and data storage
- **Google Gemini LLM** for AI tutoring, intent parsing, concept generation
- **Three.js / React Three Fiber** for existing 3D physics simulations

## 2. Frontend Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.7 | UI framework |
| Vite | 8.1.1 | Build system |
| Three.js | 0.185.0 | 3D rendering |
| @react-three/fiber | 9.6.1 | React Three.js bindings |
| @react-three/drei | 10.7.7 | Three.js helpers |
| @react-three/rapier | 2.2.0 | Physics engine |
| Zustand | 5.0.14 | State management |
| Firebase | 12.16.0 | Auth + DB |
| Framer Motion | 12.42.2 | Animations |
| GSAP | 3.15.0 | Advanced animations |
| Lenis | 1.3.26 | Smooth scrolling |
| Lucide React | 1.22.0 | Icons |
| MathJS | 15.2.0 | Math operations |
| Matter.js | 0.20.0 | 2D physics engine |

## 3. Backend Technology Stack

| Technology | Purpose |
|---|---|
| FastAPI | Web framework |
| Firebase Admin | Auth verification, Firestore |
| Google Generative AI | Gemini LLM integration |
| Structlog | Structured logging |
| Asteval | Sandboxed formula evaluation |
| HTTPX | Async HTTP client |
| PyYAML | Configuration |

## 4. Existing Experiments (5 × 3D)

### 4.1 Free Fall (Gravity)
- **File:** `frontend/src/simulations/GravitySim.jsx`
- **Physics:** y(t) = h₀ - ½gt², with optional air resistance
- **Variables:** height, mass1, mass2, gravity
- **3D:** Drop chamber with two balls, trail visualization

### 4.2 Projectile Motion
- **File:** `frontend/src/simulations/ProjectileSim.jsx`
- **Physics:** 2D kinematics with drag coefficient
- **Variables:** velocity, angle, height, gravity, mass, dragCoeff

### 4.3 Pendulum
- **File:** `frontend/src/simulations/PendulumSim.jsx`
- **Physics:** θ'' = -(g/L)sin(θ) - b·θ', Euler-Cromer integration
- **Variables:** length, mass, angle, gravity, damping
- **Modes:** Simple + double pendulum

### 4.4 Buoyancy
- **File:** `frontend/src/simulations/BuoyancySim.jsx`
- **Physics:** F_b = ρ_f · V_sub · g (Archimedes)
- **Variables:** objectDensity, fluidDensity, objectVolume, gravity, appliedForce

### 4.5 Collisions
- **File:** `frontend/src/simulations/CollisionSim.jsx`
- **Physics:** Momentum conservation, elastic/inelastic
- **Variables:** mass1, mass2, velocity1, velocity2, restitution

## 5. Additional Systems

### 5.1 2D Energy Workbench
- Heat transfer simulation using 2D Canvas
- Materials with different thermal properties
- Burner controls, temperature readings

### 5.2 AI Services
- **Intent Parser:** NLP → scene selection + parameter extraction
- **Tutor:** Reactive + proactive explanations
- **TTS:** Text-to-speech for explanations
- **Concept Generation:** LLM generates new 3D/2D concept definitions
- **Formula Verification:** Sandboxed asteval validator

### 5.3 Progress System
- Firebase-backed student profiles
- Mastery scoring
- Concept completion tracking

### 5.4 Knowledge Graph
- Concept relationships (prerequisites, related topics)
- Visual graph display

### 5.5 Quiz System
- Per-concept quizzes
- Multiple question types

### 5.6 Admin Panel
- Content management
- Visualization uploads
- Analytics

## 6. Deployment

- **Frontend:** Vercel (static build from `frontend/dist/`)
- **Backend:** Railway (FastAPI + uvicorn)
- **API:** `/api/v1/` prefix, CORS configured

## 7. Files That MUST NOT Be Modified

- All files in `frontend/` (except for Phase 12 integration)
- All files in `backend/`
- `vercel.json`
- `.gitignore` (append only if needed)
- `firestore.rules`

## 8. Integration Opportunities

- **API Client:** Can reuse backend API endpoints for progress tracking
- **Auth:** Firebase auth can be shared
- **Physics Config:** Variable limits in `config/physics.js` can inform Unity parameter ranges
- **Scientific Models:** Existing math models can be cross-referenced for validation

## 9. Recommended Integration Architecture

```
Existing Visora Website (React)
    ├── / (HomeScreen)
    ├── /sim (SimulatorScreen - existing 3D)
    ├── /sim-2d (Simulator2DScreen - existing 2D)
    ├── /virtual-lab (NEW - Unity WebGL embed)  ← only new route
    ├── /progress (ProgressScreen)
    └── /quiz/:id (QuizScreen)
```

The Unity WebGL build will be:
1. Built separately as WebGL
2. Hosted as static files
3. Embedded via iframe or react-unity-webgl in a new `VirtualLabScreen.jsx`
4. Communication: Unity ↔ JavaScript messaging for auth/progress

## 10. Potential Conflicts

- **None expected** — Unity project is fully isolated in `/UnityLab/`
- **Git:** `.gitignore` needs Unity-specific entries (added to UnityLab's own .gitignore)
- **Build size:** WebGL builds can be 30-100MB+ — consider lazy loading
