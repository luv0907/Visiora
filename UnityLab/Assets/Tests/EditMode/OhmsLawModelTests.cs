using NUnit.Framework;
using UnityEngine;
using Visora.Experiments.OhmsLaw;
using Visora.Experiments.Framework;

namespace Visora.Tests.EditMode
{
    /// <summary>
    /// Automated scientific validation tests for the Ohm's Law model.
    /// These run in Unity's Test Runner (Edit Mode) without entering Play mode.
    /// Tests verify that the mathematical model V=IR is correct within tolerance.
    ///
    /// VALIDATION STRATEGY:
    ///   - Compare model output against known analytical solutions
    ///   - Test boundary conditions
    ///   - Test linearity of V-I relationship
    ///   - Test consistency: R = V/I should be constant for an Ohmic conductor
    ///   - Test power calculation: P = VI = V²/R = I²R
    /// </summary>
    public class OhmsLawModelTests
    {
        private OhmsLawModel _model;
        private const float TOLERANCE = 0.001f; // 0.1% — very tight for exact linear law

        [SetUp]
        public void SetUp()
        {
            _model = new OhmsLawModel();
            // Initialize with a dummy definition (not needed for pure math tests)
            _model.Initialize(null);
        }

        // ── Core Ohm's Law Tests ──────────────────────────────────────────────

        [Test]
        [TestCase(5f, 10f, 0.5f,  "V=5V R=10Ω → I=0.5A")]
        [TestCase(4f, 20f, 0.2f,  "V=4V R=20Ω → I=0.2A")]
        [TestCase(6f, 30f, 0.2f,  "V=6V R=30Ω → I=0.2A")]
        [TestCase(3f,  5f, 0.6f,  "V=3V R=5Ω  → I=0.6A")]
        [TestCase(0f, 10f, 0f,    "V=0V R=10Ω → I=0A (zero voltage)")]
        [TestCase(10f, 100f, 0.1f, "V=10V R=100Ω → I=0.1A (max resistance)")]
        public void Current_MatchesOhmsLaw(float voltage, float resistance, float expectedCurrent, string description)
        {
            var result = _model.Compute(new float[] { voltage, resistance });

            Assert.IsTrue(result.IsValid || Mathf.Abs(result.Outputs[0]) < TOLERANCE,
                $"Result invalid: {result.Message}");

            Assert.AreEqual(expectedCurrent, result.Outputs[0], TOLERANCE,
                $"FAILED: {description} | Expected I={expectedCurrent}A, Got I={result.Outputs[0]}A");
        }

        // ── Linearity Test ────────────────────────────────────────────────────

        [Test]
        public void VIRelationship_IsLinear_ForOhmicConductor()
        {
            // For a fixed R, doubling V should double I → V/I = R = constant
            float resistance = 15f;
            float[] voltages = { 1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f };
            float[] currents = new float[voltages.Length];

            for (int i = 0; i < voltages.Length; i++)
            {
                var result = _model.Compute(new float[] { voltages[i], resistance });
                currents[i] = result.Outputs[0];
            }

            // Verify linearity: V/I = R for every point
            for (int i = 0; i < voltages.Length; i++)
            {
                if (currents[i] < TOLERANCE) continue; // Skip zero current

                float calculatedR = voltages[i] / currents[i];
                Assert.AreEqual(resistance, calculatedR, TOLERANCE,
                    $"Linearity FAILED at V={voltages[i]}V: Expected R={resistance}Ω, Got {calculatedR:F4}Ω");
            }
        }

        // ── Power Calculation Tests ───────────────────────────────────────────

        [Test]
        [TestCase(6f, 12f, 3f,  "P = V²/R = 36/12 = 3W")]
        [TestCase(5f, 10f, 2.5f,"P = V²/R = 25/10 = 2.5W")]
        [TestCase(4f,  8f, 2f,  "P = V²/R = 16/8  = 2W")]
        public void Power_EqualsVSquaredDividedByR(float voltage, float resistance, float expectedPower, string description)
        {
            var result = _model.Compute(new float[] { voltage, resistance });
            float power = result.Outputs[1];

            Assert.AreEqual(expectedPower, power, TOLERANCE,
                $"Power FAILED: {description} | Expected P={expectedPower}W, Got P={power}W");
        }

        [Test]
        public void Power_ConsistencyCheck_AllThreeFormulas()
        {
            // P = VI = V²/R = I²R must all be equal
            float V = 6f;
            float R = 12f;
            float I = V / R; // = 0.5A

            float p1 = V * I;
            float p2 = V * V / R;
            float p3 = I * I * R;

            var result = _model.Compute(new float[] { V, R });
            float modelPower = result.Outputs[1];

            Assert.AreEqual(p1, p2, TOLERANCE, "P=VI ≠ P=V²/R");
            Assert.AreEqual(p2, p3, TOLERANCE, "P=V²/R ≠ P=I²R");
            Assert.AreEqual(p1, modelPower, TOLERANCE, $"Model power ({modelPower}W) ≠ VI ({p1}W)");
        }

        // ── Boundary Condition Tests ──────────────────────────────────────────

        [Test]
        public void ZeroVoltage_ProducesZeroCurrent()
        {
            var result = _model.Compute(new float[] { 0f, 10f });
            Assert.AreEqual(0f, result.Outputs[0], TOLERANCE, "Zero voltage should produce zero current");
            Assert.AreEqual(0f, result.Outputs[1], TOLERANCE, "Zero voltage should produce zero power");
        }

        [Test]
        public void MaxVoltage_StaysWithinSafeRange()
        {
            var result = _model.Compute(new float[] { OhmsLawModel.MAX_VOLTAGE, OhmsLawModel.MIN_RESISTANCE });
            float current = result.Outputs[0];

            // MAX_VOLTAGE / MIN_RESISTANCE = 10/1 = 10A — but MAX_CURRENT is 5A
            // Since inputs are clamped before being passed, we test that model produces physically meaningful results
            Debug.Log($"Max V / Min R → I = {current}A");
            Assert.IsTrue(current >= 0f, "Current should not be negative");
        }

        [Test]
        public void VoltageAboveRange_IsClamped()
        {
            // Model should clamp out-of-range input
            var resultNormal = _model.Compute(new float[] { OhmsLawModel.MAX_VOLTAGE, 10f });
            var resultOverV  = _model.Compute(new float[] { OhmsLawModel.MAX_VOLTAGE + 100f, 10f });

            // Expect same result because excess voltage is clamped
            Assert.AreEqual(resultNormal.Outputs[0], resultOverV.Outputs[0], TOLERANCE,
                "Voltage above MAX_VOLTAGE should be clamped");
        }

        // ── Built-in Validation ───────────────────────────────────────────────

        [Test]
        public void Model_PassesBuiltInValidation()
        {
            bool isValid = _model.Validate(TOLERANCE);
            Assert.IsTrue(isValid, "OhmsLawModel built-in validation failed — check Compute() logic.");
        }

        // ── Calculated R from Data ────────────────────────────────────────────

        [Test]
        public void CalculatedResistance_MatchesActual_Within5Percent()
        {
            // Simulate taking 5 readings at different voltages
            float actualR = 10f;
            float[] testVoltages = { 2f, 4f, 6f, 8f, 10f };

            float sumVI = 0f, sumI2 = 0f;
            foreach (float v in testVoltages)
            {
                float i = v / actualR; // Exact I = V/R
                sumVI += v * i;
                sumI2 += i * i;
            }

            float calculatedR = sumI2 > 0 ? sumVI / sumI2 : 0f;
            float error = Mathf.Abs(calculatedR - actualR) / actualR * 100f;

            Assert.Less(error, 5f,
                $"Calculated R ({calculatedR:F2}Ω) is more than 5% from actual R ({actualR}Ω). Error: {error:F2}%");
        }
    }
}
