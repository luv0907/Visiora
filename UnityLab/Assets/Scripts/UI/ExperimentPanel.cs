using System.Collections.Generic;
using UnityEngine;
using TMPro;
using Visora.Experiments.Framework;
using Visora.Experiments.OhmsLaw;

namespace Visora.UI
{
    /// <summary>
    /// Main experiment UI panel. Displays parameters, measurements,
    /// controls, instructions, and the V-I graph.
    /// Designed to be non-intrusive — slides in/out from the side.
    /// </summary>
    public class ExperimentPanel : MonoBehaviour
    {
        [Header("Panel References")]
        [SerializeField] private GameObject _panelRoot;
        [SerializeField] private CanvasGroup _canvasGroup;

        [Header("Info Display")]
        [SerializeField] private TextMeshProUGUI _titleText;
        [SerializeField] private TextMeshProUGUI _objectiveText;
        [SerializeField] private TextMeshProUGUI _equationText;
        [SerializeField] private TextMeshProUGUI _instructionText;

        [Header("Measurements")]
        [SerializeField] private TextMeshProUGUI _voltageDisplay;
        [SerializeField] private TextMeshProUGUI _currentDisplay;
        [SerializeField] private TextMeshProUGUI _resistanceDisplay;
        [SerializeField] private TextMeshProUGUI _powerDisplay;

        [Header("Controls")]
        [SerializeField] private UnityEngine.UI.Slider _voltageSlider;
        [SerializeField] private UnityEngine.UI.Button _startButton;
        [SerializeField] private UnityEngine.UI.Button _stopButton;
        [SerializeField] private UnityEngine.UI.Button _resetButton;
        [SerializeField] private UnityEngine.UI.Button _recordButton;
        [SerializeField] private UnityEngine.UI.Button _togglePanelButton;

        [Header("Data Table")]
        [SerializeField] private Transform _dataTableContent;
        [SerializeField] private GameObject _dataRowPrefab;

        [Header("Graph")]
        [SerializeField] private GraphRenderer _graphRenderer;

        [Header("Status")]
        [SerializeField] private TextMeshProUGUI _statusText;
        [SerializeField] private TextMeshProUGUI _dataPointCountText;

        [Header("Animation")]
        [SerializeField] private float _slideSpeed = 8f;

        private OhmsLawController _controller;
        private bool _isPanelVisible = true;
        private int _currentStep = 0;

        private readonly string[] _procedureSteps = new string[]
        {
            "Step 1: Observe the circuit. Identify the battery, ammeter (A), voltmeter (V), rheostat, resistor, and switch.",
            "Step 2: Use the rheostat slider or interact with the knob to set a voltage value.",
            "Step 3: Close the switch by clicking on it [E key].",
            "Step 4: Read the ammeter (current) and voltmeter (voltage) readings.",
            "Step 5: Click 'Record Reading' to save the V-I data point.",
            "Step 6: Adjust the rheostat to a new voltage and repeat steps 4-5.",
            "Step 7: Take at least 5 readings at different voltages.",
            "Step 8: Observe the V-I graph. For an Ohmic conductor, it should be a straight line through the origin.",
            "Step 9: The slope of the graph gives you the resistance R = V/I."
        };

        private void Start()
        {
            _controller = FindAnyObjectByType<OhmsLawController>();

            if (_controller != null)
            {
                SetupUI();
                SubscribeToEvents();
            }
        }

        private void SetupUI()
        {
            var def = _controller.Definition;
            if (def != null)
            {
                if (_titleText != null) _titleText.text = def.title;
                if (_objectiveText != null) _objectiveText.text = def.objective;
                if (_equationText != null) _equationText.text = def.governingEquation;
            }

            UpdateInstruction();
            UpdateMeasurements(0f, 0f, 10f, 0f);

            // Wire up buttons
            _startButton?.onClick.AddListener(() => _controller.StartExperiment());
            _stopButton?.onClick.AddListener(() => _controller.StopExperiment());
            _resetButton?.onClick.AddListener(OnReset);
            _recordButton?.onClick.AddListener(OnRecordReading);
            _togglePanelButton?.onClick.AddListener(TogglePanel);

            // Wire up voltage slider
            if (_voltageSlider != null)
            {
                _voltageSlider.minValue = OhmsLawModel.MIN_VOLTAGE;
                _voltageSlider.maxValue = OhmsLawModel.MAX_VOLTAGE;
                _voltageSlider.value = 0f;
                _voltageSlider.onValueChanged.AddListener(OnVoltageSliderChanged);
            }
        }

        private void SubscribeToEvents()
        {
            _controller.OnCircuitUpdated += OnCircuitUpdated;
            _controller.OnStateChanged += OnStateChanged;
            _controller.OnDataPointRecorded += OnDataPointRecorded;
        }

        private void OnCircuitUpdated(float voltage, float current)
        {
            float power = voltage * current;
            UpdateMeasurements(voltage, current, _controller.ResistanceValue, power);
        }

        private void UpdateMeasurements(float voltage, float current, float resistance, float power)
        {
            if (_voltageDisplay != null) _voltageDisplay.text = $"{voltage:F2} V";
            if (_currentDisplay != null) _currentDisplay.text = $"{current:F3} A";
            if (_resistanceDisplay != null) _resistanceDisplay.text = $"{resistance:F1} Ω";
            if (_powerDisplay != null) _powerDisplay.text = $"{power:F2} W";
        }

        private void OnStateChanged(ExperimentState state)
        {
            if (_statusText != null)
            {
                _statusText.text = state switch
                {
                    ExperimentState.Setup => "● SETUP — Adjust parameters, then close the switch",
                    ExperimentState.Running => "● RUNNING — Record readings at different voltages",
                    ExperimentState.Paused => "● PAUSED",
                    ExperimentState.Completed => "● COMPLETE — Review your V-I graph",
                    ExperimentState.Error => "● ERROR",
                    _ => ""
                };
            }

            // Update button states
            bool isRunning = state == ExperimentState.Running;
            if (_recordButton != null) _recordButton.interactable = isRunning;
            if (_voltageSlider != null) _voltageSlider.interactable =
                state == ExperimentState.Setup || isRunning;
        }

        private void OnVoltageSliderChanged(float value)
        {
            _controller?.SetVoltage(value);
        }

        private void OnRecordReading()
        {
            _controller?.RecordReading();

            // Advance instruction step
            if (_currentStep < 5) _currentStep = 5;
            else if (_currentStep < 7) _currentStep++;
            UpdateInstruction();
        }

        private void OnDataPointRecorded(float voltage, float current)
        {
            // Update graph
            _graphRenderer?.AddDataPoint(voltage, current);

            // Update data count
            if (_dataPointCountText != null)
            {
                int count = _controller.CollectedData.Count;
                _dataPointCountText.text = $"Readings: {count}";

                if (count >= 5)
                {
                    // Calculate and display resistance
                    float calcR = _controller.CalculateResistanceFromData();
                    _dataPointCountText.text += $" | Calculated R = {calcR:F2} Ω";
                }
            }
        }

        private void OnReset()
        {
            _controller?.ResetExperiment();
            _graphRenderer?.ClearGraph();
            _currentStep = 0;
            UpdateInstruction();

            if (_voltageSlider != null) _voltageSlider.value = 0f;
        }

        private void UpdateInstruction()
        {
            if (_instructionText != null && _currentStep < _procedureSteps.Length)
            {
                _instructionText.text = _procedureSteps[_currentStep];
            }
        }

        private void TogglePanel()
        {
            _isPanelVisible = !_isPanelVisible;
        }

        private void Update()
        {
            // Smooth panel slide animation
            if (_canvasGroup != null)
            {
                float targetAlpha = _isPanelVisible ? 1f : 0f;
                _canvasGroup.alpha = Mathf.Lerp(_canvasGroup.alpha, targetAlpha, _slideSpeed * Time.deltaTime);
                _canvasGroup.blocksRaycasts = _isPanelVisible;
                _canvasGroup.interactable = _isPanelVisible;
            }

            // Toggle panel with Tab key
            if (Input.GetKeyDown(KeyCode.Tab))
            {
                TogglePanel();
            }
        }

        private void OnDestroy()
        {
            if (_controller != null)
            {
                _controller.OnCircuitUpdated -= OnCircuitUpdated;
                _controller.OnStateChanged -= OnStateChanged;
                _controller.OnDataPointRecorded -= OnDataPointRecorded;
            }
        }
    }
}
