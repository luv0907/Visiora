using UnityEngine;

namespace Visora.Laboratory
{
    /// <summary>
    /// Constructs a masterclass architectural physics laboratory room environment.
    /// Features:
    /// - Overlapping, seamless walls, floor, and ceiling with zero light leaks or skybox seams.
    /// - Triple Border System: Dark oak crown ceiling molding, mid-wall dado rail, and floor baseboards.
    /// - Structural corner pilasters and framed classroom windows with soft daylight fill.
    /// - Flush wall-mounted presentation chalkboard with authentic wooden frame and chalk tray.
    /// - Studio lighting: Downward key spot, twin pendant lamps over workbench, and soft chalkboard wash.
    /// </summary>
    public class LabRoomBuilder : MonoBehaviour
    {
        [Header("Room Dimensions")]
        [SerializeField] private float _roomWidth  = 8.4f; // x: -4.2m to +4.2m
        [SerializeField] private float _roomDepth  = 6.4f; // z: -0.6m to +5.8m
        [SerializeField] private float _roomHeight = 3.8f; // y: 0.0m to +3.8m

        [Header("Materials")]
        [SerializeField] private Material _floorMaterial;
        [SerializeField] private Material _wallMaterial;
        [SerializeField] private Material _ceilingMaterial;
        [SerializeField] private Material _benchMaterial;
        [SerializeField] private Material _metalTrimMaterial;
        [SerializeField] private Material _chalkboardMaterial;
        [SerializeField] private Material _oakMaterial;

        private Transform _labRoot;

        private void Start()
        {
            BuildLab();
        }

        public void BuildLab()
        {
            var existing = transform.Find("LabRoom");
            if (existing != null) SafeDestroy(existing.gameObject);

            _labRoot = new GameObject("LabRoom").transform;
            _labRoot.SetParent(transform);

            LoadMaterialsIfNull();

            BuildSeamlessRoomShell();
            BuildArchitecturalBorders();
            BuildWallChalkboard();
            BuildMainWorkbench();
            BuildSideBenches();
            BuildClassroomWindows();
            BuildLabStool();
            BuildStudioLighting();

            Debug.Log($"[LabBuilder] AAA Architectural laboratory environment constructed: {_roomWidth}×{_roomDepth}×{_roomHeight}m");
        }

        private void LoadMaterialsIfNull()
        {
            if (_floorMaterial == null) _floorMaterial = VisoraLabMaterials.GetMaterial("Lab_Floor");
            if (_wallMaterial == null) _wallMaterial = VisoraLabMaterials.GetMaterial("Lab_Wall");
            if (_ceilingMaterial == null) _ceilingMaterial = VisoraLabMaterials.GetMaterial("Lab_Ceiling");
            if (_benchMaterial == null) _benchMaterial = VisoraLabMaterials.GetMaterial("Lab_BenchTop");
            if (_metalTrimMaterial == null) _metalTrimMaterial = VisoraLabMaterials.GetMaterial("Lab_MetalTrim");
            if (_chalkboardMaterial == null) _chalkboardMaterial = VisoraLabMaterials.GetMaterial("Lab_Chalkboard");
            if (_oakMaterial == null) _oakMaterial = VisoraLabMaterials.GetMaterial("Lab_Oak");
        }

        // ── 1. Seamless Overlapping Room Shell ────────────────────────────────

        private void BuildSeamlessRoomShell()
        {
            float wallThick = 0.35f; // Extra-thick overlapping walls prevent any light leak
            float halfW = _roomWidth * 0.5f;
            float zMin = -0.6f;
            float zMax = 5.8f;
            float zCenter = (zMin + zMax) * 0.5f;
            float depth = zMax - zMin;
            float wallH = _roomHeight;
            float wallY = wallH * 0.5f;

            // Floor: slightly oversized to interlock under all walls
            var floor = CreateBox("Floor",
                new Vector3(0f, -0.10f, zCenter),
                new Vector3(_roomWidth + wallThick * 2f, 0.20f, depth + wallThick * 2f),
                _floorMaterial);
            floor.AddComponent<BoxCollider>();

            // Ceiling: slightly oversized to interlock over all walls
            CreateBox("Ceiling",
                new Vector3(0f, wallH + 0.10f, zCenter),
                new Vector3(_roomWidth + wallThick * 2f, 0.20f, depth + wallThick * 2f),
                _ceilingMaterial);

            // Back wall (behind the experiment bench at z = zMax)
            var backWall = CreateBox("Wall_Back",
                new Vector3(0, wallY, zMax + wallThick * 0.5f),
                new Vector3(_roomWidth + wallThick * 2f, wallH, wallThick),
                _wallMaterial);
            backWall.AddComponent<BoxCollider>();

            // Front wall (behind the player at z = zMin)
            var frontWall = CreateBox("Wall_Front",
                new Vector3(0, wallY, zMin - wallThick * 0.5f),
                new Vector3(_roomWidth + wallThick * 2f, wallH, wallThick),
                _wallMaterial);
            frontWall.AddComponent<BoxCollider>();

            // Left wall
            var leftWall = CreateBox("Wall_Left",
                new Vector3(-halfW - wallThick * 0.5f, wallY, zCenter),
                new Vector3(wallThick, wallH, depth + wallThick * 2f),
                _wallMaterial);
            leftWall.AddComponent<BoxCollider>();

            // Right wall
            var rightWall = CreateBox("Wall_Right",
                new Vector3(halfW + wallThick * 0.5f, wallY, zCenter),
                new Vector3(wallThick, wallH, depth + wallThick * 2f),
                _wallMaterial);
            rightWall.AddComponent<BoxCollider>();
        }

        // ── 2. Triple Border Trim System & Architectural Pilasters ────────────

        private void BuildArchitecturalBorders()
        {
            float halfW = _roomWidth * 0.5f;
            float zMin = -0.6f;
            float zMax = 5.8f;
            float zCenter = (zMin + zMax) * 0.5f;
            float depth = zMax - zMin;
            float wallH = _roomHeight;

            var borderRoot = new GameObject("ArchitecturalBorders").transform;
            borderRoot.SetParent(_labRoot);

            // A. TOP BORDER: Continuous Crown Ceiling Molding (y = wallH - 0.08m)
            float crownY = wallH - 0.07f;
            float crownThick = 0.14f;
            float crownHeight = 0.14f;

            CreateBox("Crown_Back", borderRoot, new Vector3(0, crownY, zMax - crownThick * 0.5f), new Vector3(_roomWidth, crownHeight, crownThick), _oakMaterial);
            CreateBox("Crown_Front", borderRoot, new Vector3(0, crownY, zMin + crownThick * 0.5f), new Vector3(_roomWidth, crownHeight, crownThick), _oakMaterial);
            CreateBox("Crown_Left", borderRoot, new Vector3(-halfW + crownThick * 0.5f, crownY, zCenter), new Vector3(crownThick, crownHeight, depth), _oakMaterial);
            CreateBox("Crown_Right", borderRoot, new Vector3(halfW - crownThick * 0.5f, crownY, zCenter), new Vector3(crownThick, crownHeight, depth), _oakMaterial);

            // B. MID BORDER: Dado / Wainscot Chair Rail (y = 1.15m)
            float dadoY = 1.15f;
            float dadoThick = 0.05f;
            float dadoHeight = 0.08f;

            CreateBox("Dado_Back", borderRoot, new Vector3(0, dadoY, zMax - dadoThick * 0.5f), new Vector3(_roomWidth, dadoHeight, dadoThick), _oakMaterial);
            CreateBox("Dado_Front", borderRoot, new Vector3(0, dadoY, zMin + dadoThick * 0.5f), new Vector3(_roomWidth, dadoHeight, dadoThick), _oakMaterial);
            CreateBox("Dado_Left", borderRoot, new Vector3(-halfW + dadoThick * 0.5f, dadoY, zCenter), new Vector3(dadoThick, dadoHeight, depth), _oakMaterial);
            CreateBox("Dado_Right", borderRoot, new Vector3(halfW - dadoThick * 0.5f, dadoY, zCenter), new Vector3(dadoThick, dadoHeight, depth), _oakMaterial);

            // C. BOTTOM BORDER: Heavy Industrial Baseboards (y = 0.09m)
            float baseH = 0.18f;
            float baseThick = 0.04f;
            float baseY = baseH * 0.5f;

            CreateBox("Base_Back", borderRoot, new Vector3(0, baseY, zMax - baseThick * 0.5f), new Vector3(_roomWidth, baseH, baseThick), _oakMaterial);
            CreateBox("Base_Front", borderRoot, new Vector3(0, baseY, zMin + baseThick * 0.5f), new Vector3(_roomWidth, baseH, baseThick), _oakMaterial);
            CreateBox("Base_Left", borderRoot, new Vector3(-halfW + baseThick * 0.5f, baseY, zCenter), new Vector3(baseThick, baseH, depth), _oakMaterial);
            CreateBox("Base_Right", borderRoot, new Vector3(halfW - baseThick * 0.5f, baseY, zCenter), new Vector3(baseThick, baseH, depth), _oakMaterial);

            // D. Corner Support Pilasters / Columns (Locks all 4 corners with zero light cracks)
            float colW = 0.35f;
            float colY = wallH * 0.5f;

            CreateBox("Pilaster_CornerBL", borderRoot, new Vector3(-halfW + colW * 0.5f, colY, zMax - colW * 0.5f), new Vector3(colW, wallH, colW), _metalTrimMaterial);
            CreateBox("Pilaster_CornerBR", borderRoot, new Vector3( halfW - colW * 0.5f, colY, zMax - colW * 0.5f), new Vector3(colW, wallH, colW), _metalTrimMaterial);
            CreateBox("Pilaster_CornerFL", borderRoot, new Vector3(-halfW + colW * 0.5f, colY, zMin + colW * 0.5f), new Vector3(colW, wallH, colW), _metalTrimMaterial);
            CreateBox("Pilaster_CornerFR", borderRoot, new Vector3( halfW - colW * 0.5f, colY, zMin + colW * 0.5f), new Vector3(colW, wallH, colW), _metalTrimMaterial);
        }

        // ── 3. Flush Wall-Mounted Classroom Chalkboard ────────────────────────

        private void BuildWallChalkboard()
        {
            // Mount directly flush against the back wall at z = 5.75m (behind the bench)
            float boardZ = 5.72f;
            float boardY = 2.15f;

            var boardGo = new GameObject("ClassroomChalkboard");
            boardGo.transform.SetParent(_labRoot);
            boardGo.transform.position = new Vector3(0f, boardY, boardZ);

            // 1. Rich Beveled Dark Oak Outer Frame: 4.30m W x 2.15m H x 0.05m D
            CreateBox("BoardFrame", boardGo.transform, Vector3.zero, new Vector3(4.30f, 2.15f, 0.045f), _oakMaterial);

            // 2. High-Resolution 2K Heritage Slate Plate (facing student forward -Z)
            var plate = GameObject.CreatePrimitive(PrimitiveType.Quad);
            plate.name = "ChalkPlate";
            plate.transform.SetParent(boardGo.transform);
            plate.transform.localPosition = new Vector3(0, 0, -0.024f); // Sits in front of frame
            plate.transform.localRotation = Quaternion.identity;        // Normal faces student
            plate.transform.localScale = new Vector3(4.18f, 2.02f, 1f);
            SafeDestroy(plate.GetComponent<Collider>());

            var boardMat = VisoraLabMaterials.GetMaterial("Lab_Chalkboard");
            if (boardMat != null)
            {
                boardMat.SetColor("_BaseColor", Color.white);
                plate.GetComponent<Renderer>().material = boardMat;
            }

            // 3. Wooden Chalk & Eraser Tray with brass ends
            CreateBox("ChalkTray", boardGo.transform, new Vector3(0, -1.06f, -0.055f), new Vector3(4.25f, 0.04f, 0.11f), _oakMaterial);

            // Chalk sticks and felt eraser on tray
            var whiteChalk = CreateBox("Chalk_White", boardGo.transform, new Vector3(-0.35f, -1.03f, -0.055f), new Vector3(0.08f, 0.015f, 0.015f), null);
            whiteChalk.GetComponent<Renderer>().material.color = new Color(0.95f, 0.95f, 0.95f);

            var yellowChalk = CreateBox("Chalk_Yellow", boardGo.transform, new Vector3(-0.22f, -1.03f, -0.055f), new Vector3(0.08f, 0.015f, 0.015f), null);
            yellowChalk.GetComponent<Renderer>().material.color = new Color(0.95f, 0.85f, 0.20f);

            var eraser = CreateBox("FeltEraser", boardGo.transform, new Vector3(0.30f, -1.03f, -0.055f), new Vector3(0.14f, 0.028f, 0.06f), _oakMaterial);
        }

        // ── 4. Science Island Workbench ───────────────────────────────────────

        private void BuildMainWorkbench()
        {
            // Position: Center workbench where student stands at z ~ 1.85m
            Vector3 pos = new Vector3(0f, 0f, 2.85f);
            var benchRoot = new GameObject("MainExperimentBench");
            benchRoot.transform.SetParent(_labRoot);
            benchRoot.transform.position = pos;

            float w = 2.20f;
            float d = 0.95f;
            float h = 0.90f;
            float topThick = 0.045f;

            // 1. Black Polished Epoxy Resin Countertop
            var top = CreateBox("EpoxyCountertop", benchRoot.transform,
                new Vector3(0, h - topThick * 0.5f, 0),
                new Vector3(w, topThick, d),
                _benchMaterial);
            top.AddComponent<BoxCollider>();

            // 2. Heavy Steel Legs (4 Corners)
            float legR = 0.035f;
            float legH = h - topThick;
            float lx = w * 0.5f - 0.08f;
            float lz = d * 0.5f - 0.08f;

            BuildLeg(benchRoot.transform, new Vector3( lx, legH * 0.5f,  lz), legH, legR);
            BuildLeg(benchRoot.transform, new Vector3(-lx, legH * 0.5f,  lz), legH, legR);
            BuildLeg(benchRoot.transform, new Vector3( lx, legH * 0.5f, -lz), legH, legR);
            BuildLeg(benchRoot.transform, new Vector3(-lx, legH * 0.5f, -lz), legH, legR);

            // 3. Steel cross braces
            CreateBox("Brace_Back", benchRoot.transform, new Vector3(0, 0.15f, lz), new Vector3(w - 0.16f, 0.035f, 0.035f), _metalTrimMaterial);
            CreateBox("Brace_Left", benchRoot.transform, new Vector3(-lx, 0.15f, 0), new Vector3(0.035f, 0.035f, d - 0.16f), _metalTrimMaterial);
            CreateBox("Brace_Right", benchRoot.transform, new Vector3(lx, 0.15f, 0), new Vector3(0.035f, 0.035f, d - 0.16f), _metalTrimMaterial);

            // 4. Oak Storage Cabinet unit on the right side under bench
            float cabW = 0.65f;
            float cabH = legH - 0.06f;
            float cabD = d - 0.15f;
            CreateBox("UnderbenchCabinet", benchRoot.transform,
                new Vector3(w * 0.5f - cabW * 0.5f - 0.10f, cabH * 0.5f + 0.04f, 0),
                new Vector3(cabW, cabH, cabD),
                _oakMaterial);

            // Brass drawer pulls
            for (int r = 0; r < 3; r++)
            {
                float dy = 0.20f + r * 0.22f;
                CreateBox($"Handle_{r}", benchRoot.transform,
                    new Vector3(w * 0.5f - cabW * 0.5f - 0.10f, dy, -cabD * 0.5f - 0.015f),
                    new Vector3(0.14f, 0.018f, 0.025f),
                    _metalTrimMaterial);
            }
        }

        private void BuildSideBenches()
        {
            var sideBench = new GameObject("SideEquipmentBench");
            sideBench.transform.SetParent(_labRoot);
            sideBench.transform.position = new Vector3(-_roomWidth * 0.5f + 0.65f, 0, 3.8f);

            float w = 0.95f;
            float d = 2.40f;
            float h = 0.90f;

            var top = CreateBox("Countertop", sideBench.transform, new Vector3(0, h - 0.02f, 0), new Vector3(w, 0.04f, d), _benchMaterial);
            top.AddComponent<BoxCollider>();

            BuildLeg(sideBench.transform, new Vector3( w * 0.5f - 0.08f, (h - 0.04f) * 0.5f,  d * 0.5f - 0.08f), h - 0.04f, 0.03f);
            BuildLeg(sideBench.transform, new Vector3(-w * 0.5f + 0.08f, (h - 0.04f) * 0.5f,  d * 0.5f - 0.08f), h - 0.04f, 0.03f);
            BuildLeg(sideBench.transform, new Vector3( w * 0.5f - 0.08f, (h - 0.04f) * 0.5f, -d * 0.5f + 0.08f), h - 0.04f, 0.03f);
            BuildLeg(sideBench.transform, new Vector3(-w * 0.5f + 0.08f, (h - 0.04f) * 0.5f, -d * 0.5f + 0.08f), h - 0.04f, 0.03f);
        }

        private void BuildClassroomWindows()
        {
            // Two large double-hung windows on left wall with outdoor daylight
            float halfW = _roomWidth * 0.5f;
            float winY = 2.2f;
            float[] winZ = { 1.2f, 3.4f };

            var winRoot = new GameObject("ClassroomWindows").transform;
            winRoot.SetParent(_labRoot);

            foreach (float z in winZ)
            {
                // Outer oak frame
                CreateBox("WinFrame", winRoot, new Vector3(-halfW + 0.02f, winY, z), new Vector3(0.06f, 1.60f, 1.10f), _oakMaterial);

                // Frosted glass panes
                var pane = GameObject.CreatePrimitive(PrimitiveType.Quad);
                pane.name = "WinGlass";
                pane.transform.SetParent(winRoot);
                pane.transform.localPosition = new Vector3(-halfW + 0.04f, winY, z);
                pane.transform.localRotation = Quaternion.Euler(0, 90f, 0);
                pane.transform.localScale = new Vector3(1.0f, 1.50f, 1f);
                SafeDestroy(pane.GetComponent<Collider>());

                var glassMat = new Material(VisoraLabMaterials.LitShader);
                glassMat.SetColor("_BaseColor", new Color(0.85f, 0.92f, 1.0f));
                glassMat.SetFloat("_Smoothness", 0.95f);
                pane.GetComponent<Renderer>().material = glassMat;
            }
        }

        private void BuildLabStool()
        {
            var stool = new GameObject("LabStool");
            stool.transform.SetParent(_labRoot);
            stool.transform.position = new Vector3(-0.65f, 0f, 2.05f);

            var seat = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            seat.name = "Seat";
            seat.transform.SetParent(stool.transform);
            seat.transform.localPosition = new Vector3(0, 0.63f, 0);
            seat.transform.localScale = new Vector3(0.32f, 0.02f, 0.32f);
            SafeDestroy(seat.GetComponent<Collider>());
            if (_oakMaterial != null) seat.GetComponent<Renderer>().material = _oakMaterial;

            for (int i = 0; i < 4; i++)
            {
                float ang = i * 90f * Mathf.Deg2Rad;
                float lx = Mathf.Cos(ang) * 0.12f;
                float lz = Mathf.Sin(ang) * 0.12f;
                BuildLeg(stool.transform, new Vector3(lx, 0.31f, lz), 0.62f, 0.015f);
            }
        }

        private void BuildLeg(Transform parent, Vector3 localPos, float height, float radius)
        {
            var leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            leg.name = "Leg";
            leg.transform.SetParent(parent);
            leg.transform.localPosition = localPos;
            leg.transform.localScale = new Vector3(radius * 2f, height * 0.5f, radius * 2f);
            SafeDestroy(leg.GetComponent<Collider>());
            if (_metalTrimMaterial != null) leg.GetComponent<Renderer>().material = _metalTrimMaterial;
        }

        // ── 5. AAA Studio Lighting Architecture ───────────────────────────────

        private void BuildStudioLighting()
        {
            var lightsRoot = new GameObject("LabLighting").transform;
            lightsRoot.SetParent(_labRoot);

            // A. Focused Key Light: downward angled spotlight casting soft contact shadows on benchtop
            var keyLightGo = new GameObject("WorkbenchKeyLight");
            keyLightGo.transform.SetParent(lightsRoot);
            keyLightGo.transform.position = new Vector3(0f, 3.5f, 2.45f);
            keyLightGo.transform.rotation = Quaternion.Euler(68f, 0f, 0f);

            var keySpot = keyLightGo.AddComponent<Light>();
            keySpot.type = LightType.Spot;
            keySpot.color = new Color(1f, 0.98f, 0.94f);
            keySpot.intensity = 4.2f;
            keySpot.range = 6.0f;
            keySpot.spotAngle = 70f;
            keySpot.innerSpotAngle = 45f;
            keySpot.shadows = LightShadows.Soft;

            // B. Twin Pendant Lamps suspended directly over workbench (3200K warm brass highlights)
            float[] pendantX = { -0.55f, 0.55f };
            for (int i = 0; i < 2; i++)
            {
                var pendantGo = new GameObject($"PendantLamp_{i}");
                pendantGo.transform.SetParent(lightsRoot);
                pendantGo.transform.position = new Vector3(pendantX[i], 2.40f, 2.85f);

                // Lamp shade
                var shade = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                shade.name = "Shade";
                shade.transform.SetParent(pendantGo.transform);
                shade.transform.localPosition = Vector3.zero;
                shade.transform.localScale = new Vector3(0.18f, 0.05f, 0.18f);
                SafeDestroy(shade.GetComponent<Collider>());
                if (_metalTrimMaterial != null) shade.GetComponent<Renderer>().material = _metalTrimMaterial;

                // Cord
                var cord = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                cord.name = "Cord";
                cord.transform.SetParent(pendantGo.transform);
                cord.transform.localPosition = new Vector3(0, 0.65f, 0);
                cord.transform.localScale = new Vector3(0.008f, 0.65f, 0.008f);
                SafeDestroy(cord.GetComponent<Collider>());
                if (_metalTrimMaterial != null) cord.GetComponent<Renderer>().material = _metalTrimMaterial;

                var pLight = pendantGo.AddComponent<Light>();
                pLight.type = LightType.Point;
                pLight.color = new Color(1f, 0.92f, 0.82f); // Warm 3200K
                pLight.intensity = 1.8f;
                pLight.range = 3.5f;
                pLight.shadows = LightShadows.None;
            }

            // C. Dual Chalkboard Track Lights: soft wall-washers without blinding hotspot
            float[] boardLightX = { -1.2f, 1.2f };
            for (int i = 0; i < 2; i++)
            {
                var bLightGo = new GameObject($"ChalkboardTrackLight_{i}");
                bLightGo.transform.SetParent(lightsRoot);
                bLightGo.transform.position = new Vector3(boardLightX[i], 3.4f, 4.6f);
                bLightGo.transform.rotation = Quaternion.Euler(42f, (i == 0 ? 10f : -10f), 0f);

                var bSpot = bLightGo.AddComponent<Light>();
                bSpot.type = LightType.Spot;
                bSpot.color = new Color(0.96f, 0.98f, 1.0f);
                bSpot.intensity = 1.1f;
                bSpot.range = 4.5f;
                bSpot.spotAngle = 75f;
                bSpot.shadows = LightShadows.None;
            }

            // D. Ambient Fill Light: Clean, professional, balanced directional laboratory lux
            var fillGo = new GameObject("AmbientFill");
            fillGo.transform.SetParent(lightsRoot);
            var fill = fillGo.AddComponent<Light>();
            fill.type = LightType.Directional;
            fill.transform.rotation = Quaternion.Euler(52f, -25f, 0f);
            fill.color = new Color(0.96f, 0.98f, 1.0f);
            fill.intensity = 1.18f;
            fill.shadows = LightShadows.Soft;
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

        private static void SafeDestroy(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Destroy(obj);
            else DestroyImmediate(obj);
        }
    }
}
