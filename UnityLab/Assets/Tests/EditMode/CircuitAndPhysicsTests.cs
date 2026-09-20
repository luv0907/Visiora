using NUnit.Framework;
using UnityEngine;
using Visora.Experiments.OhmsLaw.Wiring;
using Visora.Physics;

namespace Visora.Tests.EditMode
{
    [TestFixture]
    public class CircuitAndPhysicsTests
    {
        // ── Moving Coil Physics Tests ─────────────────────────────────────────

        [Test]
        public void MovingCoilPhysics_SettlesToTarget_UnderDampedOscillation()
        {
            var coil = new MovingCoilPhysics();
            coil.Initialize(0f, 0f, 100f);

            float target = 50f;
            float dt = 0.016f; // 60 FPS
            float maxDeflection = 0f;

            // Simulate 1 second
            for (int step = 0; step < 60; step++)
            {
                float currentAngle = coil.Update(target, dt, currentFlowing: true);
                if (currentAngle > maxDeflection) maxDeflection = currentAngle;
            }

            // Verify ~5% inertial overshoot occurred (50 * 1.05 = ~52.5)
            Assert.Greater(maxDeflection, target, "Moving-coil meter must exhibit authentic inertial overshoot");
            Assert.Less(maxDeflection, target * 1.15f, "Damping must prevent wild oscillation");

            // After 1.5 seconds, verify it settled close to target
            for (int step = 0; step < 30; step++)
            {
                coil.Update(target, dt, currentFlowing: true);
            }

            Assert.AreEqual(target, coil.CurrentAngle, 0.5f, "Needle must settle accurately on calibration mark");
        }

        [Test]
        public void MovingCoilPhysics_StopsAtZeroPin_BounceDoesNotGoNegative()
        {
            var coil = new MovingCoilPhysics();
            coil.Initialize(0f, 0f, 100f);

            // Deflect to 80 deg then drop to 0
            coil.Update(80f, 0.5f, currentFlowing: true);
            
            // De-energize
            float minAngle = float.MaxValue;
            for (int step = 0; step < 60; step++)
            {
                float angle = coil.Update(0f, 0.016f, currentFlowing: false);
                if (angle < minAngle) minAngle = angle;
            }

            Assert.GreaterOrEqual(minAngle, 0f, "Mechanical stop pin must prevent needle from traveling below 0 degrees");
        }

        // ── Kirchhoff Circuit Network Solver Tests ────────────────────────────

        [Test]
        public void CircuitSolver_Unwired_ReturnsUnwiredStatus()
        {
            var solver = new CircuitNetworkSolver();
            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.Unwired, status);
        }

        [Test]
        public void CircuitSolver_Incomplete_ReturnsIncompleteStatus()
        {
            var solver = new CircuitNetworkSolver();

            // Only 2 leads connected
            solver.AddConnection(TerminalId.PowerSupply_Pos, TerminalId.Key_Term1);
            solver.AddConnection(TerminalId.Key_Term2, TerminalId.Rheostat_Lower);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.Incomplete, status);
            StringAssert.Contains("Incomplete", msg);
        }

        [Test]
        public void CircuitSolver_SeriesLoopClosed_ReturnsSeriesLoopClosed()
        {
            var solver = new CircuitNetworkSolver();

            // Wire series loop without voltmeter
            solver.AddConnection(TerminalId.PowerSupply_Pos, TerminalId.Key_Term1);
            solver.AddConnection(TerminalId.Key_Term2, TerminalId.Rheostat_Lower);
            solver.AddConnection(TerminalId.Rheostat_Slider, TerminalId.Ammeter_Pos);
            solver.AddConnection(TerminalId.Ammeter_Neg, TerminalId.Resistor_Term1);
            solver.AddConnection(TerminalId.Resistor_Term2, TerminalId.PowerSupply_Neg);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.SeriesLoopClosed, status);
        }

        [Test]
        public void CircuitSolver_FullCircuit_ReturnsFullyWired()
        {
            var solver = new CircuitNetworkSolver();

            // Wire series loop
            solver.AddConnection(TerminalId.PowerSupply_Pos, TerminalId.Key_Term1);
            solver.AddConnection(TerminalId.Key_Term2, TerminalId.Rheostat_Lower);
            solver.AddConnection(TerminalId.Rheostat_Slider, TerminalId.Ammeter_Pos);
            solver.AddConnection(TerminalId.Ammeter_Neg, TerminalId.Resistor_Term1);
            solver.AddConnection(TerminalId.Resistor_Term2, TerminalId.PowerSupply_Neg);

            // Wire parallel voltmeter across resistor
            solver.AddConnection(TerminalId.Voltmeter_Pos, TerminalId.Resistor_Term1);
            solver.AddConnection(TerminalId.Voltmeter_Neg, TerminalId.Resistor_Term2);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.FullyWired, status);
            StringAssert.Contains("CORRECTLY", msg);
        }

        [Test]
        public void CircuitSolver_AmmeterParallelAcrossResistor_ReturnsShortCircuitFault()
        {
            var solver = new CircuitNetworkSolver();

            // Student mistakenly connects ammeter directly in parallel across resistor
            solver.AddConnection(TerminalId.Ammeter_Pos, TerminalId.Resistor_Term1);
            solver.AddConnection(TerminalId.Ammeter_Neg, TerminalId.Resistor_Term2);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.ShortCircuitFault, status);
            StringAssert.Contains("parallel", msg.ToLower());
        }

        [Test]
        public void CircuitSolver_SupplyDirectShort_ReturnsSupplyShortCircuitFault()
        {
            var solver = new CircuitNetworkSolver();

            // Direct short across battery terminals
            solver.AddConnection(TerminalId.PowerSupply_Pos, TerminalId.PowerSupply_Neg);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.SupplyShortCircuitFault, status);
            StringAssert.Contains("SHORT CIRCUIT", msg);
        }

        [Test]
        public void CircuitSolver_AmmeterAcrossSupply_ReturnsSupplyShortCircuitFault()
        {
            var solver = new CircuitNetworkSolver();

            // Ammeter directly across battery terminals
            solver.AddConnection(TerminalId.PowerSupply_Pos, TerminalId.Ammeter_Pos);
            solver.AddConnection(TerminalId.PowerSupply_Neg, TerminalId.Ammeter_Neg);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.SupplyShortCircuitFault, status);
            StringAssert.Contains("SHORT CIRCUIT", msg);
        }

        [Test]
        public void CircuitSolver_VoltmeterInSeries_ReturnsVoltmeterInSeriesFault()
        {
            var solver = new CircuitNetworkSolver();

            // Student mistakenly puts high-resistance voltmeter in series in main current path
            solver.AddConnection(TerminalId.PowerSupply_Pos, TerminalId.Voltmeter_Pos);
            solver.AddConnection(TerminalId.Voltmeter_Neg, TerminalId.Key_Term1);

            var (status, msg) = solver.EvaluateCircuit();

            Assert.AreEqual(CircuitTopologyStatus.VoltmeterInSeriesFault, status);
            StringAssert.Contains("VOLTMETER IN SERIES", msg);
        }

        // ── Voltmeter Device Mechanism & Calibration Tests ───────────────────

        [Test]
        public void VoltmeterDevice_TorsionalDynamics_SettlesToTargetVoltage()
        {
            var go = new GameObject("TestVoltmeter");
            var vm = go.AddComponent<Visora.Experiments.OhmsLaw.VoltmeterDevice>();

            // Mid-scale voltage: 1.5 V on 0-3 V range
            vm.SetInputVoltage(1.5f);

            // Simulate settling frames until damping brings torsional coil to rest
            for (int i = 0; i < 300; i++)
            {
                var updateMethod = typeof(Visora.Experiments.OhmsLaw.VoltmeterDevice)
                    .GetMethod("Update", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                updateMethod?.Invoke(vm, null);
            }

            // At 1.5V on 3V range, normalized is 0.5. With range -50° to +50°, mid-scale is 0°
            Assert.AreEqual(0.0f, vm.CurrentAngle, 1.5f, "Needle must settle near mid-scale (0 deg) for 1.5 V");
            Assert.AreEqual(1.5f, vm.DisplayedVoltage, 0.1f, "Displayed voltage should report 1.5 V");

            Object.DestroyImmediate(go);
        }

        [Test]
        public void VoltmeterDevice_DualRange_ModulatesDeflectionSensitivity()
        {
            var go = new GameObject("TestVoltmeter");
            var vm = go.AddComponent<Visora.Experiments.OhmsLaw.VoltmeterDevice>();

            vm.SetInputVoltage(3.0f);
            vm.SetRange(false); // 3V range
            Assert.AreEqual(3.0f, vm.RangeMax);

            vm.SetRange(true);  // 15V range
            Assert.AreEqual(15.0f, vm.RangeMax);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void VoltmeterDevice_ZeroScrewAdjustment_CalibratesOffset()
        {
            var go = new GameObject("TestVoltmeter");
            var vm = go.AddComponent<Visora.Experiments.OhmsLaw.VoltmeterDevice>();

            Assert.AreEqual(0f, vm.ZeroCalibrationOffset);

            vm.AdjustZeroScrew(1.2f);
            Assert.AreEqual(1.2f, vm.ZeroCalibrationOffset, 0.001f);

            vm.AdjustZeroScrew(-0.4f);
            Assert.AreEqual(0.8f, vm.ZeroCalibrationOffset, 0.001f);

            Object.DestroyImmediate(go);
        }

        // ── Phase 3: Ideal and Realistic Physics Mode Tests ───────────────────

        [Test]
        public void OhmsLawModel_IdealMode_CalculatesExactCurrentAndPower()
        {
            var model = new Visora.Experiments.OhmsLaw.OhmsLawModel();
            model.Mode = Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Ideal;

            float voltage = 4.0f;
            float resistance = 10.0f;
            var result = model.Compute(new float[] { voltage, resistance });

            float expectedI = 0.400f; // I = V / R
            float expectedP = 1.600f; // P = V * I

            Assert.AreEqual(expectedI, result.Outputs[0], 0.001f);
            Assert.AreEqual(expectedP, result.Outputs[1], 0.001f);
            Assert.AreEqual(voltage, result.Outputs[2], 0.001f);
            Assert.AreEqual(resistance, result.Outputs[3], 0.001f);
        }

        [Test]
        public void OhmsLawModel_RealisticMode_ComputesExactFormulaLoadAndCurrents()
        {
            var model = new Visora.Experiments.OhmsLaw.OhmsLawModel();
            model.Mode = Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Realistic;

            model.BatteryEmf = 4.0f;
            model.BatteryInternalResistance = 0.25f;
            model.WireResistance = 0.04f;
            model.AmmeterResistance = 0.05f;
            model.VoltmeterResistance = 20000.0f;
            model.ResistorTolerancePercent = 0.0f; // 0% tolerance for exact mathematical test
            model.Temperature = 25.0f;

            float rheostatR = 5.0f;
            float nominalR = 10.0f;

            var state = model.ComputeRealisticCircuit(rheostatR, nominalR, circuitClosed: true);

            // Analytical verification:
            // R_load = (10 * 20000) / (10 + 20000) = 9.995002 Ω
            float expectedRload = (10f * 20000f) / (10f + 20000f);
            Assert.AreEqual(expectedRload, state.LoadResistance, 0.0001f);

            // R_loop = 0.25 + 0.04 + 0.05 + 5.0 + 9.995002 = 15.335002 Ω
            float expectedRloop = 0.25f + 0.04f + 0.05f + 5.0f + expectedRload;
            Assert.AreEqual(expectedRloop, state.LoopResistance, 0.0001f);

            // I_total = E / R_loop = 4.0 / 15.335002 = 0.260841 A
            float expectedItotal = 4.0f / expectedRloop;
            Assert.AreEqual(expectedItotal, state.TotalCurrent, 0.0001f);

            // V_resistor = I_total * R_load = 0.260841 * 9.995002 = 2.607109 V
            float expectedVres = expectedItotal * expectedRload;
            Assert.AreEqual(expectedVres, state.ResistorVoltage, 0.0001f);

            // I_resistor = V_resistor / R_resistor = 2.607109 / 10 = 0.260711 A
            float expectedIres = expectedVres / 10f;
            Assert.AreEqual(expectedIres, state.ResistorCurrent, 0.0001f);

            // I_voltmeter = V_resistor / R_voltmeter = 2.607109 / 20000 = 0.000130 A
            float expectedIvm = expectedVres / 20000f;
            Assert.AreEqual(expectedIvm, state.VoltmeterCurrent, 0.0001f);

            // P_resistor = I_resistor^2 * R_resistor
            float expectedPres = expectedIres * expectedIres * 10f;
            Assert.AreEqual(expectedPres, state.ResistorPower, 0.0001f);
        }

        [Test]
        public void OhmsLawModel_RealisticMode_OverloadCurrent_TripsFuse()
        {
            var model = new Visora.Experiments.OhmsLaw.OhmsLawModel();
            model.Mode = Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Realistic;
            model.BatteryEmf = 12.0f; // High voltage source
            model.OverloadThreshold = 5.0f;

            // Low loop resistance causes current > 5A
            var state = model.ComputeRealisticCircuit(rheostatVal: 0f, nominalResistor: 0.1f, circuitClosed: true);

            Assert.IsTrue(state.IsFuseTripped, "Fuse must trip when current exceeds overload threshold");
            Assert.AreEqual(0f, state.TotalCurrent, "Current must be cut to zero when fuse trips");
            Assert.IsTrue(model.IsFuseTripped);

            // Resetting fuse restores operation
            model.ResetFuse();
            Assert.IsFalse(model.IsFuseTripped);
        }

        [Test]
        public void OhmsLawModel_RealisticMode_TemperatureHeating_IncreasesResistance()
        {
            var model = new Visora.Experiments.OhmsLaw.OhmsLawModel();
            model.Mode = Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Realistic;
            model.ResistorTolerancePercent = 0f;
            model.TemperatureCoefficient = 0.0004f;

            // At 25°C
            model.Temperature = 25.0f;
            var stateCold = model.ComputeRealisticCircuit(5f, 10f, true);

            // At 125°C (delta T = 100 K) -> R increases by 4% to 10.4 Ω
            model.Temperature = 125.0f;
            var stateHot = model.ComputeRealisticCircuit(5f, 10f, true);

            Assert.AreEqual(10.0f, stateCold.EffectiveResistor, 0.001f);
            Assert.AreEqual(10.4f, stateHot.EffectiveResistor, 0.01f);
            Assert.Less(stateHot.TotalCurrent, stateCold.TotalCurrent, "Higher temperature must reduce loop current");
        }

        // ── Phase 5: Observation Table, Regression Slope & 5-Point Verification ──

        [Test]
        public void LabObservationTablet_RegressionAndSlope_CalculatesAccurateResistance()
        {
            var go = new GameObject("TestTablet");
            var tablet = go.AddComponent<Visora.UI.LabObservationTablet>();

            // Simulate 5 data points along 10 Ω resistor: (V, I)
            tablet.AddObservation(1.0f, 0.100f, 10.0f);
            tablet.AddObservation(2.0f, 0.200f, 10.0f);
            tablet.AddObservation(3.0f, 0.300f, 10.0f);
            tablet.AddObservation(4.0f, 0.400f, 10.0f);
            tablet.AddObservation(5.0f, 0.500f, 10.0f);

            Assert.AreEqual(5, tablet.Observations.Count);

            float slope = tablet.CalculateRegressionSlope();
            Assert.AreEqual(10.0f, slope, 0.001f, "Slope m = ΔV/ΔI must equal 10 Ω");

            float meanR = tablet.CalculateMeanResistance();
            Assert.AreEqual(10.0f, meanR, 0.001f, "Mean R must equal 10 Ω");

            Object.DestroyImmediate(go);
        }

        [Test]
        public void LabObservationTablet_PercentageError_MatchesTheoreticalExpectation()
        {
            var go = new GameObject("TestTablet");
            var tablet = go.AddComponent<Visora.UI.LabObservationTablet>();

            // Slight realistic measurement noise: ~10.2 Ω slope
            tablet.AddObservation(1.02f, 0.100f, 10.0f);
            tablet.AddObservation(2.04f, 0.200f, 10.0f);
            tablet.AddObservation(3.06f, 0.300f, 10.0f);

            float slope = tablet.CalculateRegressionSlope();
            float error = tablet.CalculatePercentageError(10.0f);

            Assert.AreEqual(10.2f, slope, 0.01f);
            Assert.AreEqual(2.0f, error, 0.05f, "Percentage error should be 2.0%");

            Object.DestroyImmediate(go);
        }

        [Test]
        public void LabObservationTablet_OhmsLawVerification_RequiresAtLeastFiveDistinctReadings()
        {
            var go = new GameObject("TestTablet");
            var tablet = go.AddComponent<Visora.UI.LabObservationTablet>();

            // Add 4 points first
            tablet.AddObservation(1.0f, 0.100f, 10.0f);
            tablet.AddObservation(2.0f, 0.200f, 10.0f);
            tablet.AddObservation(3.0f, 0.300f, 10.0f);
            tablet.AddObservation(4.0f, 0.400f, 10.0f);

            bool verifiedWith4 = tablet.IsOhmsLawVerified(10.0f, out string msg4);
            Assert.IsFalse(verifiedWith4, "Ohm's Law verification must require at least 5 points");
            StringAssert.Contains("4/5 recorded", msg4);

            // Add 5th point
            tablet.AddObservation(5.0f, 0.500f, 10.0f);
            bool verifiedWith5 = tablet.IsOhmsLawVerified(10.0f, out string msg5);
            Assert.IsTrue(verifiedWith5, "Ohm's Law must be verified with 5 valid points and < 5% error");
            StringAssert.Contains("VERIFIED", msg5);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void LabObservationTablet_Deduplication_RejectsDuplicateTrial()
        {
            var go = new GameObject("TestTablet");
            var tablet = go.AddComponent<Visora.UI.LabObservationTablet>();

            bool first = tablet.AddObservation(3.0f, 0.300f, 10.0f);
            Assert.IsTrue(first, "First trial should be accepted");

            // Attempting to record identical or very near point without moving rheostat
            bool duplicate = tablet.AddObservation(3.01f, 0.301f, 10.0f);
            Assert.IsFalse(duplicate, "Duplicate observation without adjusting rheostat should be rejected");
            Assert.AreEqual(1, tablet.Observations.Count);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void OhmsLawController_SimulationMode_SwitchesBetweenIdealAndRealistic()
        {
            var go = new GameObject("TestController");
            var ctrl = go.AddComponent<Visora.Experiments.OhmsLaw.OhmsLawController>();

            // Start controller
            var startMethod = typeof(Visora.Experiments.OhmsLaw.OhmsLawController)
                .GetMethod("Start", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            startMethod?.Invoke(ctrl, null);

            Assert.AreEqual(Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Realistic, ctrl.SimulationMode);

            ctrl.SetSimulationMode(Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Ideal);
            Assert.AreEqual(Visora.Experiments.OhmsLaw.PhysicsSimulationMode.Ideal, ctrl.SimulationMode);

            Object.DestroyImmediate(go);
        }
    }
}

