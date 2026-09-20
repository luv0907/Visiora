using UnityEngine;
using Visora.Experiments.Framework;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Scientific model for Ohm's Law: V = IR
    /// 
    /// GOVERNING EQUATION:
    ///   V = I × R
    ///   where:
    ///     V = Potential difference (Volts, V)
    ///     I = Electric current (Amperes, A)
    ///     R = Resistance (Ohms, Ω)
    /// 
    /// ASSUMPTIONS:
    ///   1. Ohmic conductor (resistance is constant, independent of V and I)
    ///   2. Constant temperature (resistance changes with temperature in reality)
    ///   3. DC circuit (no AC frequency effects)
    ///   4. Ideal ammeter (zero internal resistance)
    ///   5. Ideal voltmeter (infinite internal resistance)
    ///   6. Negligible wire resistance
    ///   7. Ideal battery (constant EMF, negligible internal resistance)
    /// 
    /// VALID OPERATING RANGE:
    ///   Voltage: 0 – 10 V (typical school lab battery/cell)
    ///   Current: 0 – 5 A (safe for school lab)
    ///   Resistance: 1 – 100 Ω (standard lab resistors)
    /// 
    /// UNITS: All SI
    ///   V → Volts (V = kg⋅m²⋅s⁻³⋅A⁻¹)
    ///   I → Amperes (A)
    ///   R → Ohms (Ω = V/A)
    /// 
    /// VALIDATION:
    ///   For a known resistance R, measure V and I at multiple points.
    ///   Plot V vs I → should be linear with slope = R.
    ///   R_calculated = V/I should match R_actual within 5%.
    /// </summary>
    public enum PhysicsSimulationMode
    {
        Ideal,      // Ideal Ohm's Law (I = V / R)
        Realistic   // Complete circuit model with battery EMF, internal resistances, voltmeter shunting, tolerance, heating
    }

    /// <summary>
    /// Ground-truth electrical state of the Ohm's Law circuit.
    /// </summary>
    public struct OhmsLawCircuitState
    {
        public float TotalCurrent;        // I_total (Ammeter reading)
        public float ResistorVoltage;     // V_resistor (Voltmeter reading)
        public float ResistorCurrent;     // I_resistor
        public float VoltmeterCurrent;    // I_voltmeter
        public float ResistorPower;       // P_resistor = I_resistor^2 * R_resistor
        public float LoadResistance;      // R_load = (R_resistor * R_voltmeter) / (R_resistor + R_voltmeter)
        public float EffectiveResistor;   // R_resistor with tolerance and temperature
        public float LoopResistance;      // Total series loop resistance
        public bool IsFuseTripped;        // True if current exceeded safety threshold
        public string StatusMessage;
    }

    /// <summary>
    /// Scientific model for Ohm's Law: V = IR.
    /// Supports both Ideal Mode (pure theoretical curriculum) and Realistic Mode
    /// (incorporating battery EMF, internal resistances, voltmeter shunting, tolerance, and fuse protection).
    /// </summary>
    public class OhmsLawModel : IScientificModel
    {
        public PhysicsSimulationMode Mode { get; set; } = PhysicsSimulationMode.Ideal;

        // Model state
        private float _resistance = 10f; // Ω
        private float _voltage = 0f;    // V
        private float _current = 0f;    // A
        private float _power = 0f;      // W

        // Circuit physical parameters (Realistic Mode)
        public float BatteryEmf { get; set; } = 4.0f;                       // E (Volts)
        public float BatteryInternalResistance { get; set; } = 0.25f;        // R_battery (Ω)
        public float WireResistance { get; set; } = 0.04f;                  // R_wire (Ω)
        public float AmmeterResistance { get; set; } = 0.05f;               // R_ammeter (Ω)
        public float VoltmeterResistance { get; set; } = 20000.0f;          // R_voltmeter (Ω)
        public float RheostatMaxResistance { get; set; } = 20.0f;           // R_rheo_max (Ω)
        public float RheostatResistance { get; set; } = 5.0f;               // R_rheostat (Ω)
        public float TemperatureCoefficient { get; set; } = 0.0004f;        // α (/K, nichrome)
        public float ResistorTolerancePercent { get; set; } = 2.0f;         // % tolerance (+2.0%)
        public float Temperature { get; set; } = 25.0f;                     // Ambient / operating T (°C)
        public float ReferenceTemperature { get; set; } = 25.0f;            // T0 (°C)
        public float OverloadThreshold { get; set; } = 5.0f;                // 5A fuse trip threshold
        public bool IsFuseTripped { get; private set; } = false;

        // Valid ranges
        public const float MIN_VOLTAGE = 0f;
        public const float MAX_VOLTAGE = 10f;
        public const float MIN_RESISTANCE = 0.01f;
        public const float MAX_RESISTANCE = 100f;
        public const float MIN_CURRENT = 0f;
        public const float MAX_CURRENT = 5f;

        public void Initialize(ExperimentDefinition definition)
        {
            _resistance = 10f;
            _voltage = 0f;
            _current = 0f;
            _power = 0f;
            IsFuseTripped = false;
        }

        public void ResetFuse()
        {
            IsFuseTripped = false;
        }

        /// <summary>
        /// Solves the circuit using ground-truth electrical equations.
        /// When realistic mode includes the voltmeter in parallel with the resistor:
        ///   R_load = (R_resistor * R_voltmeter) / (R_resistor + R_voltmeter)
        ///   I_total = E / (R_battery + R_wire + R_ammeter + R_rheostat + R_load)
        ///   V_resistor = I_total * R_load
        ///   I_resistor = V_resistor / R_resistor
        ///   I_voltmeter = V_resistor / R_voltmeter
        ///   P_resistor = I_resistor^2 * R_resistor
        /// </summary>
        public OhmsLawCircuitState ComputeRealisticCircuit(float rheostatVal, float nominalResistor, bool circuitClosed = true)
        {
            if (!circuitClosed)
            {
                return new OhmsLawCircuitState
                {
                    TotalCurrent = 0f,
                    ResistorVoltage = 0f,
                    ResistorCurrent = 0f,
                    VoltmeterCurrent = 0f,
                    ResistorPower = 0f,
                    LoadResistance = 0f,
                    EffectiveResistor = nominalResistor,
                    LoopResistance = 0f,
                    IsFuseTripped = IsFuseTripped,
                    StatusMessage = "Circuit open."
                };
            }

            if (IsFuseTripped)
            {
                return new OhmsLawCircuitState
                {
                    TotalCurrent = 0f,
                    ResistorVoltage = 0f,
                    ResistorCurrent = 0f,
                    VoltmeterCurrent = 0f,
                    ResistorPower = 0f,
                    LoadResistance = 0f,
                    EffectiveResistor = nominalResistor,
                    LoopResistance = 0f,
                    IsFuseTripped = true,
                    StatusMessage = "Fuse blown due to overcurrent. Reset fuse to restore circuit."
                };
            }

            // 1. Resistor with tolerance and temperature drift
            float tolFactor = 1.0f + (ResistorTolerancePercent / 100.0f);
            float tempFactor = 1.0f + TemperatureCoefficient * (Temperature - ReferenceTemperature);
            float R_resistor = nominalResistor * tolFactor * tempFactor;
            if (R_resistor < 0.01f) R_resistor = 0.01f;

            // 2. Parallel combination with voltmeter: R_load = (R_resistor * R_voltmeter) / (R_resistor + R_voltmeter)
            float R_load = (R_resistor * VoltmeterResistance) / (R_resistor + VoltmeterResistance);

            // 3. Rheostat resistance
            float R_rheostat = Mathf.Clamp(rheostatVal, 0f, RheostatMaxResistance);

            // 4. Total loop resistance
            float R_loop = BatteryInternalResistance + WireResistance + AmmeterResistance + R_rheostat + R_load;

            // 5. Total circuit current: I_total = E / (R_battery + R_wire + R_ammeter + R_rheostat + R_load)
            float I_total = (R_loop > 0.0001f) ? (BatteryEmf / R_loop) : 0f;

            // Overload detection
            if (I_total > OverloadThreshold)
            {
                IsFuseTripped = true;
                return new OhmsLawCircuitState
                {
                    TotalCurrent = 0f,
                    ResistorVoltage = 0f,
                    ResistorCurrent = 0f,
                    VoltmeterCurrent = 0f,
                    ResistorPower = 0f,
                    LoadResistance = R_load,
                    EffectiveResistor = R_resistor,
                    LoopResistance = R_loop,
                    IsFuseTripped = true,
                    StatusMessage = $"OVERLOAD: Circuit current ({I_total:F2}A) exceeded {OverloadThreshold}A fuse limit! Fuse blown."
                };
            }

            // 6. Resistor potential difference: V_resistor = I_total * R_load
            float V_resistor = I_total * R_load;

            // 7. Branch currents:
            float I_resistor = V_resistor / R_resistor;
            float I_voltmeter = V_resistor / VoltmeterResistance;

            // 8. Resistor power: P_resistor = I_resistor^2 * R_resistor
            float P_resistor = I_resistor * I_resistor * R_resistor;

            _resistance = R_resistor;
            _voltage = V_resistor;
            _current = I_total;
            _power = P_resistor;

            return new OhmsLawCircuitState
            {
                TotalCurrent = I_total,
                ResistorVoltage = V_resistor,
                ResistorCurrent = I_resistor,
                VoltmeterCurrent = I_voltmeter,
                ResistorPower = P_resistor,
                LoadResistance = R_load,
                EffectiveResistor = R_resistor,
                LoopResistance = R_loop,
                IsFuseTripped = false,
                StatusMessage = "Operating normally."
            };
        }

        /// <summary>
        /// Compute current and derived values for given voltage and resistance.
        /// In Ideal Mode: inputs[0] = applied voltage (V), inputs[1] = resistance (Ω).
        /// In Realistic Mode: inputs[0] = rheostat resistance (Ω), inputs[1] = nominal resistance (Ω).
        /// </summary>
        public SimulationResult Compute(float[] inputs)
        {
            if (Mode == PhysicsSimulationMode.Ideal)
            {
                float appliedVoltage = Mathf.Clamp(inputs[0], MIN_VOLTAGE, MAX_VOLTAGE);
                float resistance = Mathf.Clamp(inputs[1], MIN_RESISTANCE, MAX_RESISTANCE);

                _resistance = resistance;
                _voltage = appliedVoltage;

                if (resistance <= 0f)
                {
                    return new SimulationResult
                    {
                        Outputs = new float[] { 0f, 0f, 0f, 0f },
                        IsValid = false,
                        Message = "Resistance must be greater than zero."
                    };
                }

                _current = appliedVoltage / resistance;   // I = V/R
                _power = appliedVoltage * _current;         // P = VI = V²/R

                float calculatedResistance = _current > 0.001f
                    ? appliedVoltage / _current
                    : 0f;

                bool isValid = _current >= MIN_CURRENT && _current <= MAX_CURRENT;

                return new SimulationResult
                {
                    Outputs = new float[]
                    {
                        _current,             // [0] Current (A)
                        _power,               // [1] Power (W)
                        appliedVoltage,       // [2] Voltage across resistor (V)
                        calculatedResistance  // [3] Calculated R (Ω)
                    },
                    IsValid = isValid,
                    Message = isValid ? "" : "Current exceeds safe range for school laboratory."
                };
            }
            else
            {
                float rheostatR = inputs[0];
                float nominalR = inputs[1];

                var state = ComputeRealisticCircuit(rheostatR, nominalR, true);
                float calcR = state.TotalCurrent > 0.0001f ? (state.ResistorVoltage / state.TotalCurrent) : 0f;

                return new SimulationResult
                {
                    Outputs = new float[]
                    {
                        state.TotalCurrent,
                        state.ResistorPower,
                        state.ResistorVoltage,
                        calcR
                    },
                    IsValid = !state.IsFuseTripped,
                    Message = state.StatusMessage
                };
            }
        }

        /// <summary>
        /// Validate the model against known analytical solutions.
        /// Test: For R = 10Ω, V = 5V → I should be exactly 0.5A.
        /// Test: For R = 20Ω, V = 4V → I should be exactly 0.2A.
        /// Test: V/I should always equal R for an Ohmic conductor.
        /// </summary>
        public bool Validate(float tolerance = 0.01f)
        {
            // Test Case 1: V=5V, R=10Ω → I = 0.5A
            var result1 = Compute(new float[] { 5f, 10f });
            float expectedCurrent1 = 0.5f;
            if (Mathf.Abs(result1.Outputs[0] - expectedCurrent1) > tolerance)
            {
                Debug.LogError($"[OhmsLaw Validation FAILED] Test 1: Expected I={expectedCurrent1}A, Got I={result1.Outputs[0]}A");
                return false;
            }

            // Test Case 2: V=4V, R=20Ω → I = 0.2A
            var result2 = Compute(new float[] { 4f, 20f });
            float expectedCurrent2 = 0.2f;
            if (Mathf.Abs(result2.Outputs[0] - expectedCurrent2) > tolerance)
            {
                Debug.LogError($"[OhmsLaw Validation FAILED] Test 2: Expected I={expectedCurrent2}A, Got I={result2.Outputs[0]}A");
                return false;
            }

            // Test Case 3: V/I = R (for multiple values)
            float[] testVoltages = { 1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f };
            float testResistance = 15f;

            foreach (float v in testVoltages)
            {
                var result = Compute(new float[] { v, testResistance });
                float calculatedR = result.Outputs[3];
                if (Mathf.Abs(calculatedR - testResistance) > tolerance)
                {
                    Debug.LogError($"[OhmsLaw Validation FAILED] R consistency: V={v}V, " +
                        $"Expected R={testResistance}Ω, Got R={calculatedR}Ω");
                    return false;
                }
            }

            // Test Case 4: Zero voltage → zero current
            var result4 = Compute(new float[] { 0f, 10f });
            if (Mathf.Abs(result4.Outputs[0]) > tolerance)
            {
                Debug.LogError($"[OhmsLaw Validation FAILED] Zero voltage test: Expected I=0A, Got I={result4.Outputs[0]}A");
                return false;
            }

            // Test Case 5: Power calculation P = VI = V²/R
            var result5 = Compute(new float[] { 6f, 12f });
            float expectedPower = 6f * 6f / 12f; // 3W
            if (Mathf.Abs(result5.Outputs[1] - expectedPower) > tolerance)
            {
                Debug.LogError($"[OhmsLaw Validation FAILED] Power test: Expected P={expectedPower}W, Got P={result5.Outputs[1]}W");
                return false;
            }

            Debug.Log("[OhmsLaw Validation] All tests passed ✓");
            return true;
        }

        public string GetEquation()
        {
            return "V = I × R (Ohm's Law)\nwhere V = Voltage (Volts), I = Current (Amperes), R = Resistance (Ohms)";
        }

        public string GetAssumptions()
        {
            return "1. Ohmic conductor (constant resistance)\n" +
                   "2. Constant temperature\n" +
                   "3. DC circuit\n" +
                   "4. Ideal ammeter (zero internal resistance)\n" +
                   "5. Ideal voltmeter (infinite internal resistance)\n" +
                   "6. Negligible wire resistance\n" +
                   "7. Ideal battery (constant EMF)";
        }

        // ── Public Accessors ──────────────────────────────────────────
        public float Voltage => _voltage;
        public float Current => _current;
        public float Resistance => _resistance;
        public float Power => _power;
    }
}
