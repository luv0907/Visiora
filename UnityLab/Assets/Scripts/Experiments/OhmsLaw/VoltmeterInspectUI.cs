using UnityEngine;
using Visora.Player;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Precision Close-up Inspection Interface for the Analog Voltmeter.
    /// Provides cinematic camera focus, anti-parallax alignment guidance,
    /// mechanical zero-screw rotary calibration, and dual-range sensitivity switching.
    /// </summary>
    public class VoltmeterInspectUI : MonoBehaviour
    {
        [SerializeField] private VoltmeterDevice _voltmeter;
        [SerializeField] private float _inspectDistance = 0.35f;

        private bool _isInspecting = false;
        private Camera _mainCam;
        private FirstPersonController _fpController;
        private Vector3 _originalCamPos;
        private Quaternion _originalCamRot;
        private float _transitionT = 0f;

        // Cached GUI styles
        private GUIStyle _panelStyle, _titleStyle, _headerStyle, _bodyStyle, _badgeStyle;
        private Texture2D _texBg, _texGreen, _texOrange, _texCyan;

        private void Start()
        {
            if (_voltmeter == null) _voltmeter = GetComponent<VoltmeterDevice>() ?? FindAnyObjectByType<VoltmeterDevice>();
            _mainCam = Camera.main;
            _fpController = FindAnyObjectByType<FirstPersonController>();
        }

        private bool _isReturning = false;

        private void Update()
        {
            // Toggle inspect mode with [Z] key
            if (Input.GetKeyDown(KeyCode.Z))
            {
                ToggleInspectMode();
            }

            if (_mainCam == null || _voltmeter == null) return;

            if (_isInspecting)
            {
                Transform face = _voltmeter.transform.Find("FaceAssembly");
                Vector3 dialNormal = face != null ? face.forward : (_voltmeter.transform.rotation * new Vector3(0f, 0.90035f, -0.43517f));
                Vector3 dialUp     = face != null ? face.up      : (_voltmeter.transform.rotation * new Vector3(0f, 0.43517f, 0.90035f));
                Vector3 dialCenter = face != null ? face.position : (_voltmeter.transform.position + _voltmeter.transform.rotation * new Vector3(0f, 0.052f, -0.023f));

                Vector3 targetPos = dialCenter + dialNormal * _inspectDistance;
                Quaternion targetRot = Quaternion.LookRotation(-dialNormal, dialUp);

                _mainCam.transform.position = Vector3.Lerp(_mainCam.transform.position, targetPos, Time.deltaTime * 8f);
                _mainCam.transform.rotation = Quaternion.Slerp(_mainCam.transform.rotation, targetRot, Time.deltaTime * 8f);
            }
            else if (_isReturning)
            {
                _mainCam.transform.position = Vector3.Lerp(_mainCam.transform.position, _originalCamPos, Time.deltaTime * 8f);
                _mainCam.transform.rotation = Quaternion.Slerp(_mainCam.transform.rotation, _originalCamRot, Time.deltaTime * 8f);

                if (Vector3.Distance(_mainCam.transform.position, _originalCamPos) < 0.02f)
                {
                    _mainCam.transform.position = _originalCamPos;
                    _mainCam.transform.rotation = _originalCamRot;
                    _isReturning = false;
                }
            }
        }

        public void ToggleInspectMode()
        {
            _isInspecting = !_isInspecting;
            if (_voltmeter != null) _voltmeter.SetInspecting(_isInspecting);

            if (_isInspecting)
            {
                _isReturning = false;
                if (_mainCam != null)
                {
                    _originalCamPos = _mainCam.transform.position;
                    _originalCamRot = _mainCam.transform.rotation;
                }
                _fpController?.SetCursorState(true);
            }
            else
            {
                _isReturning = true;
                _fpController?.SetCursorState(false);
            }
        }

        private void EnsureStyles()
        {
            if (_panelStyle != null) return;

            _texBg     = MakeTex(2, 2, new Color(0.06f, 0.09f, 0.16f, 0.94f));
            _texGreen  = MakeTex(2, 2, new Color(0.00f, 0.82f, 0.42f, 0.95f));
            _texOrange = MakeTex(2, 2, new Color(1.00f, 0.58f, 0.00f, 0.95f));
            _texCyan   = MakeTex(2, 2, new Color(0.00f, 0.85f, 1.00f, 0.95f));

            _panelStyle = new GUIStyle(GUI.skin.box) {
                normal = { background = _texBg },
                padding = new RectOffset(16, 16, 12, 12),
                alignment = TextAnchor.UpperLeft
            };

            _titleStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 14, fontStyle = FontStyle.Bold, richText = true,
                normal = { textColor = new Color(0.00f, 0.90f, 1.0f) }
            };
            _headerStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 12, fontStyle = FontStyle.Bold, richText = true,
                normal = { textColor = Color.white }
            };
            _bodyStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 11, richText = true,
                normal = { textColor = new Color(0.85f, 0.90f, 0.96f) }
            };
            _badgeStyle = new GUIStyle(GUI.skin.box) {
                fontSize = 11, fontStyle = FontStyle.Bold, richText = true,
                alignment = TextAnchor.MiddleCenter
            };
        }

        private void OnGUI()
        {
            if (!_isInspecting || _voltmeter == null) return;

            EnsureStyles();

            // Right-side Inspection Control Card
            float pw = 360f;
            float ph = 290f;
            float px = Screen.width - pw - 20f;
            float py = (Screen.height - ph) * 0.5f;

            GUILayout.BeginArea(new Rect(px, py, pw, ph), _panelStyle);
            {
                GUILayout.BeginHorizontal();
                GUILayout.Label("<b><color=#00E5FF>PRECISION ANALOG VOLTMETER</color></b>", _titleStyle);
                GUILayout.FlexibleSpace();
                if (GUILayout.Button("✕ Close [Z]", GUILayout.Width(80), GUILayout.Height(22)))
                {
                    ToggleInspectMode();
                }
                GUILayout.EndHorizontal();

                GUILayout.Label("D'Arsonval Moving-Coil Galvanometer Mechanism", _bodyStyle);
                GUILayout.Space(6);

                // Live Reading Box
                float v = _voltmeter.DisplayedVoltage;
                float rMax = _voltmeter.RangeMax;
                GUILayout.Label($"<b>Measured Potential:  <color=#00E5FF><size=16>{v:F2} V</size></color></b>  (Range: 0 – {rMax:F0} V)", _headerStyle);
                GUILayout.Label($"Deflection Angle: <b>{_voltmeter.CurrentAngle:F1}°</b>", _bodyStyle);
                GUILayout.Space(4);

                // Anti-Parallax Mirror Alignment Status
                bool isAligned = _voltmeter.IsParallaxAligned;
                float pAngle = _voltmeter.ParallaxAngle;
                if (isAligned)
                {
                    _badgeStyle.normal.background = _texGreen;
                    _badgeStyle.normal.textColor = Color.black;
                    GUILayout.Box("✓ ZERO PARALLAX ERROR: Needle Aligned with Mirror", _badgeStyle, GUILayout.Height(24));
                }
                else
                {
                    _badgeStyle.normal.background = _texOrange;
                    _badgeStyle.normal.textColor = Color.white;
                    GUILayout.Box($"⚠ PARALLAX ANGLE: {pAngle:F1}° — Align View to Mirror", _badgeStyle, GUILayout.Height(24));
                }

                GUILayout.Space(6);

                // Range Selector (3V / 15V)
                GUILayout.BeginHorizontal();
                GUILayout.Label("<b>Sensitivity Range:</b>", _bodyStyle, GUILayout.Width(120));
                if (GUILayout.Button(rMax <= 3f ? "● 0 – 3 V (High Res)" : "○ 0 – 3 V", GUILayout.Height(24)))
                {
                    _voltmeter.SetRange(false);
                }
                if (GUILayout.Button(rMax > 3f ? "● 0 – 15 V (Wide)" : "○ 0 – 15 V", GUILayout.Height(24)))
                {
                    _voltmeter.SetRange(true);
                }
                GUILayout.EndHorizontal();

                GUILayout.Space(6);

                // Mechanical Zero-Adjuster Screw Tool
                GUILayout.Label("<b>Mechanical Zero-Adjustment Calibration:</b>", _bodyStyle);
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("◀ -0.2°", GUILayout.Width(60), GUILayout.Height(22)))
                {
                    _voltmeter.AdjustZeroScrew(-0.2f);
                }
                float zeroOffset = _voltmeter.ZeroCalibrationOffset;
                GUILayout.Label($"Offset: <b><color=#FFE082>{zeroOffset:+0.1;-0.1;0.0}°</color></b>", _bodyStyle, GUILayout.Width(90));
                if (GUILayout.Button("+0.2° ▶", GUILayout.Width(60), GUILayout.Height(22)))
                {
                    _voltmeter.AdjustZeroScrew(+0.2f);
                }
                if (GUILayout.Button("Reset", GUILayout.Width(50), GUILayout.Height(22)))
                {
                    _voltmeter.AdjustZeroScrew(-zeroOffset);
                }
                GUILayout.EndHorizontal();

                GUILayout.Space(4);
                GUILayout.Label("<i>Rotate hairspring screw to calibrate needle to true 0.</i>", _bodyStyle);
            }
            GUILayout.EndArea();

            // Bottom Prompt
            float bw = 300, bh = 28;
            GUI.Box(new Rect((Screen.width - bw) * 0.5f, Screen.height - 50, bw, bh), "Press [Z] to exit close-up inspection", _panelStyle);
        }

        private static Texture2D MakeTex(int w, int h, Color c)
        {
            var pix = new Color[w * h];
            for (int i = 0; i < pix.Length; i++) pix[i] = c;
            var t = new Texture2D(w, h);
            t.SetPixels(pix);
            t.Apply();
            return t;
        }
    }
}
