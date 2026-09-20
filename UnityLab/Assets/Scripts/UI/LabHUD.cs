using System.Collections.Generic;
using UnityEngine;
using Visora.Experiments.OhmsLaw;
using Visora.Experiments.OhmsLaw.Wiring;

namespace Visora.UI
{
    /// <summary>
    /// Production-grade colorful Virtual Science Laboratory HUD.
    /// Restores the complete side-by-side dashboard (Status, Guided Steps, Observation Table,
    /// Cartesian V-I Graph, and Bottom Toolbar) with responsive virtual-canvas scaling
    /// so elements NEVER overlap or collide regardless of screen resolution or scale.
    /// </summary>
    public class LabHUD : MonoBehaviour
    {
        [SerializeField] private OhmsLawController _controller;
        [SerializeField] private LabObservationTablet _tablet;
        [SerializeField] private InteractiveWiringManager _wiringManager;

        // Default open so user gets the full laboratory interface immediately
        private bool _showHelp = true;
        private bool _showTable = true;
        private bool _isTeacherMode = false; // Phase 1: Student hands-on wiring by default; Teacher Mode on [T]
        private float _notifyTimer = 0f;
        private string _notifyText = "";

        // Design virtual canvas dimensions
        private const float DESIGN_WIDTH = 1220f;
        private const float DESIGN_HEIGHT = 700f;

        // Cached styles & textures
        private GUIStyle _cardStyle, _bannerStyle, _formulaStyle;
        private GUIStyle _titleStyle, _headerStyle, _subStyle, _mutedStyle;
        private GUIStyle _pillGreen, _pillOrange, _pillRed, _pillBlue;
        private GUIStyle _btnPrimary, _btnSecondary, _btnDanger;
        private GUIStyle _reticleStyle;
        private GUIStyle _tblHead, _tblRow, _tblRowAlt;
        private GUIStyle _notifyStyle;

        private Texture2D _texCard, _texBanner, _texFormula, _texGraph;
        private Texture2D _texGreen, _texOrange, _texRed, _texBlue;
        private Texture2D _texBtnPri, _texBtnSec, _texBtnDng;
        private Texture2D _texNotify;

        private void Start()
        {
            FindReferences();
        }

        private void FindReferences()
        {
            if (_controller == null) _controller = FindAnyObjectByType<OhmsLawController>();
            if (_tablet == null) _tablet = FindAnyObjectByType<LabObservationTablet>();
            if (_wiringManager == null) _wiringManager = FindAnyObjectByType<InteractiveWiringManager>();
        }

        private void Update()
        {
            // Toggle help panel
            if (Input.GetKeyDown(KeyCode.H)) _showHelp = !_showHelp;
            // Toggle table panel
            if (Input.GetKeyDown(KeyCode.Tab)) _showTable = !_showTable;

            // Toggle Teacher Mode [T]
            if (Input.GetKeyDown(KeyCode.T))
            {
                _isTeacherMode = !_isTeacherMode;
                ShowNotification(_isTeacherMode ? "👨‍🏫 Teacher Mode: Diagnostic Overrides & Auto-Wire Active" : "🎓 Student Mode: Hands-on Laboratory Wiring Active");
            }

            // Toggle Physics Simulation Mode [M]
            if (Input.GetKeyDown(KeyCode.M))
            {
                if (_controller != null)
                {
                    var newMode = _controller.SimulationMode == PhysicsSimulationMode.Realistic ? PhysicsSimulationMode.Ideal : PhysicsSimulationMode.Realistic;
                    _controller.SetSimulationMode(newMode);
                    ShowNotification($"🔬 Physics Simulation Mode: {newMode.ToString().ToUpper()}");
                }
            }

            // Notification decay
            if (_notifyTimer > 0f) _notifyTimer -= Time.deltaTime;
        }

        public void ShowNotification(string text, float duration = 2.5f)
        {
            _notifyText = text;
            _notifyTimer = duration;
        }

        // ── Style Initialization ──────────────────────────────────────────────

        private void EnsureStyles()
        {
            if (_cardStyle != null) return;

            // High-contrast, rich scientific palette
            _texCard    = MakeGradientTex(64, 64, new Color(0.06f, 0.09f, 0.16f, 0.94f), new Color(0.04f, 0.06f, 0.12f, 0.96f));
            _texBanner  = MakeGradientTex(64, 64, new Color(0.05f, 0.10f, 0.20f, 0.94f), new Color(0.03f, 0.07f, 0.14f, 0.96f));
            _texFormula = MakeGradientTex(64, 64, new Color(0.08f, 0.13f, 0.24f, 0.92f), new Color(0.05f, 0.09f, 0.18f, 0.94f));
            _texGraph   = MakeTex(2, 2, new Color(0.02f, 0.03f, 0.07f, 0.98f));

            _texGreen   = MakeGradientTex(64, 4, new Color(0.00f, 0.88f, 0.46f, 0.95f), new Color(0.00f, 0.72f, 0.38f, 0.95f));
            _texOrange  = MakeGradientTex(64, 4, new Color(1.00f, 0.60f, 0.00f, 0.95f), new Color(0.90f, 0.48f, 0.00f, 0.95f));
            _texRed     = MakeGradientTex(64, 4, new Color(0.98f, 0.24f, 0.20f, 0.95f), new Color(0.85f, 0.16f, 0.14f, 0.95f));
            _texBlue    = MakeGradientTex(64, 4, new Color(0.12f, 0.54f, 1.00f, 0.95f), new Color(0.08f, 0.42f, 0.90f, 0.95f));

            _texBtnPri  = MakeGradientTex(64, 4, new Color(0.12f, 0.54f, 1.00f, 0.95f), new Color(0.06f, 0.40f, 0.88f, 0.98f));
            _texBtnSec  = MakeGradientTex(64, 4, new Color(0.18f, 0.24f, 0.38f, 0.95f), new Color(0.14f, 0.20f, 0.32f, 0.95f));
            _texBtnDng  = MakeGradientTex(64, 4, new Color(0.88f, 0.22f, 0.18f, 0.95f), new Color(0.74f, 0.14f, 0.12f, 0.95f));
            _texNotify  = MakeGradientTex(64, 4, new Color(0.10f, 0.65f, 0.38f, 0.95f), new Color(0.06f, 0.52f, 0.30f, 0.95f));

            _cardStyle = MkBox(_texCard, 12, 8);
            _bannerStyle = MkBox(_texBanner, 14, 6);
            _formulaStyle = MkBox(_texFormula, 10, 6);

            _titleStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 15, fontStyle = FontStyle.Bold, richText = true,
                normal = { textColor = new Color(0.00f, 0.90f, 1.0f) }
            };
            _headerStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 13, fontStyle = FontStyle.Bold, richText = true,
                normal = { textColor = new Color(0.96f, 0.98f, 1.0f) }
            };
            _subStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 11, richText = true,
                normal = { textColor = new Color(0.82f, 0.88f, 0.96f) }
            };
            _mutedStyle = new GUIStyle(GUI.skin.label) {
                fontSize = 10, richText = true,
                normal = { textColor = new Color(0.58f, 0.68f, 0.80f) }
            };

            _pillGreen  = MkPill(_texGreen, new Color(0.02f, 0.12f, 0.05f));
            _pillOrange = MkPill(_texOrange, Color.white);
            _pillRed    = MkPill(_texRed, Color.white);
            _pillBlue   = MkPill(_texBlue, Color.white);

            _btnPrimary   = MkBtn(_texBtnPri);
            _btnSecondary = MkBtn(_texBtnSec);
            _btnDanger    = MkBtn(_texBtnDng);

            _notifyStyle = MkPill(_texNotify, Color.white);
            _reticleStyle = new GUIStyle(GUI.skin.box) {
                normal = { background = MakeTex(2, 2, new Color(0.00f, 0.95f, 1f, 0.90f)) }
            };

            _tblHead = new GUIStyle(GUI.skin.label) {
                fontSize = 11, fontStyle = FontStyle.Bold, richText = true,
                normal = { textColor = new Color(0.35f, 0.85f, 1.0f) }
            };
            _tblRow = new GUIStyle(GUI.skin.label) {
                fontSize = 11, richText = true,
                normal = { textColor = new Color(0.92f, 0.96f, 1.0f) }
            };
            _tblRowAlt = new GUIStyle(GUI.skin.label) {
                fontSize = 11, richText = true,
                normal = { textColor = new Color(0.68f, 0.76f, 0.88f) }
            };
        }

        // ── Main OnGUI ───────────────────────────────────────────────────────

        private void OnGUI()
        {
            EnsureStyles();
            FindReferences();

            // 1. Crosshair reticle (always true screen center)
            float cx = Screen.width * 0.5f, cy = Screen.height * 0.5f;
            GUI.Box(new Rect(cx - 1, cy - 8, 2, 16), GUIContent.none, _reticleStyle);
            GUI.Box(new Rect(cx - 8, cy - 1, 16, 2), GUIContent.none, _reticleStyle);

            // 2. Responsive virtual canvas scaling
            // Ensures everything fits on ANY resolution or aspect ratio without ever colliding!
            Matrix4x4 savedMatrix = GUI.matrix;
            float scale = Mathf.Min(Screen.width / DESIGN_WIDTH, Screen.height / DESIGN_HEIGHT);
            if (scale < 1.0f)
            {
                // Align to top-center if scaled down
                float scaledW = DESIGN_WIDTH * scale;
                float offsetX = (Screen.width - scaledW) * 0.5f;
                GUIUtility.ScaleAroundPivot(new Vector2(scale, scale), Vector2.zero);
                GUI.matrix = Matrix4x4.TRS(new Vector3(offsetX / scale, 0, 0), Quaternion.identity, new Vector3(scale, scale, 1.0f));
            }

            // Draw full HUD dashboard
            DrawWiringBanner();
            DrawStatusCard();
            DrawObservationCard();
            DrawToolbar();
            DrawNotification();

            GUI.matrix = savedMatrix;
        }

        // ── Guided Wiring Banner (Top Center) ─────────────────────────────────

        private void DrawWiringBanner()
        {
            var status = _wiringManager != null ? _wiringManager.CurrentStatus : CircuitTopologyStatus.FullyWired;

            float bw = 700;
            float bh = 54;
            float bx = (DESIGN_WIDTH - bw) * 0.5f;

            GUILayout.BeginArea(new Rect(bx, 10, bw, bh), _bannerStyle);
            GUILayout.BeginHorizontal();
            {
                GUILayout.BeginVertical(GUILayout.Width(bw - 165));
                switch (status)
                {
                    case CircuitTopologyStatus.Unwired:
                        GUILayout.Label("<color=#FFB74D><b>▸ STEP 1/3 — Circuit Unwired (Hands-on Student Lab)</b></color>", _headerStyle);
                        GUILayout.Label("Click binding posts to wire: <b><color=#EF5350>PS(+)</color> → Key → Rheostat → Ammeter(+) → Resistor → <color=#42A5F5>PS(-)</color></b>", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.Incomplete:
                        GUILayout.Label("<color=#FFB74D><b>▸ STEP 1/3 — Complete the Main Series Loop</b></color>", _headerStyle);
                        GUILayout.Label("Continue connecting terminals in series. [Right-Click] post to disconnect wire.", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.SeriesLoopClosed:
                        GUILayout.Label("<color=#4FC3F7><b>▸ STEP 2/3 — Connect Voltmeter in Parallel Across Resistor</b></color>", _headerStyle);
                        GUILayout.Label("Attach parallel leads: <b>Voltmeter(+) ↔ Resistor₁</b> and <b>Voltmeter(-) ↔ Resistor₂</b>", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.FullyWired:
                        GUILayout.Label("<color=#00E676><b>✓ STEP 3/3 — Circuit Verified & Ready for Readings!</b></color>", _headerStyle);
                        GUILayout.Label("Press <b>[K]</b> to insert key, slide rheostat <b>[← →]</b>, then <b>[Space]</b> to log trial.", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.ShortCircuitFault:
                        GUILayout.Label("<color=#EF5350><b>⚠ FAULT — Ammeter Short-Circuit!</b></color>", _headerStyle);
                        GUILayout.Label("Ammeter has near-zero internal resistance. Connect in <b>series</b>, never in parallel.", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.SupplyShortCircuitFault:
                        GUILayout.Label("<color=#EF5350><b>⚠ CRITICAL — Direct Power Supply Short!</b></color>", _headerStyle);
                        GUILayout.Label("Direct short across battery terminals! Overcurrent hazard. Disconnect [Right-Click].", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.VoltmeterInSeriesFault:
                        GUILayout.Label("<color=#FFB74D><b>⚠ FAULT — Voltmeter Connected in Series!</b></color>", _headerStyle);
                        GUILayout.Label("Voltmeter (20 kΩ) chokes current to near zero. Wire in <b>parallel</b> across resistor.", _mutedStyle);
                        break;
                    case CircuitTopologyStatus.ReversedPolarityFault:
                        GUILayout.Label("<color=#FFB74D><b>⚠ FAULT — Meter Polarity Reversed!</b></color>", _headerStyle);
                        GUILayout.Label("Current entering negative terminal. Swap positive (+) and negative (-) leads.", _mutedStyle);
                        break;
                }
                GUILayout.EndVertical();

                GUILayout.BeginVertical(GUILayout.Width(150));
                if (status != CircuitTopologyStatus.FullyWired)
                {
                    if (_isTeacherMode)
                    {
                        if (GUILayout.Button("⚡ Auto-Wire", _btnPrimary, GUILayout.Height(24)))
                            _wiringManager?.TeacherAutoWire();
                    }
                    else
                    {
                        if (GUILayout.Button("🎓 Student Mode", _btnSecondary, GUILayout.Height(24)))
                            ShowNotification("Student Hands-on Mode. Press [T] to enable Teacher Auto-Wire.");
                    }
                }
                else
                {
                    if (GUILayout.Button("↺ Clear Wires", _btnDanger, GUILayout.Height(24)))
                        _wiringManager?.ClearAllWires();
                }
                GUILayout.Label(_isTeacherMode ? "<color=#FFD700>👨‍🏫 Teacher Mode</color>" : "<color=#00E5FF>🎓 Hands-on Lab</color>", _mutedStyle);
                GUILayout.EndVertical();
            }
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // ── Status & Controls Card (Left Side) ───────────────────────────────

        private void DrawStatusCard()
        {
            float cw = 350;
            float ch = _showHelp ? (_isTeacherMode ? 330 : 270) : 95;
            float cx = 16;
            float cy = 72;

            GUILayout.BeginArea(new Rect(cx, cy, cw, ch), _cardStyle);
            {
                GUILayout.BeginHorizontal();
                GUILayout.Label("<b>VISORA • VIRTUAL SCIENCE LAB</b>", _titleStyle);
                GUILayout.FlexibleSpace();
                if (GUILayout.Button(_showHelp ? "▲" : "▼", _btnSecondary, GUILayout.Width(24), GUILayout.Height(18)))
                    _showHelp = !_showHelp;
                GUILayout.EndHorizontal();

                GUILayout.BeginHorizontal();
                GUILayout.Label("Ohm's Law Verification: <b><color=#00E5FF>V = I · R</color></b>", _subStyle);
                GUILayout.FlexibleSpace();
                string modeTag = _isTeacherMode ? "<color=#FFD700><b>[TEACHER]</b></color>" : "<color=#00E676><b>[STUDENT]</b></color>";
                if (GUILayout.Button(modeTag, _mutedStyle, GUILayout.Width(80), GUILayout.Height(16)))
                {
                    _isTeacherMode = !_isTeacherMode;
                    ShowNotification(_isTeacherMode ? "👨‍🏫 Teacher Mode Activated" : "🎓 Student Mode Activated");
                }
                GUILayout.EndHorizontal();
                GUILayout.Space(3);

                bool isWired = _controller != null && _controller.IsWiringComplete;
                bool isClosed = _controller != null && _controller.IsSwitchClosed;
                float v = _controller != null ? _controller.CurrentVoltage : 0f;
                float i = _controller != null ? _controller.CurrentCurrent : 0f;
                float p = v * i;

                if (!isWired)
                {
                    GUILayout.Box("CIRCUIT INCOMPLETE — WIRE APPARATUS", _pillRed, GUILayout.Height(22));
                }
                else if (_controller != null && _controller.Model != null && _controller.Model.IsFuseTripped)
                {
                    GUILayout.BeginHorizontal();
                    GUILayout.Box("⚠ FUSE OVERLOAD (>5A) TRIPPED!", _pillRed, GUILayout.Height(22));
                    if (GUILayout.Button("Reset Fuse", _btnPrimary, GUILayout.Width(85), GUILayout.Height(22)))
                    {
                        _controller.Model.ResetFuse();
                        ShowNotification("✓ Circuit Fuse Reset!");
                    }
                    GUILayout.EndHorizontal();
                }
                else if (isClosed)
                {
                    GUILayout.Box($"● LIVE: {v:F2} V  |  {i:F3} A  |  P = {p:F3} W", _pillGreen, GUILayout.Height(22));
                }
                else
                {
                    GUILayout.Box("○ OPEN: Insert Plug Key [K] to energize", _pillOrange, GUILayout.Height(22));
                }

                if (_showHelp)
                {
                    GUILayout.Space(4);
                    float rheoR = _controller != null ? _controller.RheostatResistance : 5.0f;
                    string physMode = _controller != null ? _controller.SimulationMode.ToString() : "Realistic";
                    GUILayout.Label($"Rheostat: <b><color=#FFD700>{rheoR:F1} Ω</color></b>  •  Physics: <b><color=#00E5FF>{physMode}</color></b>", _subStyle);

                    if (_isTeacherMode)
                    {
                        GUILayout.BeginVertical(_formulaStyle);
                        GUILayout.Label("<b>👨‍🏫 Teacher Diagnostics & Circuit Overrides:</b>", _subStyle);
                        float E = _controller != null && _controller.Model != null ? _controller.Model.BatteryEmf : 4.5f;
                        GUILayout.Label($"• Source EMF: <b>{E:F2} V</b>  |  Internal R: <b>0.25 Ω</b>  |  Wire: <b>0.04 Ω</b>", _mutedStyle);
                        GUILayout.Label($"• Ammeter: <b>0.05 Ω</b>  |  Voltmeter: <b>20.0 kΩ</b>  |  Temp: <b>25.0 °C</b>", _mutedStyle);
                        GUILayout.BeginHorizontal();
                        if (GUILayout.Button($"Toggle Mode [{physMode}]", _btnSecondary, GUILayout.Height(20)))
                        {
                            var target = _controller.SimulationMode == PhysicsSimulationMode.Realistic ? PhysicsSimulationMode.Ideal : PhysicsSimulationMode.Realistic;
                            _controller.SetSimulationMode(target);
                            ShowNotification($"Simulation Mode set to {target}");
                        }
                        if (GUILayout.Button("Auto-Wire", _btnPrimary, GUILayout.Width(80), GUILayout.Height(20)))
                            _wiringManager?.TeacherAutoWire();
                        if (GUILayout.Button("Clear", _btnDanger, GUILayout.Width(60), GUILayout.Height(20)))
                            _wiringManager?.ClearAllWires();
                        GUILayout.EndHorizontal();
                        GUILayout.EndVertical();
                    }

                    GUILayout.Space(3);
                    GUILayout.Label("<b><color=#4FC3F7>Keybindings:</color></b>", _subStyle);
                    GUILayout.Label("  <color=#81D4FA>[WASD]</color> Walk    <color=#81D4FA>[Mouse / R-Click]</color> Look", _subStyle);
                    GUILayout.Label("  <color=#A5D6A7>[Left Click / E]</color> Wire Terminal    <color=#EF5350>[Right Click]</color> Disconnect Wire", _subStyle);
                    GUILayout.Label("  <color=#FFE082>[K]</color> Plug Key    <color=#FFE082>[← →]</color> Rheostat    <color=#CE93D8>[Space]</color> Log Trial", _subStyle);
                    GUILayout.Label("  <color=#CE93D8>[Tab]</color> Ledger    <color=#FFD700>[T]</color> Teacher Mode    <color=#80CBC4>[M]</color> Physics Mode", _subStyle);
                    GUILayout.Label("  <color=#80CBC4>[R]</color> Reset Lab    <color=#80CBC4>[Alt/Esc]</color> Unlock Cursor", _subStyle);
                }
            }
            GUILayout.EndArea();
        }

        // ── Observation Table & V-I Graph Card (Right Side) ──────────────────

        private void DrawObservationCard()
        {
            float cw = 490;
            float ch = _showTable ? 545 : 36;
            float cx = DESIGN_WIDTH - cw - 14;
            float cy = 72;

            if (!_showTable)
            {
                if (GUI.Button(new Rect(cx, cy, cw, ch), "📋 Show Observation Table & Graph [Tab]", _btnSecondary))
                    _showTable = true;
                return;
            }

            GUILayout.BeginArea(new Rect(cx, cy, cw, ch), _cardStyle);
            {
                GUILayout.BeginHorizontal();
                GUILayout.Label("<b><color=#00E5FF>OBSERVATION TABLE & V-I GRAPH</color></b>", _headerStyle);
                GUILayout.FlexibleSpace();
                if (GUILayout.Button("✕", _btnSecondary, GUILayout.Width(24), GUILayout.Height(18)))
                    _showTable = false;
                GUILayout.EndHorizontal();

                float stdR = _controller != null ? _controller.ResistanceValue : 10f;
                float rheoVal = _controller != null ? _controller.RheostatResistance : 5f;
                GUILayout.Label($"Resistor: <b><color=#FFD700>{stdR:F1} Ω</color></b>  •  Rheostat: <b><color=#FFB74D>{rheoVal:F1} Ω</color></b>  •  <b><color=#00E5FF>V = I · R</color></b>", _subStyle);
                GUILayout.Space(3);

                // Table Header: Trial, V, I, R = V/I, P, Remarks
                GUILayout.BeginHorizontal();
                GUILayout.Label("<b>#</b>", _tblHead, GUILayout.Width(24));
                GUILayout.Label("<b>V (V)</b>", _tblHead, GUILayout.Width(72));
                GUILayout.Label("<b>I (A)</b>", _tblHead, GUILayout.Width(72));
                GUILayout.Label("<b>R = V/I (Ω)</b>", _tblHead, GUILayout.Width(84));
                GUILayout.Label("<b>P (W)</b>", _tblHead, GUILayout.Width(68));
                GUILayout.Label("<b>Remarks</b>", _tblHead, GUILayout.Width(120));
                GUILayout.EndHorizontal();
                DrawLine(new Color(0.20f, 0.45f, 0.70f, 0.5f));

                var obs = _tablet != null ? _tablet.Observations : null;
                int count = obs != null ? obs.Count : 0;

                for (int idx = 0; idx < 6; idx++)
                {
                    GUILayout.BeginHorizontal();
                    if (idx < count)
                    {
                        var o = obs[idx];
                        var s = (idx % 2 == 0) ? _tblRow : _tblRowAlt;
                        GUILayout.Label($" {o.Trial}", s, GUILayout.Width(24));
                        GUILayout.Label($"<color=#00E676>{o.Voltage:F2}</color>", s, GUILayout.Width(72));
                        GUILayout.Label($"<color=#2979FF>{o.Current:F3}</color>", s, GUILayout.Width(72));
                        GUILayout.Label($"<color=#FFD700>{o.Resistance:F2}</color>", s, GUILayout.Width(84));
                        GUILayout.Label($"<color=#FF8A80>{o.Power:F3}</color>", s, GUILayout.Width(68));
                        GUILayout.Label($"<color=#80CBC4>{o.Remarks}</color>", s, GUILayout.Width(120));
                    }
                    else
                    {
                        GUILayout.Label($" {idx + 1}", _tblRowAlt, GUILayout.Width(24));
                        GUILayout.Label("—", _tblRowAlt, GUILayout.Width(72));
                        GUILayout.Label("—", _tblRowAlt, GUILayout.Width(72));
                        GUILayout.Label("—", _tblRowAlt, GUILayout.Width(84));
                        GUILayout.Label("—", _tblRowAlt, GUILayout.Width(68));
                        GUILayout.Label("<color=#616161>Awaiting Trial</color>", _mutedStyle, GUILayout.Width(120));
                    }
                    GUILayout.EndHorizontal();
                }

                GUILayout.Space(4);

                // Cartesian Graph
                DrawCartesianGraph(obs, stdR);

                GUILayout.Space(3);

                // Linear Regression & Verification Box
                GUILayout.BeginVertical(_formulaStyle);
                if (_tablet != null && count >= 5)
                {
                    float slope = _tablet.CalculateRegressionSlope();
                    float meanR = _tablet.CalculateMeanResistance();
                    float err = _tablet.CalculatePercentageError(stdR);
                    GUILayout.Label($"<b>✓ EXPERIMENTAL PROOF: Slope R = ΔV / ΔI = <color=#00E5FF>{slope:F2} Ω</color></b>", _headerStyle);
                    GUILayout.Label($"Mean R = <color=#FFD700>{meanR:F2} Ω</color>  •  Nominal: <color=#FFD700>{stdR:F1} Ω</color>  •  Error: <color=#00E676>{err:F1}%</color>", _subStyle);
                    if (err < 5.0f)
                    {
                        GUILayout.Box("✓ OHM'S LAW VERIFIED: V ∝ I (CONSTANT RESISTANCE)", _pillGreen, GUILayout.Height(20));
                    }
                    else
                    {
                        GUILayout.Box($"⚠ TOLERANCE DEVIATION ({err:F1}%) — SWEEP BROADER RHEOSTAT RANGE", _pillOrange, GUILayout.Height(20));
                    }
                }
                else if (_tablet != null && count >= 2)
                {
                    float slope = _tablet.CalculateRegressionSlope();
                    float err = _tablet.CalculatePercentageError(stdR);
                    GUILayout.Label($"<b>Preliminary Slope: R = ΔV / ΔI = <color=#00E5FF>{slope:F2} Ω</color></b>", _headerStyle);
                    GUILayout.Label($"<color=#FFB74D>● Progress: {count}/5 points recorded</color> (Need 5 for official CBSE/Lab proof)", _subStyle);
                    GUILayout.Label($"Adjust rheostat slider <b>[← →]</b> and record {5 - count} more readings.", _mutedStyle);
                }
                else if (count == 1)
                {
                    GUILayout.Label($"Trial 1 recorded: R = {obs[0].Resistance:F2} Ω. Adjust rheostat to record 4 more trials.", _subStyle);
                }
                else
                {
                    GUILayout.Label("<b>Ohm's Law:</b> V = I · R  ⟹  R = V / I = <i>constant</i>", _subStyle);
                    GUILayout.Label("<i>Wire apparatus, insert key [K], slide rheostat [← →], and press [Space] to record.</i>", _mutedStyle);
                }
                GUILayout.EndVertical();

                GUILayout.Space(3);

                // Action Buttons
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("● Record Trial [Space]", _btnPrimary, GUILayout.Height(25)))
                    RecordObservation();
                GUILayout.Space(4);
                if (GUILayout.Button("Clear Ledger", _btnSecondary, GUILayout.Width(100), GUILayout.Height(25)))
                    _tablet?.ResetObservations();
                GUILayout.EndHorizontal();
            }
            GUILayout.EndArea();
        }

        // ── Cartesian V-I Graph ──────────────────────────────────────────────

        private void DrawCartesianGraph(IReadOnlyList<LabObservationTablet.Observation> obs, float stdR)
        {
            float gw = 464, gh = 110;
            var r = GUILayoutUtility.GetRect(gw, gh);
            GUI.DrawTexture(r, _texGraph);

            float px = r.x + 36, py = r.y + 6;
            float pw = r.width - 48, ph = r.height - 24;
            float maxI = 0.50f, maxV = 5.0f;

            Color grid = new Color(0.18f, 0.32f, 0.48f, 0.30f);
            Color axis = new Color(0.35f, 0.75f, 1f, 0.65f);

            // Grid lines
            for (int s = 1; s <= 4; s++)
            {
                float fx = s / 4f;
                DrawGuiLine(new Vector2(px + fx * pw, py), new Vector2(px + fx * pw, py + ph), grid, 1f);
                DrawGuiLine(new Vector2(px, py + ph - fx * ph), new Vector2(px + pw, py + ph - fx * ph), grid, 1f);
            }

            // Axes
            DrawGuiLine(new Vector2(px, py + ph), new Vector2(px + pw, py + ph), axis, 1.5f);
            DrawGuiLine(new Vector2(px, py), new Vector2(px, py + ph), axis, 1.5f);

            // Labels
            GUI.Label(new Rect(r.x + 2, py - 3, 32, 14), "<color=#00E5FF>V(V)</color>", _mutedStyle);
            GUI.Label(new Rect(px + pw - 20, py + ph + 3, 30, 14), "<color=#00E5FF>I(A)</color>", _mutedStyle);
            GUI.Label(new Rect(px - 8, py + ph + 2, 12, 14), "0", _mutedStyle);

            // Scale limits
            GUI.Label(new Rect(px - 22, py - 3, 20, 14), $"{maxV:F0}", _mutedStyle);
            GUI.Label(new Rect(px + pw - 6, py + ph + 3, 28, 14), $"{maxI:F1}", _mutedStyle);

            // Theoretical line: V = R · I (Cyan)
            float lineMaxI = Mathf.Min(maxI, maxV / stdR);
            Vector2 o = new Vector2(px, py + ph);
            Vector2 e = new Vector2(px + (lineMaxI / maxI) * pw, py + ph - (lineMaxI * stdR / maxV) * ph);
            DrawGuiLine(o, e, new Color(0.00f, 0.85f, 1f, 0.45f), 1.5f);

            // Best-fit Experimental Regression Line (Bright Golden)
            if (obs != null && obs.Count >= 2 && _tablet != null)
            {
                float regSlope = _tablet.CalculateRegressionSlope();
                if (regSlope > 0.001f)
                {
                    float regMaxI = Mathf.Min(maxI, maxV / regSlope);
                    Vector2 regE = new Vector2(px + (regMaxI / maxI) * pw, py + ph - (regMaxI * regSlope / maxV) * ph);
                    DrawGuiLine(o, regE, new Color(1.0f, 0.84f, 0.0f, 0.90f), 2.0f);
                }
            }

            // Plotted data points
            if (obs != null)
            {
                for (int i = 0; i < obs.Count; i++)
                {
                    var pt = obs[i];
                    float dx = px + (pt.Current / maxI) * pw;
                    float dy = py + ph - (pt.Voltage / maxV) * ph;

                    Color mc = new Color(1f, 0.85f, 0.00f);
                    GUI.DrawTexture(new Rect(dx - 3, dy - 3, 6, 6), _texOrange);
                    DrawGuiLine(new Vector2(dx - 4, dy), new Vector2(dx + 4, dy), mc, 1.5f);
                    DrawGuiLine(new Vector2(dx, dy - 4), new Vector2(dx, dy + 4), mc, 1.5f);

                    // Point index label (T1, T2, etc.)
                    GUI.Label(new Rect(dx + 4, dy - 12, 18, 14), $"<color=#FFD700>T{pt.Trial}</color>", _mutedStyle);
                }
            }
        }

        // ── Bottom Toolbar ───────────────────────────────────────────────────

        private void DrawToolbar()
        {
            float tw = 720;
            float th = 42;
            float tx = (DESIGN_WIDTH - tw) * 0.5f;
            float ty = DESIGN_HEIGHT - th - 12;

            GUILayout.BeginArea(new Rect(tx, ty, tw, th), _cardStyle);
            GUILayout.BeginHorizontal();
            {
                bool isClosed = _controller != null && _controller.IsSwitchClosed;

                if (GUILayout.Button(isClosed ? "🔓 Remove Key [K]" : "🔑 Insert Key [K]",
                    isClosed ? _btnSecondary : _btnPrimary, GUILayout.Width(130), GUILayout.Height(26)))
                    _controller?.ToggleSwitch();

                GUILayout.Space(4);
                if (GUILayout.Button("◀", _btnSecondary, GUILayout.Width(26), GUILayout.Height(26)))
                    if (_controller != null) _controller.SetVoltage(_controller.CurrentVoltage - 0.25f);

                float curV = _controller != null ? _controller.CurrentVoltage : 3f;
                GUILayout.Label($"<b><color=#00E5FF>{curV:F2}</color> V</b>", _headerStyle, GUILayout.Width(54));

                if (GUILayout.Button("▶", _btnSecondary, GUILayout.Width(26), GUILayout.Height(26)))
                    if (_controller != null) _controller.SetVoltage(_controller.CurrentVoltage + 0.25f);

                GUILayout.Space(4);
                if (GUILayout.Button("● Record [Space]", _btnPrimary, GUILayout.Width(125), GUILayout.Height(26)))
                    RecordObservation();

                GUILayout.Space(4);
                if (_isTeacherMode)
                {
                    if (GUILayout.Button("⚡ Auto-Wire", _btnSecondary, GUILayout.Width(92), GUILayout.Height(26)))
                        _wiringManager?.TeacherAutoWire();

                    string pMode = _controller != null ? _controller.SimulationMode.ToString() : "Realistic";
                    if (GUILayout.Button($"🔬 {pMode}", _btnSecondary, GUILayout.Width(90), GUILayout.Height(26)))
                    {
                        var tgt = _controller.SimulationMode == PhysicsSimulationMode.Realistic ? PhysicsSimulationMode.Ideal : PhysicsSimulationMode.Realistic;
                        _controller.SetSimulationMode(tgt);
                        ShowNotification($"Physics Mode: {tgt}");
                    }
                }
                else
                {
                    if (GUILayout.Button("👨‍🏫 Teacher [T]", _btnSecondary, GUILayout.Width(92), GUILayout.Height(26)))
                    {
                        _isTeacherMode = true;
                        ShowNotification("Teacher Mode Enabled");
                    }
                }

                if (GUILayout.Button("↺ Reset [R]", _btnSecondary, GUILayout.Width(84), GUILayout.Height(26)))
                {
                    _controller?.ResetCircuit();
                    _tablet?.ResetObservations();
                }
            }
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // ── Toast Notification ───────────────────────────────────────────────

        private void DrawNotification()
        {
            if (_notifyTimer <= 0f) return;
            float alpha = Mathf.Clamp01(_notifyTimer);
            var prev = GUI.color;
            GUI.color = new Color(1, 1, 1, alpha);
            float nw = 380, nh = 26;
            GUI.Box(new Rect((DESIGN_WIDTH - nw) * 0.5f, DESIGN_HEIGHT - 88, nw, nh), _notifyText, _notifyStyle);
            GUI.color = prev;
        }

        // ── Recording Logic ──────────────────────────────────────────────────

        private void RecordObservation()
        {
            if (_controller == null || !_controller.IsWiringComplete)
            {
                ShowNotification("⚠ Complete circuit wiring first!");
                return;
            }
            if (!_controller.IsSwitchClosed)
            {
                ShowNotification("⚠ Insert Plug Key [K] first!");
                return;
            }
            _controller.RecordReading();
            _tablet?.RecordCurrentObservation();
            ShowNotification("✓ Trial recorded successfully!");
        }

        // ── Utility Methods ──────────────────────────────────────────────────

        private static void DrawLine(Color c)
        {
            var r = GUILayoutUtility.GetRect(GUIContent.none, GUIStyle.none, GUILayout.Height(1));
            var prev = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, Texture2D.whiteTexture);
            GUI.color = prev;
        }

        private static void DrawGuiLine(Vector2 a, Vector2 b, Color color, float width)
        {
            var mat = GUI.matrix;
            float angle = Vector2.SignedAngle(Vector2.right, b - a);
            float length = Vector2.Distance(a, b);
            GUIUtility.RotateAroundPivot(angle, a);
            var prev = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(new Rect(a.x, a.y - width * 0.5f, length, width), Texture2D.whiteTexture);
            GUI.color = prev;
            GUI.matrix = mat;
        }

        private static GUIStyle MkBox(Texture2D bg, int pad, int vpad)
        {
            return new GUIStyle(GUI.skin.box) {
                normal = { background = bg },
                padding = new RectOffset(pad, pad, vpad, vpad),
                alignment = TextAnchor.UpperLeft
            };
        }

        private static GUIStyle MkPill(Texture2D bg, Color textCol)
        {
            return new GUIStyle(GUI.skin.box) {
                normal = { background = bg, textColor = textCol },
                fontStyle = FontStyle.Bold, fontSize = 11, richText = true,
                alignment = TextAnchor.MiddleCenter
            };
        }

        private static GUIStyle MkBtn(Texture2D bg)
        {
            return new GUIStyle(GUI.skin.button) {
                normal = { background = bg, textColor = Color.white },
                hover = { background = bg, textColor = Color.white },
                active = { background = bg, textColor = Color.white },
                fontStyle = FontStyle.Bold, fontSize = 11, richText = true
            };
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

        private static Texture2D MakeGradientTex(int w, int h, Color top, Color bot)
        {
            var pix = new Color[w * h];
            for (int y = 0; y < h; y++)
            {
                Color c = Color.Lerp(bot, top, y / (float)(h - 1));
                for (int x = 0; x < w; x++)
                    pix[y * w + x] = c;
            }
            var t = new Texture2D(w, h);
            t.SetPixels(pix);
            t.Apply();
            return t;
        }
    }
}
