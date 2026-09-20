# VISORA Virtual Lab — Unity Project

> **A production-quality 3D interactive virtual science laboratory for Class 8–9 students.**  
> Built with Unity 6, Universal Render Pipeline (URP), deployed as WebGL inside the Visora website.

---

## Quick Start (3 Steps)

### 1. Open in Unity Hub
```
Unity Hub → Add → Browse → Select this folder (UnityLab/)
```
Unity will auto-download the required packages (URP, Input System, TextMeshPro). This takes 1–5 minutes on first open.

### 2. Run Setup Wizard
Once packages are loaded (no compile errors in Console):
```
Unity Menu → Visora → Setup Project (First Time)
```
This creates all materials, builds the experiment scene, configures URP, and adds the scene to Build Settings. **One click.**

### 3. Press Play
Open `Assets/Scenes/Experiments/OhmsLawLab.unity` → Press **▶ Play**

---

## Unity Version & Requirements

| Requirement | Version |
|-------------|---------|
| Unity Editor | **6000.6.0f1** (Unity 6 LTS) |
| Render Pipeline | **URP 17.0.3** |
| Input System | **1.14.0** |
| TextMeshPro | **4.0.0** |
| Target Platform | **WebGL** |
| Color Space | **Linear** |

---

## Experiment: Verification of Ohm's Law (V = I × R)

**Curriculum:** CBSE/ICSE Class 9 Physics — Current Electricity

### Student Experience
1. Walk up to the circuit bench using **WASD**
2. Look at the rheostat → press **E** → scroll to adjust voltage
3. Click the switch **[E]** to close the circuit
4. Read the ammeter and voltmeter
5. Press **"Record Reading"** in the panel
6. Take 5+ readings at different voltages
7. Watch the V-I graph draw in real time — it's a straight line through the origin
8. The slope gives **R = V/I**

### Controls
| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| E | Interact with equipment |
| Scroll | Adjust rheostat (while interacting) |
| Tab | Show/hide experiment panel |
| Shift | Sprint |

---

## Project Structure

```
Assets/
├── Editor/                     ← Unity Editor automation scripts
│   ├── ProjectSetupWizard.cs   ← One-click project setup
│   ├── LabMaterialFactory.cs   ← Creates all 12 PBR materials
│   └── WebGLBuilder.cs         ← Automated WebGL build
│
├── Scripts/
│   ├── Core/                   ← Singleton, ServiceLocator, GameManager, SceneLoader
│   ├── Player/                 ← FirstPersonController
│   ├── Interaction/            ← IInteractable, InteractableBase, InteractionManager
│   ├── Experiments/
│   │   ├── Framework/          ← ExperimentDefinition, IScientificModel, ExperimentController
│   │   └── OhmsLaw/            ← OhmsLawModel, OhmsLawController, Visualization, Equipment
│   ├── UI/                     ← ExperimentPanel, GraphRenderer
│   ├── Audio/                  ← AudioManager
│   ├── Laboratory/             ← LabRoomBuilder (procedural room)
│   ├── Physics/                ← ScientificConstants (NIST 2022)
│   └── Integration/            ← VisoraAPIClient (Unity ↔ FastAPI)
│
├── Tests/
│   └── EditMode/
│       └── OhmsLawModelTests.cs ← 8 scientific validation tests
│
├── Scenes/
│   └── Experiments/
│       └── OhmsLawLab.unity    ← Main experiment scene (created by wizard)
│
├── Art/
│   └── Materials/              ← 12 PBR materials (created by wizard)
│
└── Documentation/              ← Architecture, scientific models, dev log
```

---

## Scientific Accuracy

The Ohm's Law simulation uses **exact analytical math** — not numerical approximation:

```
I = V / R    (exact Ohm's Law)
P = V × I    (power)
R = V / I    (resistance verification)
```

### Automated Validation (8 tests)
Run via **Window → Test Runner → Edit Mode → Run All**:

| Test | Input | Expected | Tolerance |
|------|-------|----------|-----------|
| Core Ohm's Law #1 | V=5V, R=10Ω | I=0.5A | ±0.001A |
| Core Ohm's Law #2 | V=4V, R=20Ω | I=0.2A | ±0.001A |
| Linearity | 8 voltages, R=15Ω | V/I = constant | ±0.001Ω |
| Power: P=VI=V²/R=I²R | V=6V, R=12Ω | P=3W | ±0.001W |
| Zero voltage | V=0V, R=10Ω | I=0A | ±0.001A |
| Boundary clamping | V>MAX | clamped | — |
| Built-in validate() | 5 cases | all pass | ±0.001 |
| R from regression | 5 readings | error < 5% | — |

---

## Website Integration

The Unity WebGL build embeds into the Visora React app via:

```
https://your-domain.com/virtual-lab   ← new React route
    ↓ iframe
/virtual-lab/index.html               ← Unity WebGL build
```

**Auth is shared** — Firebase token is passed from React → Unity via `postMessage`.

### Required `.env` variable (Vercel):
```env
VITE_UNITY_LAB_URL=/virtual-lab/index.html
```

---

## Build for Production (WebGL)

### Method 1: Unity Menu (recommended)
```
Visora → Build WebGL (for Vercel)
```

### Method 2: CI/CD (headless)
```bash
/path/to/Unity -batchmode -quit \
  -projectPath ./UnityLab \
  -executeMethod Visora.Editor.WebGLBuilder.BuildWebGL \
  -logFile build.log
```

### Deploy to Vercel
```bash
# From project root
cp -r UnityLab/WebGLBuild frontend/public/virtual-lab
npm run build
vercel deploy
```

---

## Existing Visora Safety

> ⚠️ **The Unity lab is 100% isolated in this `/UnityLab/` directory.**
>
> Only 2 files in the existing codebase were touched:
> - `frontend/src/screens/VirtualLabScreen.jsx` — **new file** (zero modification to existing)
> - `frontend/src/router/index.jsx` — **+3 lines only** (additive)
>
> Safety branch: `pre-unity-backup` contains the exact state before any Unity work.

---

## Documentation

| Document | Contents |
|----------|---------|
| [Architecture.md](Documentation/Architecture.md) | Namespace tree, design decisions, scene structure |
| [ScientificModels.md](Documentation/ScientificModels.md) | V=IR equations, assumptions, validation table |
| [AssetRegistry.md](Documentation/AssetRegistry.md) | Asset inventory and license tracking |
| [DevelopmentLog.md](Documentation/DevelopmentLog.md) | Phase-by-phase build history |
| [ExistingVisoraAudit.md](Documentation/ExistingVisoraAudit.md) | Visora platform audit |

---

## Future Experiments (Framework Ready)

The architecture supports new experiments with minimal code:

1. Create `ExperimentDefinition.asset` (ScriptableObject)
2. Implement `IScientificModel` with the physics equations
3. Derive `ExperimentController` for the lifecycle
4. Add equipment as `InteractableBase` components
5. Write `EditMode` tests for the scientific model

**Candidates for next phases:**
- Simple Pendulum: `T = 2π√(L/g)` — Class 9
- Refraction through Glass Slab: Snell's Law — Class 10  
- Archimedes' Principle: `F_b = ρVg` — Class 9
- Hooke's Law: `F = kx` — Class 10
