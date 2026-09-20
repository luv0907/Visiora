using System.Collections.Generic;
using UnityEngine;
using Visora.Experiments.OhmsLaw;
using Visora.Laboratory;

namespace Visora.UI
{
    /// <summary>
    /// Sleek laboratory telemetry tablet resting physically on the workbench.
    /// Acts as the scientific observation ledger holding trial data and regression metrics.
    /// All UI is displayed cleanly via the on-screen LabHUD, preventing any 3D floating text.
    /// </summary>
    public class LabObservationTablet : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private OhmsLawController _controller;

        public struct Observation
        {
            public int Trial;
            public float Voltage;
            public float Current;
            public float Resistance;
            public float Power;
            public string Remarks;
        }

        private readonly List<Observation> _observations = new List<Observation>();
        public IReadOnlyList<Observation> Observations => _observations;
        public const int MAX_OBSERVATIONS = 6;

        public static LabObservationTablet BuildTablet(Transform benchRoot, Vector3 localPos, Quaternion localRot, OhmsLawController controller)
        {
            var tabletGo = new GameObject("ObservationTablet");
            tabletGo.transform.SetParent(benchRoot);
            tabletGo.transform.localPosition = localPos;
            tabletGo.transform.localRotation = localRot;

            // Load materials
            var eboniteMat = VisoraLabMaterials.GetMaterial("Lab_Ebonite");
            var metalMat   = VisoraLabMaterials.GetMaterial("Lab_MetalTrim");

            // Sleek tablet chassis: 0.36m x 0.012m x 0.26m
            var chassis = GameObject.CreatePrimitive(PrimitiveType.Cube);
            chassis.name = "Chassis";
            chassis.transform.SetParent(tabletGo.transform);
            chassis.transform.localPosition = Vector3.zero;
            chassis.transform.localScale = new Vector3(0.36f, 0.012f, 0.26f);
            SafeDestroy(chassis.GetComponent<Collider>());
            if (eboniteMat != null) chassis.GetComponent<Renderer>().material = eboniteMat;

            // Box collider for tablet raycast interaction
            var col = tabletGo.AddComponent<BoxCollider>();
            col.size = new Vector3(0.36f, 0.04f, 0.26f);
            col.center = new Vector3(0, 0.01f, 0);

            // Glass screen surface (sleek dark bezel with subtle OLED blue tint)
            var screen = GameObject.CreatePrimitive(PrimitiveType.Quad);
            screen.name = "DisplayScreen";
            screen.transform.SetParent(tabletGo.transform);
            screen.transform.localPosition = new Vector3(0, 0.007f, 0);
            screen.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            screen.transform.localScale = new Vector3(0.34f, 0.24f, 1f);
            SafeDestroy(screen.GetComponent<Collider>());

            var screenMat = new Material(VisoraLabMaterials.LitShader);
            screenMat.SetColor("_BaseColor", new Color(0.04f, 0.08f, 0.14f));
            screenMat.SetFloat("_Smoothness", 0.92f);
            screen.GetComponent<Renderer>().material = screenMat;

            // Add Tablet Component
            var tablet = tabletGo.AddComponent<LabObservationTablet>();
            tablet._controller = controller;

            return tablet;
        }

        private static void SafeDestroy(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Destroy(obj);
            else DestroyImmediate(obj);
        }

        private void Start()
        {
            if (_controller == null)
                _controller = FindAnyObjectByType<OhmsLawController>();
        }

        public bool RecordCurrentObservation()
        {
            if (_controller == null)
                _controller = FindAnyObjectByType<OhmsLawController>();

            if (_controller == null || !_controller.IsSwitchClosed || !_controller.IsWiringComplete)
                return false;

            float v = _controller.CurrentVoltage;
            float i = _controller.CurrentCurrent;
            float stdR = _controller.ResistanceValue;

            return AddObservation(v, i, stdR);
        }

        /// <summary>
        /// Logs a trial data point (V, I) with deduplication and validation.
        /// </summary>
        public bool AddObservation(float v, float i, float stdR = 10.0f)
        {
            if (i < 0.001f || v < 0.01f)
                return false;

            float r = v / i;
            float p = v * i;

            // Deduplication: check if student has already recorded this approximate point
            foreach (var existing in _observations)
            {
                if (Mathf.Abs(existing.Voltage - v) < 0.06f && Mathf.Abs(existing.Current - i) < 0.012f)
                {
                    return false;
                }
            }

            float errPercent = Mathf.Abs(r - stdR) / stdR * 100f;
            string remark = (errPercent < 5.0f) ? "Valid / Ohmic" : "Tolerance Bias";

            if (_observations.Count >= MAX_OBSERVATIONS)
                _observations.RemoveAt(0);

            _observations.Add(new Observation
            {
                Trial = _observations.Count + 1,
                Voltage = v,
                Current = i,
                Resistance = r,
                Power = p,
                Remarks = remark
            });

            return true;
        }

        public void ResetObservations()
        {
            _observations.Clear();
        }

        /// <summary>
        /// Calculates arithmetic mean of calculated resistances R = V / I across recorded trials.
        /// </summary>
        public float CalculateMeanResistance()
        {
            if (_observations.Count == 0) return 0f;
            float sum = 0f;
            foreach (var obs in _observations)
            {
                sum += obs.Resistance;
            }
            return sum / _observations.Count;
        }

        /// <summary>
        /// Calculates linear regression slope (experimental resistance R = V / I)
        /// using least-squares fit through origin: m = Σ(Vi * Ii) / Σ(Ii^2).
        /// </summary>
        public float CalculateRegressionSlope()
        {
            if (_observations.Count < 2) return 0f;
            float sumVI = 0f;
            float sumI2 = 0f;
            foreach (var obs in _observations)
            {
                sumVI += obs.Voltage * obs.Current;
                sumI2 += obs.Current * obs.Current;
            }
            return sumI2 > 0.00001f ? (sumVI / sumI2) : 0f;
        }

        /// <summary>
        /// Percentage error compared to nominal resistor: |R_exp - R_actual| / R_actual * 100%.
        /// </summary>
        public float CalculatePercentageError(float actualR)
        {
            float rExp = CalculateRegressionSlope();
            if (rExp < 0.001f || actualR < 0.001f) return 0f;
            return Mathf.Abs(rExp - actualR) / actualR * 100.0f;
        }

        /// <summary>
        /// Confirms Ohm's Law validity after at least 5 distinct valid observations.
        /// </summary>
        public bool IsOhmsLawVerified(float actualR, out string proofSummary)
        {
            if (_observations.Count < 5)
            {
                proofSummary = $"Record at least 5 readings ({_observations.Count}/5 recorded). Adjust rheostat for each point.";
                return false;
            }

            float rExp = CalculateRegressionSlope();
            float error = CalculatePercentageError(actualR);

            if (error < 5.0f)
            {
                proofSummary = $"✓ OHM'S LAW VERIFIED: Experimental slope R = {rExp:F2}Ω matches {actualR:F1}Ω resistor (Error: {error:F1}%). V is directly proportional to I.";
                return true;
            }
            else
            {
                proofSummary = $"Ohm's Law: Slope R = {rExp:F2}Ω (Error: {error:F1}%). Sweep wider rheostat range.";
                return false;
            }
        }
    }
}
