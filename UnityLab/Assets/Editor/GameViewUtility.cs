using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Visora.Editor
{
    /// <summary>
    /// Utility to ensure the Game View scale is reset to 1x native resolution,
    /// eliminating blurry 2x zoom and ensuring maximum asset visual clarity.
    /// </summary>
    [InitializeOnLoad]
    public static class GameViewUtility
    {
        static GameViewUtility()
        {
            EditorApplication.playModeStateChanged += OnPlayModeChanged;
        }

        private static void OnPlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                ResetGameViewScale();
            }
        }

        [MenuItem("Visora/Reset Game View Scale (1x Crisp Clarity)", priority = 10)]
        public static void ResetGameViewScale()
        {
            var gameViewType = typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView");
            if (gameViewType == null) return;

            var gameView = EditorWindow.GetWindow(gameViewType, false, null, false);
            if (gameView == null) return;

            // Reset zoom scale to 1.0f
            var scaleProp = gameViewType.GetProperty("scale", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            if (scaleProp != null && scaleProp.CanWrite)
            {
                scaleProp.SetValue(gameView, 1.0f);
            }

            var snapZoomMethod = gameViewType.GetMethod("SnapZoom", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance, null, new[] { typeof(float) }, null);
            if (snapZoomMethod != null)
            {
                snapZoomMethod.Invoke(gameView, new object[] { 1.0f });
            }

            gameView.Repaint();
        }

        [MenuItem("Visora/Capture Workbench Screenshot", priority = 11)]
        public static void CaptureWorkbenchScreenshot()
        {
            string artifactDir = "/Users/bouroju/.gemini/antigravity-ide/brain/427cf3b6-6554-4487-a12a-bb1eb397af70";
            string path = System.IO.Path.Combine(artifactDir, "voltmeter_flagship_showcase.png");

            var cam = Camera.main;
            if (cam != null)
            {
                var rt = new RenderTexture(1920, 1080, 24, RenderTextureFormat.ARGB32);
                var prevRt = cam.targetTexture;
                cam.targetTexture = rt;
                cam.Render();
                cam.targetTexture = prevRt;

                RenderTexture.active = rt;
                var tex = new Texture2D(1920, 1080, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, 1920, 1080), 0, 0);
                tex.Apply();
                RenderTexture.active = null;

                byte[] bytes = tex.EncodeToPNG();
                System.IO.File.WriteAllBytes(path, bytes);
                Object.DestroyImmediate(tex);
                Object.DestroyImmediate(rt);
                Debug.Log($"[Visora] Saved high-res screenshot to: {path}");
            }
        }
        [MenuItem("Visora/Capture Voltmeter Inspection Shot", priority = 12)]
        public static void CaptureVoltmeterInspectionShot()
        {
            var volt = GameObject.Find("Voltmeter");
            if (volt == null)
            {
                Debug.LogError("Voltmeter not found in scene!");
                return;
            }

            var cam = Camera.main;
            if (cam == null) return;

            Transform face = volt.transform.Find("FaceAssembly");
            Vector3 dialNormal = face != null ? face.forward : (volt.transform.rotation * new Vector3(0f, 0.90035f, -0.43517f));
            Vector3 dialUp     = face != null ? face.up      : (volt.transform.rotation * new Vector3(0f, 0.43517f, 0.90035f));
            Vector3 dialCenter = face != null ? face.position : (volt.transform.position + volt.transform.rotation * new Vector3(0f, 0.052f, -0.023f));

            Vector3 prevPos = cam.transform.position;
            Quaternion prevRot = cam.transform.rotation;

            // Position camera facing directly into dial face at 0.28m
            cam.transform.position = dialCenter + dialNormal * 0.28f;
            cam.transform.rotation = Quaternion.LookRotation(-dialNormal, dialUp);

            // Deflect needle to realistic voltage reading
            var pivot = volt.transform.Find("FaceAssembly/NeedlePivot");
            if (pivot != null)
            {
                pivot.localRotation = Quaternion.Euler(0f, 0f, 32.0f);
            }

            string artifactDir = "/Users/bouroju/.gemini/antigravity-ide/brain/427cf3b6-6554-4487-a12a-bb1eb397af70";
            string path = System.IO.Path.Combine(artifactDir, "voltmeter_flagship_closeup.png");

            var rt = new RenderTexture(1920, 1080, 24, RenderTextureFormat.ARGB32);
            var prevRt = cam.targetTexture;
            cam.targetTexture = rt;
            cam.Render();
            cam.targetTexture = prevRt;

            RenderTexture.active = rt;
            var tex = new Texture2D(1920, 1080, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, 1920, 1080), 0, 0);
            tex.Apply();
            RenderTexture.active = null;

            byte[] bytes = tex.EncodeToPNG();
            System.IO.File.WriteAllBytes(path, bytes);
            Object.DestroyImmediate(tex);
            Object.DestroyImmediate(rt);

            // Check all renderers and materials on Voltmeter
            var rends = volt.GetComponentsInChildren<Renderer>();
            foreach (var r in rends)
            {
                for (int m = 0; m < r.sharedMaterials.Length; m++)
                {
                    var mat = r.sharedMaterials[m];
                    Debug.Log($"[Voltmeter Mat] {r.gameObject.name} submesh {m}: {(mat != null ? mat.name : "NULL")}, shader: {(mat != null && mat.shader != null ? mat.shader.name : "NULL")}, mainTex: {(mat != null && mat.mainTexture != null ? mat.mainTexture.name : "NULL")}");
                }
            }

            cam.transform.position = prevPos;
            cam.transform.rotation = prevRot;

            Debug.Log($"[Visora] Saved high-res close-up screenshot to: {path}");
        }
    }
}
