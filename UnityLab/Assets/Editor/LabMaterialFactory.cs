using UnityEngine;
using UnityEditor;
using System.IO;

namespace Visora.Editor
{
    /// <summary>
    /// Creates all URP PBR materials with high-resolution textures for the virtual science lab.
    /// Supports both interactive editor and headless batchmode.
    /// </summary>
    public static class LabMaterialFactory
    {
        public const string MATERIAL_PATH = "Assets/Art/Materials/";
        public const string TEXTURE_PATH  = "Assets/Art/Textures/";
        public const string URP_LIT_SHADER = "Universal Render Pipeline/Lit";

        [MenuItem("Visora/Create Lab Materials", priority = 3)]
        public static void CreateAllMaterials()
        {
            EnsureFolder(MATERIAL_PATH);

            CreateLabFloor();
            CreateLabWall();
            CreateLabCeiling();
            CreateBenchTop();
            CreateMetalTrim();
            CreateGlassMaterial();
            CreateChalkboard();

            CreateVoltmeterDial();
            CreateAmmeterDial();
            CreatePowerSupplyPanel();
            CreateRheostatWire();

            CreateBrassMaterial();
            CreateCopperMaterial();
            CreateEboniteMaterial();
            CreateOakMaterial();
            CreateNeedleMaterial();

            CreateWireMaterial("Lab_WireRed", new Color(0.85f, 0.12f, 0.12f));
            CreateWireMaterial("Lab_WireBlack", new Color(0.12f, 0.13f, 0.15f));
            CreateWireMaterial("Lab_WireYellow", new Color(0.95f, 0.75f, 0.10f));

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[Visora Materials] ✓ All photorealistic lab materials created in Assets/Art/Materials/");
        }

        // ── Architectural Materials ───────────────────────────────────────────

        static void CreateLabFloor()
        {
            var mat = CreateMaterial("Lab_Floor");
            var tex = LoadTexture("lab_floor_tiles_2k.png");
            if (tex != null)
            {
                mat.SetTexture("_BaseMap", tex);
                mat.SetTextureScale("_BaseMap", new Vector2(8f, 10f));
            }
            mat.SetColor("_BaseColor", new Color(0.7f, 0.72f, 0.75f));
            mat.SetFloat("_Metallic", 0.05f);
            mat.SetFloat("_Smoothness", 0.65f); // Polished clean lab floor
            SaveMaterial(mat, "Lab_Floor");
        }

        static void CreateLabWall()
        {
            var mat = CreateMaterial("Lab_Wall");
            mat.SetColor("_BaseColor", new Color(0.86f, 0.88f, 0.90f));
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.25f);
            SaveMaterial(mat, "Lab_Wall");
        }

        static void CreateLabCeiling()
        {
            var mat = CreateMaterial("Lab_Ceiling");
            mat.SetColor("_BaseColor", new Color(0.92f, 0.93f, 0.94f));
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.15f);
            SaveMaterial(mat, "Lab_Ceiling");
        }

        static void CreateBenchTop()
        {
            var mat = CreateMaterial("Lab_BenchTop");
            var tex = LoadTexture("lab_bench_epoxy_2k.png");
            if (tex != null) mat.SetTexture("_BaseMap", tex);
            // Black epoxy resin benchtop (standard science lab)
            mat.SetColor("_BaseColor", new Color(0.05f, 0.06f, 0.07f));
            mat.SetFloat("_Metallic", 0.05f);
            mat.SetFloat("_Smoothness", 0.82f); // Highly polished epoxy gloss
            SaveMaterial(mat, "Lab_BenchTop");
        }

        static void CreateMetalTrim()
        {
            var mat = CreateMaterial("Lab_MetalTrim");
            // Brushed stainless steel bench legs and framing
            mat.SetColor("_BaseColor", new Color(0.75f, 0.77f, 0.80f));
            mat.SetFloat("_Metallic", 0.92f);
            mat.SetFloat("_Smoothness", 0.65f);
            SaveMaterial(mat, "Lab_MetalTrim");
        }

        static void CreateChalkboard()
        {
            var mat = CreateMaterial("Lab_Chalkboard");
            var tex = LoadTexture("chalkboard_ohms_law_2k.png");
            if (tex != null) mat.SetTexture("_BaseMap", tex);
            mat.SetColor("_BaseColor", Color.white);
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.20f); // Matte slate
            SaveMaterial(mat, "Lab_Chalkboard");
        }

        // ── Apparatus Dial & Panel Materials ─────────────────────────────────

        static void CreateVoltmeterDial()
        {
            var mat = CreateMaterial("Lab_VoltmeterDial");
            var tex = LoadTexture("voltmeter_dial_2k.png");
            if (tex != null) mat.SetTexture("_BaseMap", tex);
            mat.SetColor("_BaseColor", Color.white);
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.40f);
            SaveMaterial(mat, "Lab_VoltmeterDial");
        }

        static void CreateAmmeterDial()
        {
            var mat = CreateMaterial("Lab_AmmeterDial");
            var tex = LoadTexture("ammeter_dial_2k.png");
            if (tex != null) mat.SetTexture("_BaseMap", tex);
            mat.SetColor("_BaseColor", Color.white);
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.40f);
            SaveMaterial(mat, "Lab_AmmeterDial");
        }

        static void CreatePowerSupplyPanel()
        {
            var mat = CreateMaterial("Lab_PowerSupplyPanel");
            var tex = LoadTexture("power_supply_panel_2k.png");
            if (tex != null) mat.SetTexture("_BaseMap", tex);
            mat.SetColor("_BaseColor", Color.white);
            mat.SetFloat("_Metallic", 0.5f);
            mat.SetFloat("_Smoothness", 0.6f);
            SaveMaterial(mat, "Lab_PowerSupplyPanel");
        }

        static void CreateRheostatWire()
        {
            var mat = CreateMaterial("Lab_RheostatWire");
            var tex = LoadTexture("rheostat_wire_2k.png");
            if (tex != null)
            {
                mat.SetTexture("_BaseMap", tex);
                mat.SetTextureScale("_BaseMap", new Vector2(3f, 1f));
            }
            mat.SetColor("_BaseColor", new Color(0.7f, 0.65f, 0.6f));
            mat.SetFloat("_Metallic", 0.85f);
            mat.SetFloat("_Smoothness", 0.60f);
            SaveMaterial(mat, "Lab_RheostatWire");
        }

        // ── Component Materials ───────────────────────────────────────────────

        static void CreateBrassMaterial()
        {
            var mat = CreateMaterial("Lab_Brass");
            mat.SetColor("_BaseColor", new Color(0.92f, 0.76f, 0.35f));
            mat.SetFloat("_Metallic", 0.95f);
            mat.SetFloat("_Smoothness", 0.85f); // Polished brass
            SaveMaterial(mat, "Lab_Brass");
        }

        static void CreateCopperMaterial()
        {
            var mat = CreateMaterial("Lab_Copper");
            mat.SetColor("_BaseColor", new Color(0.85f, 0.48f, 0.32f));
            mat.SetFloat("_Metallic", 0.90f);
            mat.SetFloat("_Smoothness", 0.75f);
            SaveMaterial(mat, "Lab_Copper");
        }

        static void CreateEboniteMaterial()
        {
            var mat = CreateMaterial("Lab_Ebonite");
            // Heavy black insulating plastic/ebonite
            mat.SetColor("_BaseColor", new Color(0.08f, 0.08f, 0.09f));
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.45f);
            SaveMaterial(mat, "Lab_Ebonite");
        }

        static void CreateOakMaterial()
        {
            var mat = CreateMaterial("Lab_Oak");
            mat.SetColor("_BaseColor", new Color(0.68f, 0.48f, 0.30f));
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.35f);
            SaveMaterial(mat, "Lab_Oak");
        }

        static void CreateNeedleMaterial()
        {
            var mat = CreateMaterial("Lab_NeedleRed");
            mat.SetColor("_BaseColor", new Color(0.95f, 0.12f, 0.08f));
            mat.SetFloat("_Metallic", 0.1f);
            mat.SetFloat("_Smoothness", 0.60f);
            SaveMaterial(mat, "Lab_NeedleRed");
        }

        static void CreateWireMaterial(string name, Color color)
        {
            var mat = CreateMaterial(name);
            mat.SetColor("_BaseColor", color);
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.55f); // Flexible vinyl wire insulation
            SaveMaterial(mat, name);
        }

        static void CreateGlassMaterial()
        {
            var mat = CreateMaterial("Lab_Glass");
            // Set up transparent surface
            mat.SetFloat("_Surface", 1); // Transparent
            mat.SetFloat("_Blend", 0);   // Alpha blend
            mat.SetColor("_BaseColor", new Color(0.95f, 0.98f, 1f, 0.25f));
            mat.SetFloat("_Metallic", 0.0f);
            mat.SetFloat("_Smoothness", 0.95f);
            mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
            SaveMaterial(mat, "Lab_Glass");
        }

        // ── Helper Utilities ──────────────────────────────────────────────────

        public static Material LoadMaterial(string name)
        {
            string path = Path.Combine(MATERIAL_PATH, $"{name}.mat");
            return AssetDatabase.LoadAssetAtPath<Material>(path);
        }

        static Texture2D LoadTexture(string filename)
        {
            string path = Path.Combine(TEXTURE_PATH, filename);
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        static Material CreateMaterial(string name)
        {
            string path = Path.Combine(MATERIAL_PATH, $"{name}.mat");
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null) return existing;

            var shader = Shader.Find(URP_LIT_SHADER) ?? Shader.Find("Standard");
            return new Material(shader) { name = name };
        }

        static void SaveMaterial(Material mat, string name)
        {
            string path = Path.Combine(MATERIAL_PATH, $"{name}.mat");
            if (!File.Exists(Path.GetFullPath(path)))
            {
                AssetDatabase.CreateAsset(mat, path);
            }
            else
            {
                EditorUtility.SetDirty(mat);
            }
        }

        static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path.TrimEnd('/')))
            {
                string parent = Path.GetDirectoryName(path.TrimEnd('/'));
                string child  = Path.GetFileName(path.TrimEnd('/'));
                if (!string.IsNullOrEmpty(parent) && !string.IsNullOrEmpty(child))
                    AssetDatabase.CreateFolder(parent, child);
            }
        }
    }
}
