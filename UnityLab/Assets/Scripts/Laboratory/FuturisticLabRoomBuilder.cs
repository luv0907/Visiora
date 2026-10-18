using UnityEngine;

namespace Visora.Laboratory
{
    /// <summary>
    /// Constructs a futuristic, clean modern laboratory environment.
    /// 
    /// Design Language:
    /// - Clean white architectural surfaces (Corian countertops, matte white walls)
    /// - Full-height frosted glass partition walls with chrome frames
    /// - Embedded LED strip lighting (cyan accent) in floor channels, bench edges, ceiling perimeters
    /// - Floating holographic display panels (semi-transparent blue-glow quads)
    /// - Brushed aluminum structural members and chrome trim
    /// - Soft volumetric ceiling panel lighting (simulated)
    /// - Anti-slip rubber floor pads at experiment stations
    /// 
    /// Room layout is retained from the original (same dimensions, bench positions)
    /// so all apparatus placements remain valid.
    /// </summary>
    public class FuturisticLabRoomBuilder : MonoBehaviour
    {
        [Header("Room Dimensions")]
        [SerializeField] private float _roomWidth  = 8.4f;  // x: -4.2m to +4.2m
        [SerializeField] private float _roomDepth  = 6.4f;  // z: -0.6m to +5.8m
        [SerializeField] private float _roomHeight = 3.8f;  // y: 0.0m to +3.8m

        private Transform _labRoot;

        private void Start()
        {
            BuildLab();
        }

        public void BuildLab()
        {
            // Remove any existing lab room (classic or futuristic)
            DestroyExisting("LabRoom");
            DestroyExisting("FuturisticLabRoom");

            _labRoot = new GameObject("FuturisticLabRoom").transform;
            _labRoot.SetParent(transform);

            BuildRoomShell();
            BuildFloorSystem();
            BuildCeilingSystem();
            BuildGlassPartitions();
            BuildMainWorkstation();
            BuildSideStation();
            BuildHolographicDisplays();
            BuildLedAccentStrips();
            BuildStudioLighting();
            BuildLabSeatPod();

            Debug.Log($"[FuturisticLab] Clean modern laboratory constructed: {_roomWidth}×{_roomDepth}×{_roomHeight}m");
        }

        // ═══════════════════════════════════════════════════════════════════
        // 1. ROOM SHELL — Clean white panels with seamless overlapping joins
        // ═══════════════════════════════════════════════════════════════════

        private void BuildRoomShell()
        {
            var mat = FuturisticLabMaterials.WallWhite;
            float wallThick = 0.30f;
            float halfW = _roomWidth * 0.5f;
            float zMin = -0.6f;
            float zMax = 5.8f;
            float zCenter = (zMin + zMax) * 0.5f;
            float depth = zMax - zMin;
            float wallH = _roomHeight;
            float wallY = wallH * 0.5f;

            // Back wall
            var backWall = CreateBox("Wall_Back",
                new Vector3(0, wallY, zMax + wallThick * 0.5f),
                new Vector3(_roomWidth + wallThick * 2f, wallH, wallThick), mat);
            backWall.AddComponent<BoxCollider>();

            // Front wall
            var frontWall = CreateBox("Wall_Front",
                new Vector3(0, wallY, zMin - wallThick * 0.5f),
                new Vector3(_roomWidth + wallThick * 2f, wallH, wallThick), mat);
            frontWall.AddComponent<BoxCollider>();

            // Left wall — upper half is white panel, lower half has glass insets
            var leftWall = CreateBox("Wall_Left",
                new Vector3(-halfW - wallThick * 0.5f, wallY, zCenter),
                new Vector3(wallThick, wallH, depth + wallThick * 2f), mat);
            leftWall.AddComponent<BoxCollider>();

            // Right wall
            var rightWall = CreateBox("Wall_Right",
                new Vector3(halfW + wallThick * 0.5f, wallY, zCenter),
                new Vector3(wallThick, wallH, depth + wallThick * 2f), mat);
            rightWall.AddComponent<BoxCollider>();

            // Dark accent baseboard strip (bottom edge — 8cm high, all walls)
            var baseMat = FuturisticLabMaterials.AccentDark;
            float baseH = 0.08f;
            CreateBox("Base_Back", new Vector3(0, baseH * 0.5f, zMax - 0.02f), new Vector3(_roomWidth, baseH, 0.04f), baseMat);
            CreateBox("Base_Front", new Vector3(0, baseH * 0.5f, zMin + 0.02f), new Vector3(_roomWidth, baseH, 0.04f), baseMat);
            CreateBox("Base_Left", new Vector3(-halfW + 0.02f, baseH * 0.5f, zCenter), new Vector3(0.04f, baseH, depth), baseMat);
            CreateBox("Base_Right", new Vector3(halfW - 0.02f, baseH * 0.5f, zCenter), new Vector3(0.04f, baseH, depth), baseMat);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 2. FLOOR — Polished white with embedded LED grid channels
        // ═══════════════════════════════════════════════════════════════════

        private void BuildFloorSystem()
        {
            float halfW = _roomWidth * 0.5f;
            float zMin = -0.6f;
            float zMax = 5.8f;
            float zCenter = (zMin + zMax) * 0.5f;
            float depth = zMax - zMin;

            // Main floor slab
            var floor = CreateBox("FloorSlab",
                new Vector3(0, -0.05f, zCenter),
                new Vector3(_roomWidth + 0.6f, 0.10f, depth + 0.6f),
                FuturisticLabMaterials.FloorWhite);
            floor.AddComponent<BoxCollider>();

            // Anti-slip rubber pads at experiment station
            CreateBox("RubberPad_Main",
                new Vector3(0, 0.003f, 2.0f),
                new Vector3(2.60f, 0.006f, 1.10f),
                FuturisticLabMaterials.Rubber);

            // Embedded floor LED channels (4 parallel strips running Z-direction)
            var ledMat = FuturisticLabMaterials.LedCyan;
            float ledW = 0.025f;
            float ledH = 0.005f;
            float[] ledXPositions = { -2.0f, -0.8f, 0.8f, 2.0f };
            foreach (float lx in ledXPositions)
            {
                CreateBox($"FloorLED_{lx:F1}",
                    new Vector3(lx, 0.003f, zCenter),
                    new Vector3(ledW, ledH, depth - 0.5f), ledMat);
            }

            // Cross LED strip at entrance
            CreateBox("FloorLED_Cross",
                new Vector3(0, 0.003f, 0.0f),
                new Vector3(_roomWidth - 1.0f, ledH, ledW), ledMat);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3. CEILING — Recessed panel grid with integrated strip lighting
        // ═══════════════════════════════════════════════════════════════════

        private void BuildCeilingSystem()
        {
            float halfW = _roomWidth * 0.5f;
            float zMin = -0.6f;
            float zMax = 5.8f;
            float zCenter = (zMin + zMax) * 0.5f;
            float depth = zMax - zMin;
            float ceilY = _roomHeight;

            // Main ceiling slab
            CreateBox("CeilingSlab",
                new Vector3(0, ceilY + 0.05f, zCenter),
                new Vector3(_roomWidth + 0.6f, 0.10f, depth + 0.6f),
                FuturisticLabMaterials.CeilingPanel);

            // Recessed panel grid (3x4 grid of slightly inset panels)
            int panelsX = 3;
            int panelsZ = 4;
            float panelW = (_roomWidth - 0.8f) / panelsX;
            float panelD = (depth - 0.8f) / panelsZ;
            float panelY = ceilY - 0.01f;

            for (int px = 0; px < panelsX; px++)
            {
                for (int pz = 0; pz < panelsZ; pz++)
                {
                    float x = -halfW + 0.4f + panelW * 0.5f + px * panelW;
                    float z = zMin + 0.4f + panelD * 0.5f + pz * panelD;

                    // Panel border (chrome strip)
                    CreateBox($"CeilPanel_{px}_{pz}_Border",
                        new Vector3(x, panelY - 0.004f, z),
                        new Vector3(panelW - 0.04f, 0.008f, panelD - 0.04f),
                        FuturisticLabMaterials.MetalChrome);

                    // Inner diffuse light panel
                    CreateBox($"CeilPanel_{px}_{pz}_Light",
                        new Vector3(x, panelY - 0.002f, z),
                        new Vector3(panelW - 0.12f, 0.004f, panelD - 0.12f),
                        FuturisticLabMaterials.LedWhite);
                }
            }

            // Perimeter LED strip on ceiling edge
            var perimLed = FuturisticLabMaterials.LedCyan;
            float stripH = 0.015f;
            float stripD = 0.03f;
            CreateBox("CeilLED_Back", new Vector3(0, ceilY - stripH * 0.5f, zMax - stripD * 0.5f), new Vector3(_roomWidth - 0.5f, stripH, stripD), perimLed);
            CreateBox("CeilLED_Front", new Vector3(0, ceilY - stripH * 0.5f, zMin + stripD * 0.5f), new Vector3(_roomWidth - 0.5f, stripH, stripD), perimLed);
            CreateBox("CeilLED_Left", new Vector3(-halfW + stripD * 0.5f, ceilY - stripH * 0.5f, zCenter), new Vector3(stripD, stripH, depth - 0.5f), perimLed);
            CreateBox("CeilLED_Right", new Vector3(halfW - stripD * 0.5f, ceilY - stripH * 0.5f, zCenter), new Vector3(stripD, stripH, depth - 0.5f), perimLed);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 4. GLASS PARTITIONS — Floor-to-ceiling with chrome frames
        // ═══════════════════════════════════════════════════════════════════

        private void BuildGlassPartitions()
        {
            var glassRoot = new GameObject("GlassPartitions").transform;
            glassRoot.SetParent(_labRoot);

            float halfW = _roomWidth * 0.5f;

            // Left wall — two large frosted glass windows with chrome frames
            float[] windowZ = { 1.5f, 3.8f };
            foreach (float z in windowZ)
            {
                // Chrome frame
                float frameH = 2.4f;
                float frameW = 1.8f;
                float frameThick = 0.04f;

                // Top beam
                CreateBox("WinFrame_Top", glassRoot, new Vector3(-halfW + 0.03f, 0.6f + frameH, z), new Vector3(frameThick, 0.05f, frameW), FuturisticLabMaterials.MetalChrome);
                // Bottom beam
                CreateBox("WinFrame_Bot", glassRoot, new Vector3(-halfW + 0.03f, 0.6f, z), new Vector3(frameThick, 0.05f, frameW), FuturisticLabMaterials.MetalChrome);
                // Left vertical
                CreateBox("WinFrame_L", glassRoot, new Vector3(-halfW + 0.03f, 0.6f + frameH * 0.5f, z - frameW * 0.5f), new Vector3(frameThick, frameH, 0.05f), FuturisticLabMaterials.MetalChrome);
                // Right vertical
                CreateBox("WinFrame_R", glassRoot, new Vector3(-halfW + 0.03f, 0.6f + frameH * 0.5f, z + frameW * 0.5f), new Vector3(frameThick, frameH, 0.05f), FuturisticLabMaterials.MetalChrome);

                // Glass pane
                var pane = GameObject.CreatePrimitive(PrimitiveType.Quad);
                pane.name = "GlassPane";
                pane.transform.SetParent(glassRoot);
                pane.transform.localPosition = new Vector3(-halfW + 0.04f, 0.6f + frameH * 0.5f, z);
                pane.transform.localRotation = Quaternion.Euler(0, 90f, 0);
                pane.transform.localScale = new Vector3(frameW - 0.10f, frameH - 0.10f, 1f);
                SafeDestroy(pane.GetComponent<Collider>());
                pane.GetComponent<Renderer>().material = FuturisticLabMaterials.GlassFrosted;
            }

            // Room divider glass panel — separating experiment zone (at z = 1.2m, partial height)
            var divider = GameObject.CreatePrimitive(PrimitiveType.Quad);
            divider.name = "RoomDividerGlass";
            divider.transform.SetParent(glassRoot);
            divider.transform.localPosition = new Vector3(2.5f, 1.5f, 1.2f);
            divider.transform.localRotation = Quaternion.Euler(0, 0, 0);
            divider.transform.localScale = new Vector3(3.0f, 2.2f, 1f);
            SafeDestroy(divider.GetComponent<Collider>());
            divider.GetComponent<Renderer>().material = FuturisticLabMaterials.GlassClear;

            // Chrome support for divider
            CreateBox("DividerPost", glassRoot, new Vector3(2.5f, 1.3f, 1.2f), new Vector3(0.04f, 2.6f, 0.04f), FuturisticLabMaterials.MetalChrome);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 5. MAIN EXPERIMENT WORKSTATION — White Corian top, glass shelf,
        //    LED edge lighting, chrome legs
        // ═══════════════════════════════════════════════════════════════════

        private void BuildMainWorkstation()
        {
            // Same position as original so apparatus placement is compatible
            Vector3 pos = new Vector3(0f, 0f, 2.85f);
            var stationRoot = new GameObject("MainExperimentStation").transform;
            stationRoot.SetParent(_labRoot);
            stationRoot.position = pos;

            float w = 2.20f;
            float d = 0.95f;
            float h = 0.90f;
            float topThick = 0.035f;

            // 1. White Corian countertop with rounded edge profile
            var top = CreateBox("CorinaCountertop", stationRoot,
                new Vector3(0, h - topThick * 0.5f, 0),
                new Vector3(w, topThick, d),
                FuturisticLabMaterials.BenchWhite);
            top.AddComponent<BoxCollider>();

            // 2. LED edge strip (cyan glow) running under the front edge of the bench
            CreateBox("BenchLED_Front", stationRoot,
                new Vector3(0, h - topThick - 0.008f, -d * 0.5f + 0.02f),
                new Vector3(w - 0.10f, 0.012f, 0.018f),
                FuturisticLabMaterials.LedCyan);

            // LED edge strip on back edge
            CreateBox("BenchLED_Back", stationRoot,
                new Vector3(0, h - topThick - 0.008f, d * 0.5f - 0.02f),
                new Vector3(w - 0.10f, 0.012f, 0.018f),
                FuturisticLabMaterials.LedCyan);

            // 3. Chrome tubular legs (4 corners)
            float legR = 0.025f;
            float legH = h - topThick;
            float lx = w * 0.5f - 0.08f;
            float lz = d * 0.5f - 0.08f;

            BuildChromeLeg(stationRoot, new Vector3( lx, legH * 0.5f,  lz), legH, legR);
            BuildChromeLeg(stationRoot, new Vector3(-lx, legH * 0.5f,  lz), legH, legR);
            BuildChromeLeg(stationRoot, new Vector3( lx, legH * 0.5f, -lz), legH, legR);
            BuildChromeLeg(stationRoot, new Vector3(-lx, legH * 0.5f, -lz), legH, legR);

            // 4. Chrome cross-braces
            CreateBox("Brace_Back", stationRoot, new Vector3(0, 0.20f, lz), new Vector3(w - 0.16f, 0.025f, 0.025f), FuturisticLabMaterials.MetalChrome);
            CreateBox("Brace_Front", stationRoot, new Vector3(0, 0.20f, -lz), new Vector3(w - 0.16f, 0.025f, 0.025f), FuturisticLabMaterials.MetalChrome);

            // 5. Under-bench glass shelf (for equipment storage visibility)
            var shelf = CreateBox("GlassShelf", stationRoot,
                new Vector3(0, 0.35f, 0),
                new Vector3(w - 0.20f, 0.012f, d - 0.18f),
                FuturisticLabMaterials.BenchGlass);

            // 6. Integrated digital label panel (small dark accent strip on front)
            CreateBox("DigitalLabel", stationRoot,
                new Vector3(0, h - topThick - 0.025f, -d * 0.5f + 0.005f),
                new Vector3(0.40f, 0.03f, 0.006f),
                FuturisticLabMaterials.AccentDark);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 6. SIDE EQUIPMENT STATION — Matching style
        // ═══════════════════════════════════════════════════════════════════

        private void BuildSideStation()
        {
            var stationRoot = new GameObject("SideEquipmentStation").transform;
            stationRoot.SetParent(_labRoot);
            stationRoot.position = new Vector3(-_roomWidth * 0.5f + 0.65f, 0, 3.8f);

            float w = 0.95f;
            float d = 2.40f;
            float h = 0.90f;

            var top = CreateBox("Countertop", stationRoot,
                new Vector3(0, h - 0.02f, 0), new Vector3(w, 0.04f, d),
                FuturisticLabMaterials.BenchWhite);
            top.AddComponent<BoxCollider>();

            // LED edges
            CreateBox("SideLED_Front", stationRoot,
                new Vector3(0, h - 0.04f - 0.007f, -d * 0.5f + 0.02f),
                new Vector3(w - 0.08f, 0.010f, 0.015f),
                FuturisticLabMaterials.LedCyan);

            // Chrome legs
            float legH = h - 0.04f;
            BuildChromeLeg(stationRoot, new Vector3( w * 0.5f - 0.06f, legH * 0.5f,  d * 0.5f - 0.06f), legH, 0.02f);
            BuildChromeLeg(stationRoot, new Vector3(-w * 0.5f + 0.06f, legH * 0.5f,  d * 0.5f - 0.06f), legH, 0.02f);
            BuildChromeLeg(stationRoot, new Vector3( w * 0.5f - 0.06f, legH * 0.5f, -d * 0.5f + 0.06f), legH, 0.02f);
            BuildChromeLeg(stationRoot, new Vector3(-w * 0.5f + 0.06f, legH * 0.5f, -d * 0.5f + 0.06f), legH, 0.02f);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 7. HOLOGRAPHIC DISPLAY PANELS — Floating transparent info screens
        // ═══════════════════════════════════════════════════════════════════

        private void BuildHolographicDisplays()
        {
            var holoRoot = new GameObject("HolographicDisplays").transform;
            holoRoot.SetParent(_labRoot);

            // Main experiment display — on back wall behind the bench
            BuildHoloPanel(holoRoot, "MainDisplay",
                new Vector3(0, 2.2f, 5.70f),
                new Vector3(3.2f, 1.6f, 1f),
                Quaternion.identity,
                "Ohm's Law — V = IR");

            // Side info display — floating to the right
            BuildHoloPanel(holoRoot, "SideDisplay",
                new Vector3(2.8f, 2.0f, 4.5f),
                new Vector3(1.2f, 0.8f, 1f),
                Quaternion.Euler(0, -30f, 0),
                "Circuit Status");

            // Ceiling-mounted experiment selector display
            BuildHoloPanel(holoRoot, "CeilingDisplay",
                new Vector3(-1.5f, 3.2f, 2.5f),
                new Vector3(1.5f, 0.6f, 1f),
                Quaternion.Euler(25f, 15f, 0),
                "VISIORA LAB");
        }

        private void BuildHoloPanel(Transform parent, string name, Vector3 pos, Vector3 scale, Quaternion rot, string label)
        {
            var panelGo = new GameObject(name);
            panelGo.transform.SetParent(parent);
            panelGo.transform.position = pos;
            panelGo.transform.rotation = rot;

            // Semi-transparent holographic background
            var bg = GameObject.CreatePrimitive(PrimitiveType.Quad);
            bg.name = "HoloBG";
            bg.transform.SetParent(panelGo.transform);
            bg.transform.localPosition = Vector3.zero;
            bg.transform.localRotation = Quaternion.identity;
            bg.transform.localScale = scale;
            SafeDestroy(bg.GetComponent<Collider>());
            bg.GetComponent<Renderer>().material = FuturisticLabMaterials.HoloPanel;

            // Glowing border frame (4 thin strips)
            float fw = scale.x;
            float fh = scale.y;
            float thickness = 0.02f;
            var borderMat = FuturisticLabMaterials.LedCyan;

            CreateBox("HoloBorder_Top", panelGo.transform, new Vector3(0, fh * 0.5f, -0.001f), new Vector3(fw, thickness, 0.005f), borderMat);
            CreateBox("HoloBorder_Bot", panelGo.transform, new Vector3(0, -fh * 0.5f, -0.001f), new Vector3(fw, thickness, 0.005f), borderMat);
            CreateBox("HoloBorder_Left", panelGo.transform, new Vector3(-fw * 0.5f, 0, -0.001f), new Vector3(thickness, fh, 0.005f), borderMat);
            CreateBox("HoloBorder_Right", panelGo.transform, new Vector3(fw * 0.5f, 0, -0.001f), new Vector3(thickness, fh, 0.005f), borderMat);

            // Corner accent dots (bright glow at each corner)
            float dotR = 0.03f;
            var dotMat = FuturisticLabMaterials.LedWhite;
            CreateSphere("CornerDot_TL", panelGo.transform, new Vector3(-fw * 0.5f, fh * 0.5f, -0.002f), dotR, dotMat);
            CreateSphere("CornerDot_TR", panelGo.transform, new Vector3(fw * 0.5f, fh * 0.5f, -0.002f), dotR, dotMat);
            CreateSphere("CornerDot_BL", panelGo.transform, new Vector3(-fw * 0.5f, -fh * 0.5f, -0.002f), dotR, dotMat);
            CreateSphere("CornerDot_BR", panelGo.transform, new Vector3(fw * 0.5f, -fh * 0.5f, -0.002f), dotR, dotMat);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 8. LED ACCENT STRIPS — Wall-mounted, architectural edge lighting
        // ═══════════════════════════════════════════════════════════════════

        private void BuildLedAccentStrips()
        {
            var ledRoot = new GameObject("LEDAccentLighting").transform;
            ledRoot.SetParent(_labRoot);

            float halfW = _roomWidth * 0.5f;
            float zMin = -0.6f;
            float zMax = 5.8f;
            float zCenter = (zMin + zMax) * 0.5f;
            float depth = zMax - zMin;

            // Wall-mounted LED strip at dado height (y = 1.2m) — all 4 walls
            float stripY = 1.20f;
            float stripH = 0.018f;
            float stripD = 0.012f;
            var ledMat = FuturisticLabMaterials.LedCyan;

            CreateBox("WallLED_Back", ledRoot, new Vector3(0, stripY, zMax - stripD), new Vector3(_roomWidth - 0.5f, stripH, stripD), ledMat);
            CreateBox("WallLED_Front", ledRoot, new Vector3(0, stripY, zMin + stripD), new Vector3(_roomWidth - 0.5f, stripH, stripD), ledMat);
            CreateBox("WallLED_Left", ledRoot, new Vector3(-halfW + stripD, stripY, zCenter), new Vector3(stripD, stripH, depth - 0.5f), ledMat);
            CreateBox("WallLED_Right", ledRoot, new Vector3(halfW - stripD, stripY, zCenter), new Vector3(stripD, stripH, depth - 0.5f), ledMat);

            // Vertical accent LED strips on corners (clean lines)
            float[] cornerX = { -halfW + 0.04f, halfW - 0.04f };
            float[] cornerZ = { zMin + 0.04f, zMax - 0.04f };
            foreach (float cx in cornerX)
            {
                foreach (float cz in cornerZ)
                {
                    CreateBox($"CornerLED_{cx:F1}_{cz:F1}", ledRoot,
                        new Vector3(cx, _roomHeight * 0.5f, cz),
                        new Vector3(0.015f, _roomHeight - 0.4f, 0.015f),
                        FuturisticLabMaterials.LedCyan);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 9. STUDIO LIGHTING — Clean, bright, clinical illumination
        // ═══════════════════════════════════════════════════════════════════

        private void BuildStudioLighting()
        {
            var lightsRoot = new GameObject("FuturisticLighting").transform;
            lightsRoot.SetParent(_labRoot);

            // A. Primary Overhead Key Light — Wide, even illumination
            var keyGo = new GameObject("OverheadKeyLight");
            keyGo.transform.SetParent(lightsRoot);
            keyGo.transform.position = new Vector3(0f, 3.6f, 2.6f);
            keyGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            var keyLight = keyGo.AddComponent<Light>();
            keyLight.type = LightType.Spot;
            keyLight.color = new Color(0.98f, 0.99f, 1.0f); // Cool white 5500K
            keyLight.intensity = 5.0f;
            keyLight.range = 8.0f;
            keyLight.spotAngle = 120f;
            keyLight.innerSpotAngle = 80f;
            keyLight.shadows = LightShadows.Soft;

            // B. Workbench focused downlight
            var benchGo = new GameObject("BenchDownlight");
            benchGo.transform.SetParent(lightsRoot);
            benchGo.transform.position = new Vector3(0f, 3.4f, 2.85f);
            benchGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            var benchLight = benchGo.AddComponent<Light>();
            benchLight.type = LightType.Spot;
            benchLight.color = new Color(1.0f, 0.98f, 0.96f); // Slightly warm
            benchLight.intensity = 3.5f;
            benchLight.range = 4.0f;
            benchLight.spotAngle = 65f;
            benchLight.shadows = LightShadows.None;

            // C. Ambient fill — Soft directional
            var fillGo = new GameObject("AmbientFill");
            fillGo.transform.SetParent(lightsRoot);
            var fill = fillGo.AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.transform.rotation = Quaternion.Euler(55f, -20f, 0f);
            fill.color = new Color(0.95f, 0.97f, 1.0f);
            fill.intensity = 1.5f;
            fill.shadows = LightShadows.Soft;

            // D. Accent rim lights (back wall wash — blue tint for futuristic feel)
            for (int i = 0; i < 3; i++)
            {
                float x = -2.0f + i * 2.0f;
                var rimGo = new GameObject($"RimLight_{i}");
                rimGo.transform.SetParent(lightsRoot);
                rimGo.transform.position = new Vector3(x, 3.2f, 5.0f);
                rimGo.transform.rotation = Quaternion.Euler(35f, 0f, 0f);
                var rimLight = rimGo.AddComponent<Light>();
                rimLight.type = LightType.Spot;
                rimLight.color = new Color(0.75f, 0.88f, 1.0f); // Cool blue wash
                rimLight.intensity = 1.2f;
                rimLight.range = 4.5f;
                rimLight.spotAngle = 85f;
                rimLight.shadows = LightShadows.None;
            }

            // E. Under-bench LED ambient (subtle cyan glow bouncing off the floor)
            var underGo = new GameObject("UnderBenchGlow");
            underGo.transform.SetParent(lightsRoot);
            underGo.transform.position = new Vector3(0f, 0.15f, 2.85f);
            var underLight = underGo.AddComponent<Light>();
            underLight.type = LightType.Point;
            underLight.color = FuturisticLabMaterials.CyanGlow;
            underLight.intensity = 0.6f;
            underLight.range = 2.5f;
            underLight.shadows = LightShadows.None;
        }

        // ═══════════════════════════════════════════════════════════════════
        // 10. LAB SEAT POD — Modern molded seat with chrome base
        // ═══════════════════════════════════════════════════════════════════

        private void BuildLabSeatPod()
        {
            var seatRoot = new GameObject("LabSeatPod").transform;
            seatRoot.SetParent(_labRoot);
            seatRoot.position = new Vector3(-0.65f, 0f, 2.05f);

            // Circular seat pad (white)
            var seat = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            seat.name = "SeatDisc";
            seat.transform.SetParent(seatRoot);
            seat.transform.localPosition = new Vector3(0, 0.58f, 0);
            seat.transform.localScale = new Vector3(0.34f, 0.03f, 0.34f);
            SafeDestroy(seat.GetComponent<Collider>());
            seat.GetComponent<Renderer>().material = FuturisticLabMaterials.BenchWhite;

            // Central chrome post
            var post = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            post.name = "CenterPost";
            post.transform.SetParent(seatRoot);
            post.transform.localPosition = new Vector3(0, 0.28f, 0);
            post.transform.localScale = new Vector3(0.05f, 0.28f, 0.05f);
            SafeDestroy(post.GetComponent<Collider>());
            post.GetComponent<Renderer>().material = FuturisticLabMaterials.MetalChrome;

            // Chrome base star (5-leg star base)
            for (int i = 0; i < 5; i++)
            {
                float ang = i * 72f * Mathf.Deg2Rad;
                float lx = Mathf.Cos(ang) * 0.16f;
                float lz = Mathf.Sin(ang) * 0.16f;
                CreateBox($"BaseLeg_{i}", seatRoot, new Vector3(lx, 0.02f, lz), new Vector3(0.04f, 0.02f, 0.18f), FuturisticLabMaterials.MetalChrome);
            }

            // LED ring under seat edge
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "SeatLED";
            ring.transform.SetParent(seatRoot);
            ring.transform.localPosition = new Vector3(0, 0.56f, 0);
            ring.transform.localScale = new Vector3(0.36f, 0.005f, 0.36f);
            SafeDestroy(ring.GetComponent<Collider>());
            ring.GetComponent<Renderer>().material = FuturisticLabMaterials.LedCyan;
        }

        // ═══════════════════════════════════════════════════════════════════
        // UTILITY METHODS
        // ═══════════════════════════════════════════════════════════════════

        private void BuildChromeLeg(Transform parent, Vector3 localPos, float height, float radius)
        {
            var leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            leg.name = "ChromeLeg";
            leg.transform.SetParent(parent);
            leg.transform.localPosition = localPos;
            leg.transform.localScale = new Vector3(radius * 2f, height * 0.5f, radius * 2f);
            SafeDestroy(leg.GetComponent<Collider>());
            leg.GetComponent<Renderer>().material = FuturisticLabMaterials.MetalChrome;
        }

        private GameObject CreateBox(string name, Vector3 pos, Vector3 size, Material mat)
        {
            return CreateBox(name, _labRoot, pos, size, mat);
        }

        private GameObject CreateBox(string name, Transform parent, Vector3 localPos, Vector3 size, Material mat)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent);
            go.transform.localPosition = localPos;
            go.transform.localScale = size;
            SafeDestroy(go.GetComponent<Collider>());
            if (mat != null) go.GetComponent<Renderer>().material = mat;
            return go;
        }

        private GameObject CreateSphere(string name, Transform parent, Vector3 localPos, float radius, Material mat)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = name;
            go.transform.SetParent(parent);
            go.transform.localPosition = localPos;
            go.transform.localScale = Vector3.one * radius * 2f;
            SafeDestroy(go.GetComponent<Collider>());
            if (mat != null) go.GetComponent<Renderer>().material = mat;
            return go;
        }

        private void DestroyExisting(string name)
        {
            var existing = transform.Find(name);
            if (existing != null) SafeDestroy(existing.gameObject);
        }

        private static void SafeDestroy(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Destroy(obj);
            else DestroyImmediate(obj);
        }
    }
}
