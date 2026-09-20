# Visora Virtual Lab — Architecture

**Document:** Architecture.md  
**Last Updated:** 2026-09-16

---

## Overview

The Visora Virtual Lab is a Unity 6 (URP) application that runs inside the existing Visora website via a WebGL iframe embed.

```
VISORA PLATFORM
├── Website (React + Vite)          ← existing, untouched
│   ├── /sim          (3D R3F sims)
│   ├── /sim-2d       (2D canvas)
│   └── /virtual-lab  (NEW Unity embed)  ← new route only
│
└── UnityLab/                       ← new, isolated subsystem
    ├── Assets/
    │   ├── Scripts/                ← all C# runtime code
    │   ├── Tests/                  ← NUnit scientific validation
    │   ├── Scenes/                 ← Unity scene files
    │   ├── Prefabs/                ← reusable lab components
    │   └── ScriptableObjects/      ← data-driven config
    └── Documentation/
```

---

## C# Namespace Structure

```
Visora.Core             — Singleton, ServiceLocator, GameManager, SceneLoader
Visora.Player           — FirstPersonController
Visora.Camera           — CameraController
Visora.Interaction      — IInteractable, InteractableBase, InteractionManager
Visora.Laboratory       — LabRoomBuilder, LabStation
Visora.Experiments.Framework — ExperimentDefinition, ExperimentController, IScientificModel
Visora.Experiments.OhmsLaw  — OhmsLawModel, OhmsLawController, OhmsLawVisualization
Visora.UI               — ExperimentPanel, GraphRenderer
Visora.Audio            — AudioManager
Visora.Physics          — ScientificConstants
Visora.SaveSystem       — SaveManager, PlayerProgress
Visora.Integration      — VisoraAPIClient
Visora.Tests.EditMode   — OhmsLawModelTests
```

---

## Key Architecture Decisions

### 1. Scientific Model Separation
The most important principle: **science is never Unity physics**.

```
Student Input
    ↓
ExperimentController
    ↓
IScientificModel.Compute() ← GROUND TRUTH (pure math)
    ↓
SimulationResult
    ↓
IExperimentVisualization    ← only renders the result
    ↓
UI / Meters / Graph
```

### 2. Data-Driven Experiments
New experiments are added by:
1. Creating an `ExperimentDefinition.asset` (ScriptableObject)
2. Implementing `IScientificModel` for the physics
3. Deriving `ExperimentController` for the lifecycle
4. No changes to core systems required

### 3. Rendering Pipeline: URP
- Best WebGL compatibility
- PBR materials (physically plausible)
- Supports post-processing (bloom, ambient occlusion)
- Lower GPU cost than HDRP — accessible on student devices
- Soft shadows from ceiling lights

### 4. Input: Unity New Input System
- Cross-platform (WebGL, desktop)
- Action-based (not legacy Input.GetKey)
- Player, Interaction, and UI actions separated

### 5. Service Locator Pattern
Systems communicate through `ServiceLocator` rather than direct references:
- Improves testability
- Avoids tight coupling
- Makes systems independently replaceable

---

## Scene Structure

```
Boot.unity           — Initialize GameManager, SceneLoader, AudioManager
MainMenu.unity       — Lab selection screen
LaboratoryHub.unity  — Explore between experiments
OhmsLawLab.unity     — Ohm's Law vertical slice (PHASE 1)
```

---

## WebGL Integration

```
Unity WebGL Build
    → /virtual-lab/index.html (hosted on Vercel)
        ↑ iframe ↑
React VirtualLabScreen.jsx
    → /virtual-lab route in AppRouter
```

Auth flow:
1. User authenticates on React app (Firebase)
2. React sends `postMessage({ type: 'VISORA_AUTH', uid, email })`
3. Unity JS plugin reads the message
4. VisoraAPIClient stores the token for API calls

---

## Performance Targets (WebGL)

| Metric | Target |
|--------|--------|
| FPS | ≥ 60 on mid-range device |
| Startup | < 30 seconds (WebGL) |
| Draw calls | < 150 per frame |
| Texture VRAM | < 256 MB |
| Build size | < 80 MB compressed |
