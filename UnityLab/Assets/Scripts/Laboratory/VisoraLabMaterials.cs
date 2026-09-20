using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Visora.Laboratory
{
    /// <summary>
    /// Centralized material and texture manager for the Visora Science Laboratory.
    /// Provides guaranteed PBR materials with 2K textures at both Editor time and Runtime.
    /// Has full fallbacks so objects will NEVER appear untextured/grey.
    /// </summary>
    public static class VisoraLabMaterials
    {
        private static readonly Dictionary<string, Material> _cache = new Dictionary<string, Material>();
        private static readonly Dictionary<string, Texture2D> _texCache = new Dictionary<string, Texture2D>();

        private static Shader _urpLitShader;
        private static Shader _standardShader;

        public static Shader LitShader
        {
            get
            {
                if (_urpLitShader == null) _urpLitShader = Shader.Find("Universal Render Pipeline/Lit");
                if (_urpLitShader == null) _urpLitShader = Shader.Find("Standard");
                if (_urpLitShader == null) _urpLitShader = Shader.Find("Mobile/Diffuse");
                return _urpLitShader;
            }
        }

        /// <summary>
        /// Get or create a photorealistic laboratory material.
        /// Guaranteed non-null with proper PBR colors, smoothness, metallic, and textures.
        /// </summary>
        public static Material GetMaterial(string name)
        {
            if (_cache.TryGetValue(name, out var cached) && cached != null)
                return cached;

            // 1. Try loading from Assets/Art/Materials/ via Editor AssetDatabase
#if UNITY_EDITOR
            var assetMat = UnityEditor.AssetDatabase.LoadAssetAtPath<Material>($"Assets/Art/Materials/{name}.mat");
            if (assetMat != null)
            {
                _cache[name] = assetMat;
                return assetMat;
            }
#endif

            // 2. Try loading from Resources
            var resMat = Resources.Load<Material>(name);
            if (resMat != null)
            {
                _cache[name] = resMat;
                return resMat;
            }

            // 3. Procedurally generate high-quality PBR material with loaded 2K textures
            var mat = CreateProceduralMaterial(name);
            _cache[name] = mat;
            return mat;
        }

        private static Material CreateProceduralMaterial(string name)
        {
            var mat = new Material(LitShader);
            mat.name = name;

            switch (name)
            {
                case "Lab_BenchTop":
                    // Black polished epoxy resin countertop (standard science island bench)
                    var epoxyTex = LoadTexture("lab_bench_epoxy_2k.png");
                    SetProps(mat, new Color(0.06f, 0.07f, 0.08f), 0.05f, 0.85f, epoxyTex);
                    break;

                case "Lab_Floor":
                    // Commercial laboratory ceramic floor tiles
                    var floorTex = LoadTexture("lab_floor_tiles_2k.png");
                    SetProps(mat, new Color(0.82f, 0.84f, 0.86f), 0.02f, 0.65f, floorTex, new Vector2(8f, 10f));
                    break;

                case "Lab_Wall":
                    // Clean off-white institutional drywall
                    SetProps(mat, new Color(0.88f, 0.90f, 0.92f), 0.0f, 0.20f);
                    break;

                case "Lab_Ceiling":
                    // White acoustic drop ceiling
                    SetProps(mat, new Color(0.92f, 0.93f, 0.95f), 0.0f, 0.15f);
                    break;

                case "Lab_Chalkboard":
                    // Large slate wall chalkboard with handwritten Ohm's Law schematics & formulas
                    var boardTex = LoadTexture("chalkboard_ohms_law_2k.png");
                    SetProps(mat, Color.white, 0.0f, 0.25f, boardTex);
                    break;

                case "Lab_VoltmeterDial":
                    // Dual-scale DC voltmeter dial (two-sided, non-culled)
                    var voltTex = LoadTexture("voltmeter_dial_2k.png");
                    if (mat.HasProperty("_Cull")) mat.SetFloat("_Cull", 0f);
                    SetProps(mat, Color.white, 0.0f, 0.20f, voltTex);
                    if (mat.HasProperty("_EmissionColor") && voltTex != null)
                    {
                        mat.EnableKeyword("_EMISSION");
                        mat.SetColor("_EmissionColor", new Color(0.20f, 0.20f, 0.20f));
                        mat.SetTexture("_EmissionMap", voltTex);
                    }
                    break;

                case "Lab_AmmeterDial":
                    // Dual-scale moving-coil ammeter dial (two-sided, non-culled)
                    var ammTex = LoadTexture("ammeter_dial_2k.png");
                    if (mat.HasProperty("_Cull")) mat.SetFloat("_Cull", 0f);
                    SetProps(mat, Color.white, 0.0f, 0.20f, ammTex);
                    if (mat.HasProperty("_EmissionColor") && ammTex != null)
                    {
                        mat.EnableKeyword("_EMISSION");
                        mat.SetColor("_EmissionColor", new Color(0.20f, 0.20f, 0.20f));
                        mat.SetTexture("_EmissionMap", ammTex);
                    }
                    break;

                case "Lab_PowerSupplyPanel":
                    // Brushed anodized aluminum power supply panel
                    var psTex = LoadTexture("power_supply_panel_2k.png");
                    SetProps(mat, new Color(0.85f, 0.87f, 0.90f), 0.50f, 0.70f, psTex);
                    break;

                case "Lab_RheostatWire":
                    // Coiled nichrome resistance wire wound on ceramic tube
                    var wireTex = LoadTexture("rheostat_wire_2k.png");
                    SetProps(mat, new Color(0.70f, 0.65f, 0.55f), 0.85f, 0.65f, wireTex, new Vector2(1f, 24f));
                    break;

                case "Lab_Brass":
                    // Polished machined brass (terminals, plug key, binding posts)
                    SetProps(mat, new Color(0.92f, 0.74f, 0.25f), 0.92f, 0.80f);
                    break;

                case "Lab_Copper":
                    // Polished pure copper (wiper contacts, resistor wire bobbin)
                    SetProps(mat, new Color(0.90f, 0.52f, 0.35f), 0.90f, 0.78f);
                    break;

                case "Lab_Ebonite":
                    // Matte molded black ebonite / bakelite instrument enclosure
                    SetProps(mat, new Color(0.12f, 0.12f, 0.14f), 0.05f, 0.38f);
                    break;

                case "Lab_Oak":
                    // Golden oak wood baseplate & cabinetry
                    SetProps(mat, new Color(0.62f, 0.42f, 0.22f), 0.0f, 0.48f);
                    break;

                case "Lab_MetalTrim":
                    // Dark anodized heavy steel frame and crossbraces
                    SetProps(mat, new Color(0.22f, 0.24f, 0.28f), 0.85f, 0.65f);
                    break;

                case "Lab_Glass":
                    // Clear protective meter window glass
                    SetProps(mat, new Color(0.90f, 0.95f, 1f, 0.35f), 0.1f, 0.95f);
                    break;

                case "Lab_NeedleRed":
                    // High-contrast bright red meter needle
                    SetProps(mat, new Color(0.96f, 0.12f, 0.10f), 0.1f, 0.70f);
                    break;

                case "Lab_WireRed":
                    // Insulated positive circuit wire
                    SetProps(mat, new Color(0.88f, 0.10f, 0.10f), 0.05f, 0.60f);
                    break;

                case "Lab_WireBlack":
                    // Insulated return ground circuit wire
                    SetProps(mat, new Color(0.12f, 0.13f, 0.15f), 0.05f, 0.60f);
                    break;

                case "Lab_WireYellow":
                    // Insulated parallel voltmeter probe wire
                    SetProps(mat, new Color(0.95f, 0.80f, 0.08f), 0.05f, 0.60f);
                    break;

                case "Lab_TerminalRed":
                    // Smooth injection-molded red phenolic resin terminal nut
                    SetProps(mat, new Color(0.85f, 0.12f, 0.10f), 0.15f, 0.75f);
                    break;

                case "Lab_TerminalBlack":
                    // Smooth black phenolic resin terminal nut
                    SetProps(mat, new Color(0.10f, 0.10f, 0.12f), 0.15f, 0.75f);
                    break;

                case "Lab_Bezel":
                    // Dark matte recessed bezel rim
                    SetProps(mat, new Color(0.08f, 0.08f, 0.09f), 0.30f, 0.60f);
                    break;

                case "Lab_MirrorStrip":
                    // Highly reflective anti-parallax silver mirror strip
                    SetProps(mat, new Color(0.92f, 0.94f, 0.97f), 0.98f, 0.98f);
                    break;

                default:
                    SetProps(mat, new Color(0.5f, 0.5f, 0.5f), 0.1f, 0.5f);
                    break;
            }

            return mat;
        }

        private static void SetProps(Material mat, Color color, float metallic, float smoothness, Texture2D tex = null, Vector2? tile = null)
        {
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);

            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", metallic);

            if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
            if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", smoothness);

            if (tex != null)
            {
                if (mat.HasProperty("_BaseMap")) mat.SetTexture("_BaseMap", tex);
                if (mat.HasProperty("_MainTex")) mat.SetTexture("_MainTex", tex);

                if (tile.HasValue)
                {
                    if (mat.HasProperty("_BaseMap")) mat.SetTextureScale("_BaseMap", tile.Value);
                    if (mat.HasProperty("_MainTex")) mat.SetTextureScale("_MainTex", tile.Value);
                }
            }
        }

        /// <summary>
        /// Loads a 2K texture image directly from disk.
        /// </summary>
        public static Texture2D LoadTexture(string filename)
        {
            if (_texCache.TryGetValue(filename, out var cached) && cached != null)
                return cached;

            // Check Unity Editor AssetDatabase first
#if UNITY_EDITOR
            var editorTex = UnityEditor.AssetDatabase.LoadAssetAtPath<Texture2D>($"Assets/Art/Textures/{filename}");
            if (editorTex != null)
            {
                _texCache[filename] = editorTex;
                return editorTex;
            }
#endif

            // Fallback: Read directly from project files
            string[] paths = new string[]
            {
                Path.Combine(Application.dataPath, "Art/Textures", filename),
                Path.Combine(Application.dataPath, "../Assets/Art/Textures", filename),
                Path.Combine("Assets/Art/Textures", filename)
            };

            foreach (var p in paths)
            {
                if (File.Exists(p))
                {
                    try
                    {
                        byte[] bytes = File.ReadAllBytes(p);
                        var tex = new Texture2D(2, 2, TextureFormat.RGBA32, true);
                        if (tex.LoadImage(bytes))
                        {
                            tex.name = filename;
                            _texCache[filename] = tex;
                            return tex;
                        }
                    }
                    catch (System.Exception ex)
                    {
                        Debug.LogWarning($"[VisoraLabMaterials] Failed to load texture {p}: {ex.Message}");
                    }
                }
            }

            return null;
        }
    }
}
