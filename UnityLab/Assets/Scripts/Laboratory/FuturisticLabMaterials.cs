using UnityEngine;

namespace Visora.Laboratory
{
    /// <summary>
    /// Futuristic laboratory material palette.
    /// Clean modern whites, frosted glass panels, neon LED accent strips,
    /// holographic glow materials, and premium brushed-metal finishes.
    /// All materials use URP Lit/Unlit shaders for WebGL compatibility.
    /// </summary>
    public static class FuturisticLabMaterials
    {
        // ── Cached materials ─────────────────────────────────────────────
        private static Material _mFloorWhite;
        private static Material _mFloorGrid;
        private static Material _mWallWhite;
        private static Material _mWallGlass;
        private static Material _mCeilingPanel;
        private static Material _mBenchWhite;
        private static Material _mBenchGlass;
        private static Material _mMetalBrushed;
        private static Material _mMetalChrome;
        private static Material _mLedCyan;
        private static Material _mLedMagenta;
        private static Material _mLedWhite;
        private static Material _mLedAmber;
        private static Material _mLedGreen;
        private static Material _mHoloBlue;
        private static Material _mHoloPanel;
        private static Material _mGlassClear;
        private static Material _mGlassFrosted;
        private static Material _mAccentDark;
        private static Material _mRubber;
        private static Material _mScreenGlow;
        private static Material _mFrameEdge;

        // ── Color Palette ────────────────────────────────────────────────
        public static readonly Color White          = new Color(0.96f, 0.97f, 0.98f);
        public static readonly Color OffWhite       = new Color(0.92f, 0.93f, 0.95f);
        public static readonly Color WarmWhite      = new Color(0.98f, 0.96f, 0.93f);
        public static readonly Color CoolGray       = new Color(0.78f, 0.80f, 0.84f);
        public static readonly Color DarkAccent     = new Color(0.12f, 0.13f, 0.16f);
        public static readonly Color MetalSilver    = new Color(0.85f, 0.86f, 0.88f);
        public static readonly Color ChromeReflect  = new Color(0.92f, 0.94f, 0.96f);

        // LED / Glow colors
        public static readonly Color CyanGlow       = new Color(0.0f, 0.92f, 1.0f);
        public static readonly Color MagentaGlow    = new Color(0.95f, 0.15f, 0.85f);
        public static readonly Color WhiteGlow      = new Color(0.98f, 0.99f, 1.0f);
        public static readonly Color AmberGlow      = new Color(1.0f, 0.78f, 0.15f);
        public static readonly Color GreenGlow      = new Color(0.15f, 1.0f, 0.55f);
        public static readonly Color HoloBlueGlow   = new Color(0.25f, 0.65f, 1.0f);

        // ── Shader References ────────────────────────────────────────────
        public static Shader LitShader
        {
            get
            {
                var s = Shader.Find("Universal Render Pipeline/Lit");
                if (s == null) s = Shader.Find("Standard");
                return s;
            }
        }

        public static Shader UnlitShader
        {
            get
            {
                var s = Shader.Find("Universal Render Pipeline/Unlit");
                if (s == null) s = Shader.Find("Unlit/Color");
                return s;
            }
        }

        // ── Material Constructors ────────────────────────────────────────

        /// <summary>
        /// Pristine white lab floor with subtle grid pattern via tiled normals.
        /// </summary>
        public static Material FloorWhite
        {
            get
            {
                if (_mFloorWhite != null) return _mFloorWhite;
                _mFloorWhite = new Material(LitShader);
                _mFloorWhite.name = "Futuristic_FloorWhite";
                _mFloorWhite.SetColor("_BaseColor", OffWhite);
                _mFloorWhite.SetFloat("_Smoothness", 0.82f);
                _mFloorWhite.SetFloat("_Metallic", 0.05f);
                return _mFloorWhite;
            }
        }

        /// <summary>
        /// Floor with subtle hex grid lines.
        /// </summary>
        public static Material FloorGrid
        {
            get
            {
                if (_mFloorGrid != null) return _mFloorGrid;
                _mFloorGrid = new Material(LitShader);
                _mFloorGrid.name = "Futuristic_FloorGrid";
                _mFloorGrid.SetColor("_BaseColor", new Color(0.88f, 0.89f, 0.92f));
                _mFloorGrid.SetFloat("_Smoothness", 0.90f);
                _mFloorGrid.SetFloat("_Metallic", 0.08f);
                return _mFloorGrid;
            }
        }

        /// <summary>
        /// Clean white wall panels with matte finish.
        /// </summary>
        public static Material WallWhite
        {
            get
            {
                if (_mWallWhite != null) return _mWallWhite;
                _mWallWhite = new Material(LitShader);
                _mWallWhite.name = "Futuristic_WallWhite";
                _mWallWhite.SetColor("_BaseColor", White);
                _mWallWhite.SetFloat("_Smoothness", 0.45f);
                _mWallWhite.SetFloat("_Metallic", 0.0f);
                return _mWallWhite;
            }
        }

        /// <summary>
        /// Frosted glass wall panels with high transparency look.
        /// </summary>
        public static Material WallGlass
        {
            get
            {
                if (_mWallGlass != null) return _mWallGlass;
                _mWallGlass = new Material(LitShader);
                _mWallGlass.name = "Futuristic_WallGlass";
                _mWallGlass.SetColor("_BaseColor", new Color(0.90f, 0.94f, 0.98f, 0.35f));
                _mWallGlass.SetFloat("_Smoothness", 0.95f);
                _mWallGlass.SetFloat("_Metallic", 0.1f);
                SetupTransparent(_mWallGlass);
                return _mWallGlass;
            }
        }

        /// <summary>
        /// Ceiling panels — soft diffuse white.
        /// </summary>
        public static Material CeilingPanel
        {
            get
            {
                if (_mCeilingPanel != null) return _mCeilingPanel;
                _mCeilingPanel = new Material(LitShader);
                _mCeilingPanel.name = "Futuristic_CeilingPanel";
                _mCeilingPanel.SetColor("_BaseColor", new Color(0.94f, 0.95f, 0.97f));
                _mCeilingPanel.SetFloat("_Smoothness", 0.3f);
                _mCeilingPanel.SetFloat("_Metallic", 0.0f);
                return _mCeilingPanel;
            }
        }

        /// <summary>
        /// Clean white workbench / countertop surface (Corian-like).
        /// </summary>
        public static Material BenchWhite
        {
            get
            {
                if (_mBenchWhite != null) return _mBenchWhite;
                _mBenchWhite = new Material(LitShader);
                _mBenchWhite.name = "Futuristic_BenchWhite";
                _mBenchWhite.SetColor("_BaseColor", new Color(0.97f, 0.97f, 0.98f));
                _mBenchWhite.SetFloat("_Smoothness", 0.78f);
                _mBenchWhite.SetFloat("_Metallic", 0.02f);
                return _mBenchWhite;
            }
        }

        /// <summary>
        /// Tempered glass bench top with slight blue tint.
        /// </summary>
        public static Material BenchGlass
        {
            get
            {
                if (_mBenchGlass != null) return _mBenchGlass;
                _mBenchGlass = new Material(LitShader);
                _mBenchGlass.name = "Futuristic_BenchGlass";
                _mBenchGlass.SetColor("_BaseColor", new Color(0.88f, 0.93f, 0.98f, 0.5f));
                _mBenchGlass.SetFloat("_Smoothness", 0.98f);
                _mBenchGlass.SetFloat("_Metallic", 0.15f);
                SetupTransparent(_mBenchGlass);
                return _mBenchGlass;
            }
        }

        /// <summary>
        /// Brushed aluminum / steel surfaces.
        /// </summary>
        public static Material MetalBrushed
        {
            get
            {
                if (_mMetalBrushed != null) return _mMetalBrushed;
                _mMetalBrushed = new Material(LitShader);
                _mMetalBrushed.name = "Futuristic_MetalBrushed";
                _mMetalBrushed.SetColor("_BaseColor", MetalSilver);
                _mMetalBrushed.SetFloat("_Smoothness", 0.55f);
                _mMetalBrushed.SetFloat("_Metallic", 0.85f);
                return _mMetalBrushed;
            }
        }

        /// <summary>
        /// Chrome / mirror-finish metal for accent strips.
        /// </summary>
        public static Material MetalChrome
        {
            get
            {
                if (_mMetalChrome != null) return _mMetalChrome;
                _mMetalChrome = new Material(LitShader);
                _mMetalChrome.name = "Futuristic_MetalChrome";
                _mMetalChrome.SetColor("_BaseColor", ChromeReflect);
                _mMetalChrome.SetFloat("_Smoothness", 0.96f);
                _mMetalChrome.SetFloat("_Metallic", 0.95f);
                return _mMetalChrome;
            }
        }

        /// <summary>
        /// Dark accent material for contrast panels and borders.
        /// </summary>
        public static Material AccentDark
        {
            get
            {
                if (_mAccentDark != null) return _mAccentDark;
                _mAccentDark = new Material(LitShader);
                _mAccentDark.name = "Futuristic_AccentDark";
                _mAccentDark.SetColor("_BaseColor", DarkAccent);
                _mAccentDark.SetFloat("_Smoothness", 0.65f);
                _mAccentDark.SetFloat("_Metallic", 0.1f);
                return _mAccentDark;
            }
        }

        /// <summary>
        /// Anti-slip rubber floor pads / foot strips.
        /// </summary>
        public static Material Rubber
        {
            get
            {
                if (_mRubber != null) return _mRubber;
                _mRubber = new Material(LitShader);
                _mRubber.name = "Futuristic_Rubber";
                _mRubber.SetColor("_BaseColor", new Color(0.18f, 0.19f, 0.22f));
                _mRubber.SetFloat("_Smoothness", 0.15f);
                _mRubber.SetFloat("_Metallic", 0.0f);
                return _mRubber;
            }
        }

        // ── LED / Emissive Materials ─────────────────────────────────────

        public static Material LedCyan     => GetOrCreateEmissive(ref _mLedCyan, "Futuristic_LED_Cyan", CyanGlow, 3.5f);
        public static Material LedMagenta  => GetOrCreateEmissive(ref _mLedMagenta, "Futuristic_LED_Magenta", MagentaGlow, 3.0f);
        public static Material LedWhite    => GetOrCreateEmissive(ref _mLedWhite, "Futuristic_LED_White", WhiteGlow, 4.0f);
        public static Material LedAmber    => GetOrCreateEmissive(ref _mLedAmber, "Futuristic_LED_Amber", AmberGlow, 3.0f);
        public static Material LedGreen    => GetOrCreateEmissive(ref _mLedGreen, "Futuristic_LED_Green", GreenGlow, 2.5f);

        /// <summary>
        /// Holographic blue emissive for floating display panels.
        /// </summary>
        public static Material HoloBlue
        {
            get
            {
                if (_mHoloBlue != null) return _mHoloBlue;
                _mHoloBlue = new Material(UnlitShader);
                _mHoloBlue.name = "Futuristic_HoloBlue";
                _mHoloBlue.SetColor("_BaseColor", new Color(0.20f, 0.55f, 1.0f, 0.6f));
                SetupTransparent(_mHoloBlue);
                return _mHoloBlue;
            }
        }

        /// <summary>
        /// Holographic panel background (subtle dark semi-transparent).
        /// </summary>
        public static Material HoloPanel
        {
            get
            {
                if (_mHoloPanel != null) return _mHoloPanel;
                _mHoloPanel = new Material(UnlitShader);
                _mHoloPanel.name = "Futuristic_HoloPanel";
                _mHoloPanel.SetColor("_BaseColor", new Color(0.05f, 0.08f, 0.15f, 0.45f));
                SetupTransparent(_mHoloPanel);
                return _mHoloPanel;
            }
        }

        /// <summary>
        /// Clear glass for windows / partitions.
        /// </summary>
        public static Material GlassClear
        {
            get
            {
                if (_mGlassClear != null) return _mGlassClear;
                _mGlassClear = new Material(LitShader);
                _mGlassClear.name = "Futuristic_GlassClear";
                _mGlassClear.SetColor("_BaseColor", new Color(0.92f, 0.96f, 1.0f, 0.15f));
                _mGlassClear.SetFloat("_Smoothness", 0.99f);
                _mGlassClear.SetFloat("_Metallic", 0.1f);
                SetupTransparent(_mGlassClear);
                return _mGlassClear;
            }
        }

        /// <summary>
        /// Frosted/diffuse glass panels.
        /// </summary>
        public static Material GlassFrosted
        {
            get
            {
                if (_mGlassFrosted != null) return _mGlassFrosted;
                _mGlassFrosted = new Material(LitShader);
                _mGlassFrosted.name = "Futuristic_GlassFrosted";
                _mGlassFrosted.SetColor("_BaseColor", new Color(0.90f, 0.93f, 0.97f, 0.55f));
                _mGlassFrosted.SetFloat("_Smoothness", 0.70f);
                _mGlassFrosted.SetFloat("_Metallic", 0.05f);
                SetupTransparent(_mGlassFrosted);
                return _mGlassFrosted;
            }
        }

        /// <summary>
        /// Glowing screen surface for monitors / displays.
        /// </summary>
        public static Material ScreenGlow
        {
            get
            {
                if (_mScreenGlow != null) return _mScreenGlow;
                _mScreenGlow = new Material(UnlitShader);
                _mScreenGlow.name = "Futuristic_ScreenGlow";
                _mScreenGlow.SetColor("_BaseColor", new Color(0.15f, 0.20f, 0.28f));
                return _mScreenGlow;
            }
        }

        /// <summary>
        /// Thin emissive edge frame material (for the pod / station outlines).
        /// </summary>
        public static Material FrameEdge
        {
            get
            {
                if (_mFrameEdge != null) return _mFrameEdge;
                _mFrameEdge = new Material(LitShader);
                _mFrameEdge.name = "Futuristic_FrameEdge";
                _mFrameEdge.SetColor("_BaseColor", new Color(0.90f, 0.92f, 0.96f));
                _mFrameEdge.SetFloat("_Smoothness", 0.85f);
                _mFrameEdge.SetFloat("_Metallic", 0.7f);
                _mFrameEdge.EnableKeyword("_EMISSION");
                _mFrameEdge.SetColor("_EmissionColor", CyanGlow * 0.8f);
                return _mFrameEdge;
            }
        }

        // ── Utility Methods ──────────────────────────────────────────────

        /// <summary>
        /// Create a colored LED emissive material with intensity.
        /// </summary>
        public static Material CreateLedMaterial(Color color, float intensity = 3.0f)
        {
            var mat = new Material(LitShader);
            mat.name = $"LED_{ColorToHex(color)}";
            mat.SetColor("_BaseColor", color);
            mat.EnableKeyword("_EMISSION");
            mat.SetColor("_EmissionColor", color * intensity);
            mat.SetFloat("_Smoothness", 0.95f);
            return mat;
        }

        private static Material GetOrCreateEmissive(ref Material cache, string name, Color color, float intensity)
        {
            if (cache != null) return cache;
            cache = new Material(LitShader);
            cache.name = name;
            cache.SetColor("_BaseColor", color);
            cache.EnableKeyword("_EMISSION");
            cache.SetColor("_EmissionColor", color * intensity);
            cache.SetFloat("_Smoothness", 0.92f);
            cache.SetFloat("_Metallic", 0.1f);
            return cache;
        }

        /// <summary>
        /// Configure a material for transparent rendering (URP).
        /// </summary>
        public static void SetupTransparent(Material mat)
        {
            // URP transparency setup
            mat.SetFloat("_Surface", 1); // 0 = Opaque, 1 = Transparent
            mat.SetFloat("_Blend", 0);   // 0 = Alpha, 1 = Premultiply, 2 = Additive, 3 = Multiply
            mat.SetFloat("_AlphaClip", 0);
            mat.SetFloat("_SrcBlend", (float)UnityEngine.Rendering.BlendMode.SrcAlpha);
            mat.SetFloat("_DstBlend", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            mat.SetFloat("_ZWrite", 0);
            mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
            mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            mat.SetOverrideTag("RenderType", "Transparent");
        }

        private static string ColorToHex(Color c)
        {
            return $"{(int)(c.r * 255):X2}{(int)(c.g * 255):X2}{(int)(c.b * 255):X2}";
        }
    }
}
