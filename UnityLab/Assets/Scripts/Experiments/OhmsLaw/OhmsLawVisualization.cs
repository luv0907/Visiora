using UnityEngine;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Handles the visual representation of the Ohm's Law circuit.
    /// Drives analog meter needles, animated rheostat slider collar, plug key insertion,
    /// and resistor Joule heating glow strictly from the scientific model.
    /// Includes self-healing reference resolution to guarantee 100% responsiveness.
    /// </summary>
    public class OhmsLawVisualization : MonoBehaviour
    {
        [Header("Meter Needles")]
        [SerializeField] private Transform _ammeterNeedle;
        [SerializeField] private Transform _voltmeterNeedle;

        [Header("Meter Ranges")]
        [SerializeField] private float _ammeterMaxReading = 1.0f;    // A (0 to 1.0 A full scale)
        [SerializeField] private float _voltmeterMaxReading = 5.0f;  // V (0 to 5.0 V full scale)
        [SerializeField] private float _needleMinAngle = 52f;        // 0 mark on left (+52 deg Z)
        [SerializeField] private float _needleMaxAngle = -52f;       // Full scale on right (-52 deg Z)

        [Header("Switch Plug")]
        [SerializeField] private Transform _switchHandle;
        [SerializeField] private float _plugInsertedY = 0.048f;      // Down inside socket
        [SerializeField] private float _plugRemovedY = 0.082f;       // Raised up above socket

        [Header("Rheostat Slider")]
        [SerializeField] private Transform _rheostatKnob;
        [SerializeField] private float _sliderMinX = -0.12f;
        [SerializeField] private float _sliderMaxX = 0.12f;

        [Header("Wire Glow")]
        [SerializeField] private Renderer _resistorRenderer;
        [SerializeField] private Color _coolColor = new Color(0.2f, 0.2f, 0.2f);
        [SerializeField] private Color _hotColor = new Color(1f, 0.35f, 0.1f);
        [SerializeField] private float _maxPowerForGlow = 5f;

        [Header("Animation")]
        [SerializeField] private float _needleSpeed = 10f; // Damped needle response

        private float _targetAmmeterAngle = 52f;
        private float _targetVoltmeterAngle = 52f;
        private bool _isSwitchClosed = false;

        private Visora.Physics.MovingCoilPhysics _ammeterPhysics = new Visora.Physics.MovingCoilPhysics();
        private Visora.Physics.MovingCoilPhysics _voltmeterPhysics = new Visora.Physics.MovingCoilPhysics();

        private MaterialPropertyBlock _resistorPropertyBlock;

        private void Awake()
        {
            _resistorPropertyBlock = new MaterialPropertyBlock();
            ResolveReferencesIfNull();
        }

        private void Start()
        {
            ResolveReferencesIfNull();

            _ammeterPhysics.Initialize(_needleMinAngle, _needleMinAngle, _needleMaxAngle);
            _voltmeterPhysics.Initialize(_needleMinAngle, _needleMinAngle, _needleMaxAngle);

            // Set initial rest poses (open circuit, zero deflection)
            if (_ammeterNeedle != null) _ammeterNeedle.localRotation = Quaternion.Euler(0, 0, _needleMinAngle);
            if (_voltmeterNeedle != null) _voltmeterNeedle.localRotation = Quaternion.Euler(0, 0, _needleMinAngle);
            if (_switchHandle != null) _switchHandle.localPosition = new Vector3(0, _plugRemovedY, 0);
        }

        public void ConfigureApparatus(Transform ammeterNeedle, Transform voltmeterNeedle, Transform rheostatSlider, Transform switchPlug, Renderer resistorRenderer)
        {
            _ammeterNeedle = ammeterNeedle;
            _voltmeterNeedle = voltmeterNeedle;
            _rheostatKnob = rheostatSlider;
            _switchHandle = switchPlug;
            _resistorRenderer = resistorRenderer;
        }

        public void ResolveReferencesIfNull()
        {
            if (_ammeterNeedle == null)
            {
                var amm = GameObject.Find("Ammeter");
                if (amm != null) _ammeterNeedle = amm.transform.Find("FaceAssembly/NeedlePivot");
            }

            if (_voltmeterNeedle == null)
            {
                var volt = GameObject.Find("Voltmeter");
                if (volt != null) _voltmeterNeedle = volt.transform.Find("FaceAssembly/NeedlePivot");
            }

            if (_rheostatKnob == null)
            {
                var rheo = GameObject.Find("Rheostat");
                if (rheo != null) _rheostatKnob = rheo.transform.Find("SliderAssembly");
            }

            if (_switchHandle == null)
            {
                var key = GameObject.Find("PlugKey");
                if (key != null) _switchHandle = key.transform.Find("PlugHandle");
            }

            if (_resistorRenderer == null)
            {
                var res = GameObject.Find("StandardResistor");
                if (res != null) _resistorRenderer = res.transform.Find("SpoolWinding")?.GetComponent<Renderer>();
            }
        }

        /// <summary>
        /// Update physical instrument visual deflections from simulation values.
        /// </summary>
        private VoltmeterDevice _voltmeterDevice;

        public void UpdateVisualization(float voltage, float current, float resistance, bool switchClosed)
        {
            _isSwitchClosed = switchClosed;
            ResolveReferencesIfNull();

            if (_voltmeterDevice == null) _voltmeterDevice = FindAnyObjectByType<VoltmeterDevice>();
            if (_voltmeterDevice != null)
            {
                _voltmeterDevice.SetInputVoltage(switchClosed ? voltage : 0f);
            }

            float vClamped = Mathf.Clamp(voltage, 0f, _voltmeterMaxReading);
            float iClamped = Mathf.Clamp(current, 0f, _ammeterMaxReading);

            if (switchClosed)
            {
                _targetVoltmeterAngle = Mathf.Lerp(_needleMinAngle, _needleMaxAngle, vClamped / _voltmeterMaxReading);
                _targetAmmeterAngle   = Mathf.Lerp(_needleMinAngle, _needleMaxAngle, iClamped / _ammeterMaxReading);
            }
            else
            {
                // Open circuit — both needles drop to zero
                _targetVoltmeterAngle = _needleMinAngle;
                _targetAmmeterAngle   = _needleMinAngle;
            }

            // Resistor Joule heating glow
            if (_resistorRenderer != null)
            {
                float power = voltage * current;
                float heatFactor = Mathf.Clamp01(power / _maxPowerForGlow);
                Color emissionColor = Color.Lerp(_coolColor, _hotColor, heatFactor);

                _resistorRenderer.GetPropertyBlock(_resistorPropertyBlock);
                _resistorPropertyBlock.SetColor("_EmissionColor", emissionColor * heatFactor * 1.5f);
                _resistorRenderer.SetPropertyBlock(_resistorPropertyBlock);
            }
        }

        private void Update()
        {
            // 2nd-order D'Arsonval moving-coil mechanical dynamics (inertial surge, 5% overshoot, stop pin bounce)
            if (_ammeterNeedle != null)
            {
                float angle = _ammeterPhysics.Update(_targetAmmeterAngle, Time.deltaTime, _isSwitchClosed);
                _ammeterNeedle.localRotation = Quaternion.Euler(0f, 0f, angle);
            }

            // Only use legacy fallback if VoltmeterDevice is not installed on the voltmeter
            if (_voltmeterNeedle != null && _voltmeterDevice == null)
            {
                float angle = _voltmeterPhysics.Update(_targetVoltmeterAngle, Time.deltaTime, _isSwitchClosed);
                _voltmeterNeedle.localRotation = Quaternion.Euler(0f, 0f, angle);
            }

            // Animate plug key insertion/removal
            if (_switchHandle != null)
            {
                float targetY = _isSwitchClosed ? _plugInsertedY : _plugRemovedY;
                Vector3 p = _switchHandle.localPosition;
                float newY = Mathf.Lerp(p.y, targetY, Time.deltaTime * 16f);
                _switchHandle.localPosition = new Vector3(p.x, newY, p.z);
            }
        }

        /// <summary>
        /// Slide physical wiper collar along rheostat resistance coil.
        /// </summary>
        public void UpdateRheostatPosition(float normalizedPosition)
        {
            if (_rheostatKnob == null) ResolveReferencesIfNull();

            if (_rheostatKnob != null)
            {
                float targetX = Mathf.Lerp(_sliderMinX, _sliderMaxX, Mathf.Clamp01(normalizedPosition));
                Vector3 cur = _rheostatKnob.localPosition;
                _rheostatKnob.localPosition = new Vector3(targetX, cur.y, cur.z);
            }
        }
    }
}
