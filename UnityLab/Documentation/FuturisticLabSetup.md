# Visiora Futuristic Lab — Setup Guide

**Document:** FuturisticLabSetup.md  
**Last Updated:** 2026-09-29

---

## Overview

The Futuristic Lab is a **clean modern white laboratory** environment with:
- Frosted glass partition walls with chrome frames
- Embedded LED strip lighting (cyan accent) in floors, bench edges, and ceilings
- Floating holographic display panels showing experiment info
- Brushed aluminum and chrome structural members
- Reactive lighting that responds to circuit experiment events
- Soft volumetric ceiling panel lighting

All apparatus placements remain **100% compatible** with the existing Ohm's Law experiment.

---

## Quick Start (One-Click Scene Setup)

### Method 1: FuturisticLabSceneSetup Component

1. Open Unity and create a **new empty scene** (or use existing `OhmsLawLab.unity`)
2. Create an empty GameObject → name it `"SceneManager"`
3. Add the component: **`Visora.Laboratory.FuturisticLabSceneSetup`**
4. Press **Play** ▶

The `FuturisticLabSceneSetup` will automatically:
- Build the futuristic lab room
- Spawn the first-person player controller
- Initialize the Ohm's Law experiment with apparatus
- Set up the HUD
- Attach LED pulse animators to all LED strips
- Configure holographic displays
- Wire up environment sync

### Method 2: Manual Setup

If you want more control:

1. **Remove the old LabRoomBuilder** component (if present)
2. Add **`FuturisticLabRoomBuilder`** to any root GameObject
3. The existing `OhmsLawController` + `InteractiveWiringManager` will work unchanged
4. Add **`LabEnvironmentSync`** to a new empty GameObject
5. Optionally add **`LEDPulseAnimator`** to individual LED objects for fine-tuned animation

---

## New Scripts

### `FuturisticLabMaterials.cs`
**Static material palette** — replaces `VisoraLabMaterials` for the new visual style.
- `FloorWhite`, `WallWhite`, `CeilingPanel` — Clean architectural surfaces
- `MetalChrome`, `MetalBrushed` — Premium metal accents
- `GlassClear`, `GlassFrosted` — Transparent panels
- `LedCyan`, `LedMagenta`, `LedWhite`, `LedAmber`, `LedGreen` — Emissive LED strips
- `HoloBlue`, `HoloPanel` — Holographic display materials
- `BenchWhite`, `BenchGlass` — Workstation surfaces

### `FuturisticLabRoomBuilder.cs`
**Room construction** — replaces `LabRoomBuilder.cs`.
- Same room dimensions (8.4m × 6.4m × 3.8m)
- Same bench positions (main bench at z=2.85, side at z=3.8)
- New visual elements: glass partitions, LED channels, ceiling panel grid, holographic mounts

### `LEDPulseAnimator.cs`
**LED animation** — attach to any Renderer with emissive materials.
- **Breathe** — Smooth sine-wave brightness oscillation
- **Heartbeat** — Quick double-pulse then pause
- **WaveTravel** — Sequential brightness sweep
- **ColorShift** — Gradual hue rotation between two colors
- **CircuitSync** — Responds to circuit state
- **Static** — Constant glow

### `HolographicDisplayController.cs`
**Holographic panels** — floating transparent info displays.
- **ExperimentInfo** — Shows V=IR formula and physics mode
- **CircuitStatus** — Real-time wiring completion status
- **LabBranding** — "VISIORA LAB" branding
- **LiveReadings** — Voltage, current, resistance readouts

### `LabEnvironmentSync.cs`
**Smart lab environment** — syncs all visual effects with experiment state.
- Wire connected → green flash
- Switch ON → cyan sweep + ambient boost
- Circuit complete → celebration green pulse
- Fuse blown → red alarm flash

### `FuturisticLabSceneSetup.cs`
**One-click orchestrator** — builds everything from scratch.

---

## Architecture

```
FuturisticLabSceneSetup (MonoBehaviour)
    ├── FuturisticLabRoomBuilder    ← builds the room geometry
    │   ├── Room Shell (walls, floor, ceiling)
    │   ├── Glass Partitions (chrome frames + frosted glass)
    │   ├── LED Accent Strips (floor channels, wall dados, ceiling perimeter)
    │   ├── Main Workstation (Corian top, chrome legs, LED edges)
    │   ├── Side Station (matching style)
    │   ├── Holographic Display Panels (floating transparent quads)
    │   ├── Lab Seat Pod (chrome base, LED ring)
    │   └── Studio Lighting (key, fill, rim, ambient)
    │
    ├── OhmsLawController          ← UNCHANGED from existing code
    │   └── OhmsLawApparatusBuilder (auto-builds apparatus as before)
    │
    ├── LEDPulseAnimator[]         ← attached to all LED strip objects
    │
    ├── HolographicDisplayController[] ← attached to holo panels
    │
    ├── LabEnvironmentSync         ← subscribes to experiment events
    │
    ├── LabHUD                     ← UNCHANGED HUD overlay
    │
    └── Player                     ← FirstPersonController + Camera
```

---

## Compatibility Notes

| Component | Status |
|-----------|--------|
| `OhmsLawController` | ✅ Unchanged — apparatus still auto-builds |
| `OhmsLawApparatusBuilder` | ✅ Unchanged — uses existing VisoraLabMaterials |
| `InteractiveWiringManager` | ✅ Unchanged — wiring system works as before |
| `LabHUD` | ✅ Unchanged — IMGUI overlay still renders |
| `FirstPersonController` | ✅ Unchanged — movement and interaction identical |
| `InteractionManager` | ✅ Unchanged — raycast interaction same |
| `LabRoomBuilder` (classic) | ⚠️ Still available but disabled when futuristic is active |

---

## Switching Between Lab Styles

In the `FuturisticLabSceneSetup` Inspector:
- **`Use Futuristic Lab` = true** → Clean modern white lab with LEDs
- **`Use Futuristic Lab` = false** → Classic classroom lab (original LabRoomBuilder)

---

## Performance

The futuristic lab adds approximately:
- **~50 additional draw calls** (LED strips, glass panels, holographic quads)
- **~8 additional lights** (ceiling panel grid emissives, accent rim lights)
- **~6 animated materials** (LED pulse animators)

Total estimated draw calls: **~200** (within WebGL budget of 250)

All transparent materials use proper URP alpha blending with Z-write disabled.

---

## Keyboard Controls (Unchanged)

| Key | Action |
|-----|--------|
| `WASD` | Move player |
| `Mouse` | Look around |
| `E` / `Left Click` | Interact / Connect wire |
| `Right Click` / `X` | Cancel / Disconnect wire |
| `K` | Toggle plug key switch |
| `Space` | Record observation reading |
| `R` | Reset experiment |
| `H` | Toggle help panel |
| `Tab` | Toggle observation table |
| `T` | Toggle Teacher Mode (auto-wire) |
| `M` | Toggle Physics Mode (Ideal/Realistic) |
| `Arrow Keys` | Adjust voltage |
| `Escape` | Toggle cursor lock |
