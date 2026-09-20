using System.Collections.Generic;
using UnityEngine;
using Visora.Experiments.Framework;
using Visora.UI;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Controller for the Ohm's Law experiment ($V = I \cdot R$).
    /// Features self-healing apparatus initialization, verified mathematical modeling,
    /// seamless hotkeys, and real-time telemetry synchronization.
    /// </summary>
    public class OhmsLawController : ExperimentController
    {
        [Header("Ohm's Law Configuration")]
        [SerializeField] private float _resistanceValue = 10.0f; // Standard Resistor: 10.0 Ω

        [Header("Circuit State")]
        [SerializeField] private bool _switchClosed = false;
        [SerializeField] private bool _isWiringComplete = false;
        [SerializeField] private float _currentVoltage = 3.0f;   // Default 3.0 V
        [SerializeField] private float _currentCurrent = 0.0f;   // In Amperes
        [SerializeField] private float _currentPower   = 0.0f;   // In Watts
        [SerializeField] private float _rheostatResistance = 5.0f; // In Ohms (0 to 20Ω)

        [Header("Circuit Components")]
        [SerializeField] private OhmsLawVisualization _visualization;

        // Scientific first-principles model
        private OhmsLawModel _model;

        // Events
        public event System.Action<float, float> OnCircuitUpdated; // voltage, current
        public event System.Action<bool> OnSwitchToggled;

        public float CurrentVoltage => _currentVoltage;
        public float CurrentCurrent => _currentCurrent;
        public float ResistanceValue => _resistanceValue;
        public float RheostatResistance => _rheostatResistance;
        public bool IsSwitchClosed => _switchClosed;
        public bool IsWiringComplete => _isWiringComplete;
        public OhmsLawModel Model => _model;

        public PhysicsSimulationMode SimulationMode
        {
            get => _model != null ? _model.Mode : PhysicsSimulationMode.Realistic;
            set
            {
                if (_model != null)
                {
                    _model.Mode = value;
                    if (_switchClosed) Recalculate();
                }
            }
        }

        public void SetSimulationMode(PhysicsSimulationMode mode)
        {
            SimulationMode = mode;
        }

        public void SetWiringComplete(bool complete)
        {
            _isWiringComplete = complete;
            if (_switchClosed)
            {
                Recalculate();
            }
        }

        public void SetRheostatResistance(float r)
        {
            _rheostatResistance = Mathf.Clamp(r, 0f, 20.0f);
            if (_switchClosed)
            {
                Recalculate();
            }
        }

        private void Awake()
        {
            OhmsLawLabAutoHealer.SanitizeAndHealScene();
            CleanLegacyPlaceholders();
            EnsureApparatusBuilt();
        }

        protected override void Start()
        {
            OhmsLawLabAutoHealer.SanitizeAndHealScene();

            // Initialize scientific model unconditionally (zero dependency on ScriptableObjects)
            _model = new OhmsLawModel();
            _model.Mode = PhysicsSimulationMode.Realistic;

            // Set running state immediately (circuit starts unwired for the student)
            CurrentState = ExperimentState.Running;
            _isWiringComplete = false;

            // Ensure visualization references
            if (_visualization == null) _visualization = GetComponent<OhmsLawVisualization>();
            if (_visualization == null) _visualization = FindAnyObjectByType<OhmsLawVisualization>();
            _visualization?.ResolveReferencesIfNull();
            _visualization?.UpdateVisualization(_switchClosed ? _currentVoltage : 0f, _switchClosed ? _currentCurrent : 0f, _resistanceValue, _switchClosed);

            Debug.Log($"[OhmsLawController] Scientific circuit online. Resistor: {_resistanceValue:F1} Ω, Default V: {_currentVoltage:F2} V");
        }

        private void Update()
        {
            HandleGlobalHotkeys();
        }

        private void HandleGlobalHotkeys()
        {
            // [K] toggles plug key switch directly
            if (Input.GetKeyDown(KeyCode.K))
            {
                ToggleSwitch();
            }

            // [Space] records trial reading to observation table
            if (Input.GetKeyDown(KeyCode.Space))
            {
                RecordReading();
            }

            // Arrow keys adjust voltage quickly
            if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.UpArrow))
            {
                SetVoltage(_currentVoltage + 1.2f * Time.deltaTime);
            }
            else if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.DownArrow))
            {
                SetVoltage(_currentVoltage - 1.2f * Time.deltaTime);
            }

            // [R] resets experiment
            if (Input.GetKeyDown(KeyCode.R))
            {
                ResetCircuit();
            }
        }

        /// <summary>
        /// Adjust voltage via sliding rheostat.
        /// </summary>
        public void SetVoltage(float voltage)
        {
            _currentVoltage = Mathf.Clamp(voltage, 0f, 5.0f);

            if (_switchClosed)
            {
                Recalculate();
            }
            else
            {
                OnCircuitUpdated?.Invoke(_currentVoltage, 0f);
            }
        }

        /// <summary>
        /// Toggle plug key to close or open circuit.
        /// </summary>
        public void ToggleSwitch()
        {
            _switchClosed = !_switchClosed;
            OnSwitchToggled?.Invoke(_switchClosed);

            if (_switchClosed)
            {
                Recalculate();
            }
            else
            {
                _currentCurrent = 0f;
                _currentPower = 0f;
                OnCircuitUpdated?.Invoke(_currentVoltage, 0f);
                _visualization?.UpdateVisualization(0f, 0f, _resistanceValue, false);
            }

            Debug.Log($"[OhmsLaw] Circuit {(_switchClosed ? "CLOSED" : "OPEN")} | V = {_currentVoltage:F2}V | I = {_currentCurrent:F3}A");
        }

        public void SetSwitchState(bool closed)
        {
            if (_switchClosed != closed)
            {
                ToggleSwitch();
            }
        }

        public void SetResistance(float resistance)
        {
            _resistanceValue = Mathf.Clamp(resistance, 1.0f, 100.0f);
            if (_switchClosed) Recalculate();
        }

        public void RecordReading()
        {
            if (!_switchClosed)
            {
                Debug.LogWarning("[OhmsLaw] Cannot record: Plug key is not inserted (circuit is open). Press [E] or [K] first.");
                return;
            }

            RecordDataPoint(_currentVoltage, _currentCurrent);

            // Notify observation tablet if present
            var tablet = FindAnyObjectByType<LabObservationTablet>();
            if (tablet != null)
            {
                tablet.RecordCurrentObservation();
            }

            Debug.Log($"[OhmsLaw] Reading recorded: V = {_currentVoltage:F2} V, I = {_currentCurrent:F3} A (Point #{_collectedData.Count})");
        }

        public void ResetCircuit()
        {
            _switchClosed = false;
            _currentVoltage = 3.0f;
            _currentCurrent = 0f;
            _currentPower = 0f;
            _collectedData.Clear();

            OnSwitchToggled?.Invoke(false);
            OnCircuitUpdated?.Invoke(_currentVoltage, 0f);
            _visualization?.UpdateVisualization(0f, 0f, _resistanceValue, false);

            var tablet = FindAnyObjectByType<LabObservationTablet>();
            tablet?.ResetObservations();
        }

        public override void ResetExperiment()
        {
            ResetCircuit();
        }

        /// <summary>
        /// Calculates experimental resistance from collected (V, I) data points using least-squares linear regression:
        /// R = Σ(Vi * Ii) / Σ(Ii^2).
        /// </summary>
        public float CalculateResistanceFromData()
        {
            if (_collectedData.Count < 2) return 0f;

            float sumVI = 0f;
            float sumI2 = 0f;

            foreach (var pt in _collectedData)
            {
                float V = pt.x;
                float I = pt.y;
                sumVI += V * I;
                sumI2 += I * I;
            }

            if (sumI2 < 0.00001f) return 0f;
            float calculatedR = sumVI / sumI2;
            float error = Mathf.Abs(calculatedR - _resistanceValue) / _resistanceValue * 100f;

            UpdateMeasurement("calculatedResistance", calculatedR);
            UpdateMeasurement("percentageError", error);

            return calculatedR;
        }

        protected override void Recalculate()
        {
            if (!_switchClosed || !_isWiringComplete)
            {
                _currentCurrent = 0f;
                _currentPower = 0f;
                UpdateMeasurement("voltage", _switchClosed ? _currentVoltage : 0f);
                UpdateMeasurement("current", 0f);
                UpdateMeasurement("power", 0f);
                OnCircuitUpdated?.Invoke(_currentVoltage, 0f);
                if (_visualization == null) _visualization = FindAnyObjectByType<OhmsLawVisualization>();
                _visualization?.UpdateVisualization(0f, 0f, _resistanceValue, false);
                return;
            }

            // Analytical first-principles calculation:
            // In Realistic Mode, uses the exact user-specified formula:
            //   R_load = (R_resistor * R_voltmeter) / (R_resistor + R_voltmeter)
            //   I_total = E / (R_battery + R_wire + R_ammeter + R_rheostat + R_load)
            //   V_resistor = I_total * R_load
            //   I_resistor = V_resistor / R_resistor
            //   I_voltmeter = V_resistor / R_voltmeter
            //   P_resistor = I_resistor^2 * R_resistor
            if (_model != null && _model.Mode == PhysicsSimulationMode.Realistic)
            {
                var state = _model.ComputeRealisticCircuit(_rheostatResistance, _resistanceValue, _switchClosed);
                _currentCurrent = state.TotalCurrent;     // Ammeter measures total loop current
                _currentVoltage = state.ResistorVoltage;  // Voltmeter measures potential difference across parallel load
                _currentPower   = state.ResistorPower;    // Resistor dissipation
            }
            else if (_model != null)
            {
                var result = _model.Compute(new float[] { _currentVoltage, _resistanceValue });
                _currentCurrent = result.Outputs[0];
                _currentPower   = result.Outputs[1];
            }
            else
            {
                _currentCurrent = _currentVoltage / _resistanceValue;
                _currentPower   = _currentVoltage * _currentCurrent;
            }

            // Update measurements
            UpdateMeasurement("voltage", _currentVoltage);
            UpdateMeasurement("current", _currentCurrent);
            UpdateMeasurement("power",   _currentPower);

            // Dispatch events
            OnCircuitUpdated?.Invoke(_currentVoltage, _currentCurrent);

            // Drive physical instruments
            if (_visualization == null) _visualization = FindAnyObjectByType<OhmsLawVisualization>();
            _visualization?.UpdateVisualization(_currentVoltage, _currentCurrent, _resistanceValue, _switchClosed);
        }

        // ── Self-Healing Scene Setup ──────────────────────────────────────────

        private void CleanLegacyPlaceholders()
        {
            // Detect and remove legacy placeholder primitives that were floating off the workbench
            string[] legacyNames = { "Battery", "CircuitSwitch" };
            foreach (var name in legacyNames)
            {
                var go = GameObject.Find(name);
                if (go != null)
                {
                    Debug.Log($"[OhmsLaw] Removing legacy placeholder '{name}'");
                    DestroyImmediate(go);
                }
            }

            // Check if there are untextured meters without face assemblies
            foreach (var meterName in new string[] { "Voltmeter", "Ammeter", "Rheostat" })
            {
                var found = GameObject.Find(meterName);
                if (found != null && found.transform.Find("FaceAssembly") == null && found.transform.Find("SliderAssembly") == null)
                {
                    Debug.Log($"[OhmsLaw] Removing untextured legacy meter '{meterName}'");
                    DestroyImmediate(found);
                }
            }
        }

        private void EnsureApparatusBuilt()
        {
            // Verify if photorealistic apparatus exists
            var existingKey = FindAnyObjectByType<SwitchInteractable>();
            if (existingKey == null)
            {
                Debug.Log("[OhmsLaw] Apparatus not detected in scene. Auto-constructing photorealistic 3D apparatus...");
                Transform apparatusParent = transform.parent != null ? transform.parent : transform;
                var refs = OhmsLawApparatusBuilder.BuildApparatus(apparatusParent, this);

                if (_visualization == null)
                {
                    _visualization = GetComponent<OhmsLawVisualization>();
                    if (_visualization == null) _visualization = gameObject.AddComponent<OhmsLawVisualization>();
                }

                _visualization.ConfigureApparatus(
                    refs.AmmeterNeedle,
                    refs.VoltmeterNeedle,
                    refs.RheostatSlider,
                    refs.SwitchPlug,
                    refs.ResistorRenderer
                );

                // Build Observation Tablet if missing
                if (FindAnyObjectByType<LabObservationTablet>() == null)
                {
                    LabObservationTablet.BuildTablet(
                        apparatusParent,
                        new Vector3(0.80f, 0.905f, 2.70f),
                        Quaternion.Euler(0, -20f, 0),
                        this
                    );
                }
            }
            else
            {
                if (_visualization == null)
                {
                    _visualization = GetComponent<OhmsLawVisualization>();
                    if (_visualization == null) _visualization = FindAnyObjectByType<OhmsLawVisualization>();
                    if (_visualization == null) _visualization = gameObject.AddComponent<OhmsLawVisualization>();
                }
                _visualization.ResolveReferencesIfNull();
            }
        }
    }
}
