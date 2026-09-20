# Visora Virtual Lab — Asset Registry

**Document:** AssetRegistry.md  
**Last Updated:** 2026-09-16

---

## External Assets

> [!NOTE]
> The current vertical slice uses **zero external assets**. All geometry is procedurally generated in C# code (LabRoomBuilder.cs). All materials are created from Unity's URP/Lit shader at runtime.

No external downloads have been made.

---

## Internal Assets (Generated)

| Asset | Type | Created By | License |
|-------|------|-----------|---------|
| Lab room geometry | Procedural (Unity primitives) | LabRoomBuilder.cs | N/A |
| Lab bench geometry | Procedural | LabRoomBuilder.cs | N/A |
| Ceiling lights | Procedural + Point Lights | LabRoomBuilder.cs | N/A |
| Meter needle (placeholder) | Unity Cylinder primitive | Scene setup | N/A |

---

## Planned Asset Acquisition (Future Phases)

When acquiring assets, they MUST pass all of the following checks:

### Asset Quality Checklist
- [ ] Visual quality appropriate for educational premium product
- [ ] Unity 6 compatible (check Unity version requirements)
- [ ] License verified (MIT, CC0, Unity Asset Store EULA, or explicit permission)
- [ ] Polygon count reasonable (< 50K tris for interactive equipment)
- [ ] PBR textures (albedo, normal, metallic, roughness)
- [ ] Correct real-world scale
- [ ] No suspicious files or dependencies
- [ ] No copyright/trademark violations

### Candidate Asset Categories (Not Yet Acquired)
| Category | Purpose | Potential Source |
|----------|---------|-----------------|
| Lab bench (detailed) | Experiment workstation | Unity Asset Store |
| Ammeter/voltmeter models | Analog meters | Unity Asset Store |
| Rheostat model | Variable resistor | Unity Asset Store |
| Battery/cell models | Power source | Unity Asset Store |
| Wire models | Circuit connections | Unity Asset Store |
| TextMeshPro fonts | UI typography | Unity Package (included) |
| Lab ambient audio | Background hum | Freesound.org (CC0) |
| Switch click SFX | Interaction feedback | Freesound.org (CC0) |

---

## Attribution Requirements

Currently: **None** (all procedural)

If external assets are added in future phases, they will be documented here with full attribution text.

---

## License Compatibility Table

| License Type | Commercial Use | Modification | Attribution Required | Compatible |
|-------------|----------------|--------------|---------------------|------------|
| CC0 | ✅ | ✅ | ❌ | ✅ Yes |
| MIT | ✅ | ✅ | ✅ (in code) | ✅ Yes |
| CC BY | ✅ | ✅ | ✅ (visible) | ✅ Yes |
| CC BY-NC | ❌ | ✅ | ✅ | ⚠️ Education only |
| Unity EULA | ✅ (via Unity) | Limited | ❌ | ✅ Yes |
| Proprietary | Limited | ❌ | Varies | 🔍 Case by case |
| Pirated | ❌ | ❌ | N/A | ❌ NEVER |
