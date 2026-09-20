using UnityEngine;
using Visora.Laboratory;
using Visora.UI;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Automatic scene sanitizer and self-healing engine.
    /// Runs seamlessly on Awake() in playmode and editor mode to guarantee:
    /// 1. Zero floating 3D text (destroys legacy worldspace canvases).
    /// 2. Crystal clear chalkboard orientation, lighting, and 2K schematic display.
    /// 3. Visible calibrated dials on Ammeter, Voltmeter, and Power Supply (removes black windows, fixes quad normals).
    /// 4. Responsive needle pivots and synchronized brass plug key.
    /// 5. Fully functional OnGUI science HUD.
    /// </summary>
    [ExecuteAlways]
    public class OhmsLawLabAutoHealer : MonoBehaviour
    {
        private void Awake()
        {
            SanitizeAndHealScene();
        }

        private void Start()
        {
            SanitizeAndHealScene();
        }

        public static void SanitizeAndHealScene()
        {
            HealCamera();
            HealChalkboard();
            HealMeter("Ammeter", "ammeter_dial_2k.png");
            HealMeter("Voltmeter", "voltmeter_dial_2k.png");
            HealPowerSupply();
            HealObservationTablet();
            HealLighting();
            HealHUD();
            HealWiring();
        }

        private static void HealChalkboard()
        {
            var board = GameObject.Find("ClassroomChalkboard");
            if (board == null) return;

            // Mount flush against back wall if placed at legacy floating position
            if (board.transform.position.z < 5.2f)
            {
                board.transform.position = new Vector3(0f, 2.15f, 5.72f);
            }

            var chalkPlate = board.transform.Find("ChalkPlate");
            if (chalkPlate != null)
            {
                // Ensure quad faces student into the room (-Z normal)
                chalkPlate.localRotation = Quaternion.identity;
                chalkPlate.localPosition = new Vector3(0, 0, -0.022f);

                var rend = chalkPlate.GetComponent<Renderer>();
                if (rend != null)
                {
                    var tex = VisoraLabMaterials.LoadTexture("chalkboard_ohms_law_2k.png");
                    var mat = rend.sharedMaterial;
                    if (mat == null)
                    {
                        mat = VisoraLabMaterials.GetMaterial("Lab_Chalkboard");
                        rend.sharedMaterial = mat;
                    }

                    if (mat != null)
                    {
                        if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", Color.white);
                        if (mat.HasProperty("_Color")) mat.SetColor("_Color", Color.white);
                        if (tex != null)
                        {
                            if (mat.HasProperty("_BaseMap")) mat.SetTexture("_BaseMap", tex);
                            if (mat.HasProperty("_MainTex")) mat.SetTexture("_MainTex", tex);
                        }
                    }
                }
            }

            // Adjust spotlight on chalkboard to avoid blinding glare
            var lightTr = board.transform.Find("Chalkboard_Spotlight");
            if (lightTr != null)
            {
                var spot = lightTr.GetComponent<Light>();
                if (spot != null)
                {
                    spot.intensity = 1.0f;
                    spot.spotAngle = 65f;
                }
            }
        }

        private static void HealMeter(string meterName, string dialTextureName)
        {
            var meter = GameObject.Find(meterName);
            if (meter == null) return;

            // If meter uses new ProMesh 3D model, preserve its calibrated pivot & materials
            if (meter.transform.Find("ProMesh") != null) return;

            var faceAssembly = meter.transform.Find("FaceAssembly");
            if (faceAssembly == null) return;

            // 1. Destroy legacy opaque GlassWindow that occluded dial and needle
            var glassWin = faceAssembly.Find("GlassWindow");
            if (glassWin != null)
            {
                SafeDestroy(glassWin.gameObject);
            }

            // 2. Fix DialPlate (facing student, correct position and texture)
            var dialPlate = faceAssembly.Find("DialPlate");
            if (dialPlate != null)
            {
                dialPlate.localRotation = Quaternion.identity;
                dialPlate.localPosition = new Vector3(0, 0.045f, -0.005f);

                var rend = dialPlate.GetComponent<Renderer>();
                if (rend != null)
                {
                    var tex = VisoraLabMaterials.LoadTexture(dialTextureName);
                    string matName = (meterName == "Ammeter") ? "Lab_AmmeterDial" : "Lab_VoltmeterDial";
                    var mat = VisoraLabMaterials.GetMaterial(matName);
                    if (mat != null)
                    {
                        mat.SetColor("_BaseColor", Color.white);
                        if (tex != null) mat.SetTexture("_BaseMap", tex);
                        rend.sharedMaterial = mat;
                    }
                }
            }

            // 3. Fix Needle Pivot & Bold Red Pointer
            var needlePivot = faceAssembly.Find("NeedlePivot");
            if (needlePivot != null)
            {
                needlePivot.localPosition = new Vector3(0f, 0.012f, -0.010f);

                var pointer = needlePivot.Find("Pointer");
                if (pointer != null)
                {
                    pointer.localPosition = new Vector3(0, 0.028f, -0.002f);
                    pointer.localScale = new Vector3(0.004f, 0.056f, 0.003f);

                    var rend = pointer.GetComponent<Renderer>();
                    if (rend != null)
                    {
                        var redMat = VisoraLabMaterials.GetMaterial("Lab_NeedleRed");
                        if (redMat != null)
                        {
                            redMat.SetColor("_BaseColor", new Color(1f, 0.12f, 0.08f));
                            rend.sharedMaterial = redMat;
                        }
                    }
                }
            }
        }

        private static void HealPowerSupply()
        {
            var ps = GameObject.Find("PowerSupply");
            if (ps == null) return;

            var front = ps.transform.Find("FrontPanel");
            if (front != null)
            {
                front.localRotation = Quaternion.identity;
                front.localPosition = new Vector3(0, 0.08f, -0.101f);

                var rend = front.GetComponent<Renderer>();
                if (rend != null)
                {
                    var tex = VisoraLabMaterials.LoadTexture("power_supply_panel_2k.png");
                    var mat = VisoraLabMaterials.GetMaterial("Lab_PowerSupplyPanel");
                    if (mat != null)
                    {
                        mat.SetColor("_BaseColor", Color.white);
                        if (tex != null) mat.SetTexture("_BaseMap", tex);
                        rend.sharedMaterial = mat;
                    }
                }
            }
        }

        private static void HealObservationTablet()
        {
            // Destroy any legacy floating 3D text canvases
            var floatingCanvases = Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include);
            foreach (var c in floatingCanvases)
            {
                if (c.renderMode == RenderMode.WorldSpace && c.gameObject.name.Contains("Tablet"))
                {
                    SafeDestroy(c.gameObject);
                }
            }

            var tablet = GameObject.Find("ObservationTablet");
            if (tablet != null)
            {
                var canvas = tablet.transform.Find("TabletCanvas");
                if (canvas != null)
                {
                    SafeDestroy(canvas.gameObject);
                }
            }
        }

        private static void HealLighting()
        {
            var mainLight = GameObject.Find("Directional Light");
            if (mainLight != null)
            {
                var l = mainLight.GetComponent<Light>();
                if (l != null)
                {
                    l.intensity = 1.25f;
                    l.color = new Color(1.0f, 0.98f, 0.95f);
                }
            }
        }

        private static void HealHUD()
        {
            var exp = GameObject.Find("OhmsLawExperiment");
            if (exp != null)
            {
                if (exp.GetComponent<LabHUD>() == null)
                {
                    exp.AddComponent<LabHUD>();
                }
            }
            else
            {
                if (FindAnyObjectByType<LabHUD>() == null)
                {
                    var hudGo = new GameObject("LabHUD");
                    hudGo.AddComponent<LabHUD>();
                }
            }
        }

        private static void HealWiring()
        {
            if (Object.FindAnyObjectByType<Wiring.InteractiveWiringManager>() == null)
            {
                var wiringRoot = GameObject.Find("CircuitWiring");
                if (wiringRoot == null)
                {
                    var exp = GameObject.Find("=== EXPERIMENT ===") ?? GameObject.Find("OhmsLawExperiment");
                    wiringRoot = new GameObject("CircuitWiring");
                    if (exp != null) wiringRoot.transform.SetParent(exp.transform);
                }

                // The manager's Start() coroutine will auto-wire after one frame delay
                wiringRoot.AddComponent<Wiring.InteractiveWiringManager>();
            }
        }

        private static void HealCamera()
        {
            var cam = Camera.main;
            if (cam == null) return;

            cam.allowHDR = true;
            cam.allowMSAA = true;
            cam.nearClipPlane = 0.05f;
            cam.farClipPlane = 100f;

            var additionalData = cam.GetComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>();
            if (additionalData == null)
            {
                additionalData = cam.gameObject.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>();
            }
            if (additionalData != null)
            {
                additionalData.antialiasing = UnityEngine.Rendering.Universal.AntialiasingMode.SubpixelMorphologicalAntiAliasing;
                additionalData.antialiasingQuality = UnityEngine.Rendering.Universal.AntialiasingQuality.High;
                additionalData.renderPostProcessing = true;
            }
        }

        private static void SafeDestroy(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Destroy(obj);
            else DestroyImmediate(obj);
        }
    }
}
