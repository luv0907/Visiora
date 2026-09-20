using UnityEngine;
using Visora.Interaction;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Interactive precision sliding rheostat.
    /// Students drag or scroll to slide the brass wiper contact along the resistance coil,
    /// smoothly varying the circuit voltage ($0\text{V}$ to $5\text{V}$).
    /// </summary>
    public class RheostatInteractable : InteractableBase
    {
        [Header("Rheostat Voltage Range")]
        [SerializeField] private float _minVoltage = 0f;
        [SerializeField] private float _maxVoltage = 5f;
        [SerializeField] private float _currentVoltage = 3.0f; // Default starting voltage
        [SerializeField] private float _sensitivity = 0.25f;

        [Header("References")]
        [SerializeField] private OhmsLawController _experimentController;
        [SerializeField] private Transform _sliderTransform;

        [Header("Slider Collar Travel Limits")]
        [SerializeField] private float _sliderMinX = -0.12f;
        [SerializeField] private float _sliderMaxX = 0.12f;

        private bool _isDragging;
        private float _normalizedPosition; // 0 to 1

        public void Configure(OhmsLawController controller, Transform sliderTransform)
        {
            _experimentController = controller;
            _sliderTransform = sliderTransform;
            UpdateSliderVisual();
        }

        protected override void Awake()
        {
            base.Awake();
            if (_experimentController == null)
                _experimentController = FindAnyObjectByType<OhmsLawController>();

            _normalizedPosition = Mathf.Clamp01((_currentVoltage - _minVoltage) / (_maxVoltage - _minVoltage));
            UpdatePrompt();
            UpdateSliderVisual();
        }

        public override void OnInteract()
        {
            base.OnInteract();
            _isDragging = !_isDragging;
            UpdatePrompt();
        }

        private void Update()
        {
            if (_isDragging)
            {
                // Read mouse scroll wheel
                float scroll = Input.mouseScrollDelta.y;
                if (Mathf.Abs(scroll) > 0.01f)
                {
                    AdjustVoltage(scroll * _sensitivity);
                }

                // Keyboard arrow adjustment when active
                if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.D))
                {
                    AdjustVoltage(1.5f * Time.deltaTime);
                }
                if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.A))
                {
                    AdjustVoltage(-1.5f * Time.deltaTime);
                }
            }
        }

        public void AdjustVoltage(float delta)
        {
            _currentVoltage = Mathf.Clamp(_currentVoltage + delta, _minVoltage, _maxVoltage);
            _normalizedPosition = (_currentVoltage - _minVoltage) / (_maxVoltage - _minVoltage);

            UpdateSliderVisual();

            if (_experimentController == null)
                _experimentController = FindAnyObjectByType<OhmsLawController>();

            float rheoR = (1f - _normalizedPosition) * 20.0f;
            _experimentController?.SetRheostatResistance(rheoR);
            _experimentController?.SetVoltage(_currentVoltage);
        }

        public void SetVoltage(float voltage)
        {
            _currentVoltage = Mathf.Clamp(voltage, _minVoltage, _maxVoltage);
            _normalizedPosition = (_currentVoltage - _minVoltage) / (_maxVoltage - _minVoltage);

            UpdateSliderVisual();

            if (_experimentController == null)
                _experimentController = FindAnyObjectByType<OhmsLawController>();

            float rheoR = (1f - _normalizedPosition) * 20.0f;
            _experimentController?.SetRheostatResistance(rheoR);
            _experimentController?.SetVoltage(_currentVoltage);
        }

        public float RheostatResistance => (1f - _normalizedPosition) * 20.0f;

        private void UpdateSliderVisual()
        {
            if (_sliderTransform != null)
            {
                float targetX = Mathf.Lerp(_sliderMinX, _sliderMaxX, _normalizedPosition);
                Vector3 cur = _sliderTransform.localPosition;
                _sliderTransform.localPosition = new Vector3(targetX, cur.y, cur.z);
            }
        }

        private void UpdatePrompt()
        {
            SetPrompt(_isDragging
                ? "Sliding Rheostat: Scroll / Arrow Keys | [E] to Lock"
                : "Adjust Rheostat [E] (Scroll to Slide)");
        }

        public float CurrentVoltage => _currentVoltage;
    }
}
