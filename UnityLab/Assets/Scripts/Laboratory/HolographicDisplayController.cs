using UnityEngine;
using Visora.Experiments.OhmsLaw;
using Visora.Experiments.OhmsLaw.Wiring;

namespace Visora.Laboratory
{
    /// <summary>
    /// Controls the holographic display panels in the futuristic lab.
    /// Updates content dynamically based on experiment state, circuit topology,
    /// and student progress. Renders using Unity IMGUI overlaid on 3D quads.
    /// </summary>
    public class HolographicDisplayController : MonoBehaviour
    {
        [Header("Display Type")]
        [SerializeField] private DisplayMode _displayMode = DisplayMode.ExperimentInfo;

        [Header("Animation")]
        [SerializeField] private float _floatAmplitude = 0.015f;
        [SerializeField] private float _floatSpeed = 0.8f;
        [SerializeField] private float _scanlineSpeed = 2.0f;

        [Header("References")]
        [SerializeField] private OhmsLawController _controller;
        [SerializeField] private InteractiveWiringManager _wiringManager;

        private Vector3 _originalPosition;
        private float _time;
        private Material _panelMaterial;

        public enum DisplayMode
        {
            ExperimentInfo,     // Shows V=IR formula, parameters, status
            CircuitStatus,      // Shows wiring completion, topology health
            LabBranding,        // Visiora logo / lab name
            LiveReadings        // Real-time voltage, current, power readings
        }

        private void Start()
        {
            _originalPosition = transform.localPosition;

            if (_controller == null)
                _controller = FindAnyObjectByType<OhmsLawController>();
            if (_wiringManager == null)
                _wiringManager = FindAnyObjectByType<InteractiveWiringManager>();

            // Get the panel material for scanline effect
            var bg = transform.Find("HoloBG");
            if (bg != null)
            {
                _panelMaterial = bg.GetComponent<Renderer>()?.material;
            }
        }

        private void Update()
        {
            _time += Time.deltaTime;

            // Gentle floating animation
            if (_floatAmplitude > 0f)
            {
                Vector3 offset = Vector3.up * Mathf.Sin(_time * _floatSpeed) * _floatAmplitude;
                transform.localPosition = _originalPosition + offset;
            }

            // Subtle opacity pulse for holographic effect
            if (_panelMaterial != null)
            {
                float alpha = Mathf.Lerp(0.35f, 0.55f, (Mathf.Sin(_time * 1.5f) + 1f) * 0.5f);
                Color c = _panelMaterial.GetColor("_BaseColor");
                c.a = alpha;
                _panelMaterial.SetColor("_BaseColor", c);
            }
        }

        private void OnGUI()
        {
            // Only render GUI if the display is in view of the camera
            if (Camera.main == null) return;

            Vector3 screenPos = Camera.main.WorldToScreenPoint(transform.position);
            if (screenPos.z < 0 || screenPos.x < -200 || screenPos.x > Screen.width + 200) return;

            // Calculate screen-space rect based on world position and scale
            float distance = Vector3.Distance(Camera.main.transform.position, transform.position);
            if (distance > 12f) return; // Don't render if too far

            float scaleFactor = Mathf.Clamp(4.0f / distance, 0.3f, 1.5f);

            switch (_displayMode)
            {
                case DisplayMode.ExperimentInfo:
                    DrawExperimentInfo(screenPos, scaleFactor);
                    break;
                case DisplayMode.CircuitStatus:
                    DrawCircuitStatus(screenPos, scaleFactor);
                    break;
                case DisplayMode.LabBranding:
                    DrawLabBranding(screenPos, scaleFactor);
                    break;
                case DisplayMode.LiveReadings:
                    DrawLiveReadings(screenPos, scaleFactor);
                    break;
            }
        }

        private void DrawExperimentInfo(Vector3 screenPos, float scale)
        {
            float w = 380 * scale;
            float h = 200 * scale;
            float x = screenPos.x - w * 0.5f;
            float y = Screen.height - screenPos.y - h * 0.5f;

            var titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(22 * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            titleStyle.normal.textColor = new Color(0.4f, 0.85f, 1.0f);

            var formulaStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(36 * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            formulaStyle.normal.textColor = new Color(0.95f, 0.98f, 1.0f);

            var statusStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(14 * scale),
                alignment = TextAnchor.MiddleCenter
            };
            statusStyle.normal.textColor = new Color(0.6f, 0.75f, 0.9f);

            GUI.Label(new Rect(x, y, w, h * 0.25f), "⚡ OHM'S LAW EXPERIMENT", titleStyle);
            GUI.Label(new Rect(x, y + h * 0.25f, w, h * 0.35f), "V = I × R", formulaStyle);

            string mode = _controller != null ? _controller.SimulationMode.ToString().ToUpper() : "IDEAL";
            GUI.Label(new Rect(x, y + h * 0.65f, w, h * 0.15f), $"Physics Mode: {mode}", statusStyle);
        }

        private void DrawCircuitStatus(Vector3 screenPos, float scale)
        {
            float w = 200 * scale;
            float h = 120 * scale;
            float x = screenPos.x - w * 0.5f;
            float y = Screen.height - screenPos.y - h * 0.5f;

            string status = _wiringManager != null ? _wiringManager.CurrentStatus.ToString() : "Unknown";
            Color statusColor = status == "FullyWired" ? FuturisticLabMaterials.GreenGlow :
                                (status == "Incomplete" || status == "SeriesLoopClosed") ? FuturisticLabMaterials.AmberGlow :
                                FuturisticLabMaterials.CyanGlow;

            var headerStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(14 * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            headerStyle.normal.textColor = new Color(0.5f, 0.8f, 1.0f);

            var valStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(18 * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            valStyle.normal.textColor = statusColor;

            GUI.Label(new Rect(x, y, w, h * 0.4f), "🔌 CIRCUIT", headerStyle);
            GUI.Label(new Rect(x, y + h * 0.4f, w, h * 0.4f), status, valStyle);
        }

        private void DrawLabBranding(Vector3 screenPos, float scale)
        {
            float w = 220 * scale;
            float h = 80 * scale;
            float x = screenPos.x - w * 0.5f;
            float y = Screen.height - screenPos.y - h * 0.5f;

            var brandStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(24 * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            brandStyle.normal.textColor = new Color(0.4f, 0.85f, 1.0f);

            GUI.Label(new Rect(x, y, w, h), "VISIORA LAB", brandStyle);
        }

        private void DrawLiveReadings(Vector3 screenPos, float scale)
        {
            float w = 280 * scale;
            float h = 180 * scale;
            float x = screenPos.x - w * 0.5f;
            float y = Screen.height - screenPos.y - h * 0.5f;

            float voltage = _controller != null ? _controller.CurrentVoltage : 0f;
            float current = _controller != null ? _controller.CurrentCurrent : 0f;
            float resistance = _controller != null ? _controller.ResistanceValue : 0f;
            bool switchOn = _controller != null && _controller.IsSwitchClosed;

            var headerStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(13 * scale),
                alignment = TextAnchor.MiddleLeft
            };
            headerStyle.normal.textColor = new Color(0.5f, 0.7f, 0.9f);

            var valStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = (int)(20 * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleRight
            };
            valStyle.normal.textColor = switchOn ? FuturisticLabMaterials.GreenGlow : FuturisticLabMaterials.CyanGlow;

            float row = h * 0.22f;
            GUI.Label(new Rect(x, y, w * 0.5f, row), "Voltage:", headerStyle);
            GUI.Label(new Rect(x + w * 0.5f, y, w * 0.45f, row), $"{voltage:F2} V", valStyle);

            GUI.Label(new Rect(x, y + row, w * 0.5f, row), "Current:", headerStyle);
            GUI.Label(new Rect(x + w * 0.5f, y + row, w * 0.45f, row), $"{current:F3} A", valStyle);

            GUI.Label(new Rect(x, y + row * 2, w * 0.5f, row), "Resistance:", headerStyle);
            GUI.Label(new Rect(x + w * 0.5f, y + row * 2, w * 0.45f, row), $"{resistance:F1} Ω", valStyle);

            var statusText = switchOn ? "● CIRCUIT ACTIVE" : "○ CIRCUIT OPEN";
            GUI.Label(new Rect(x, y + row * 3, w, row), statusText, headerStyle);
        }

        private void OnDestroy()
        {
            if (_panelMaterial != null && Application.isPlaying)
            {
                Destroy(_panelMaterial);
            }
        }
    }
}
