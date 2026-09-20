using UnityEngine;
using UnityEditor;
using UnityEditor.Build.Reporting;
using System.IO;

namespace Visora.Editor
{
    /// <summary>
    /// Automates the WebGL build process for deployment on Vercel.
    /// Configures optimal WebGL settings then builds to /WebGLBuild/
    ///
    /// Usage: Visora → Build WebGL
    /// Or run headlessly: Unity -batchmode -executeMethod Visora.Editor.WebGLBuilder.BuildWebGL -quit
    /// </summary>
    public static class WebGLBuilder
    {
        private const string BUILD_OUTPUT_PATH = "WebGLBuild";
        private const string PRODUCT_NAME     = "Visora Virtual Lab";

        [MenuItem("Visora/Build WebGL (for Vercel)", priority = 20)]
        public static void BuildWebGL()
        {
            ConfigureWebGLSettings();
            PerformBuild();
        }

        static void ConfigureWebGLSettings()
        {
            Debug.Log("[WebGLBuilder] Configuring WebGL player settings...");

            // ── Player Settings ──────────────────────────────────────────
            PlayerSettings.productName    = PRODUCT_NAME;
            PlayerSettings.companyName    = "Visora Education";

            // WebGL specific
            PlayerSettings.WebGL.compressionFormat   = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.dataCaching          = true;
            PlayerSettings.WebGL.decompressionFallback = true;

            // Color space — Linear for URP
            PlayerSettings.colorSpace = ColorSpace.Linear;

            // Strip engine code for smaller build
            PlayerSettings.stripEngineCode = true;

            // ── Graphics API ─────────────────────────────────────────────
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL,
                new[] { UnityEngine.Rendering.GraphicsDeviceType.OpenGLES3 });

            // ── Quality ───────────────────────────────────────────────────
            // Reduce texture compression quality for WebGL
            QualitySettings.globalTextureMipmapLimit = 0;

            Debug.Log("[WebGLBuilder] ✓ WebGL settings configured.");
        }

        static void PerformBuild()
        {
            string outputPath = Path.GetFullPath(BUILD_OUTPUT_PATH);
            Debug.Log($"[WebGLBuilder] Building to: {outputPath}");

            var buildOptions = new BuildPlayerOptions
            {
                scenes = GetEnabledScenes(),
                locationPathName = outputPath,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };

            var report = BuildPipeline.BuildPlayer(buildOptions);

            if (report.summary.result == BuildResult.Succeeded)
            {
                ulong sizeBytes = report.summary.totalSize;
                float sizeMB = sizeBytes / (1024f * 1024f);
                Debug.Log($"[WebGLBuilder] ✓ Build SUCCESS: {sizeMB:F1} MB in {report.summary.totalTime.TotalSeconds:F0}s");
                Debug.Log($"[WebGLBuilder] Output: {outputPath}");
                Debug.Log("[WebGLBuilder] Deploy: Upload WebGLBuild/ to your /virtual-lab/ path on Vercel.");

                if (!Application.isBatchMode)
                {
                    bool open = EditorUtility.DisplayDialog(
                        "WebGL Build Complete ✓",
                        $"Build size: {sizeMB:F1} MB\n\n" +
                        "To deploy:\n" +
                        "1. Copy WebGLBuild/ to your Vercel project\n" +
                        "2. Configure it to serve from /virtual-lab/\n" +
                        "3. Set VITE_UNITY_LAB_URL=/virtual-lab/index.html in Vercel\n\n" +
                        "Open build folder now?",
                        "Open Folder",
                        "Close"
                    );

                    if (open) EditorUtility.RevealInFinder(outputPath);
                }
            }
            else
            {
                Debug.LogError($"[WebGLBuilder] ✗ Build FAILED: {report.summary.result}");
                foreach (var step in report.steps)
                {
                    foreach (var msg in step.messages)
                    {
                        if (msg.type == LogType.Error || msg.type == LogType.Exception)
                            Debug.LogError($"  {msg.content}");
                    }
                }
            }
        }

        static string[] GetEnabledScenes()
        {
            var sceneList = new System.Collections.Generic.List<string>();
            foreach (var scene in EditorBuildSettings.scenes)
            {
                if (scene.enabled)
                    sceneList.Add(scene.path);
            }

            if (sceneList.Count == 0)
            {
                Debug.LogWarning("[WebGLBuilder] No scenes in Build Settings. Adding OhmsLawLab.");
                sceneList.Add("Assets/Scenes/Experiments/OhmsLawLab.unity");
            }

            return sceneList.ToArray();
        }
    }
}
