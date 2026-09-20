using System;
using System.Collections.Generic;
using UnityEngine;

namespace Visora.Experiments.Framework
{
    /// <summary>
    /// Base controller for all experiments.
    /// Manages the experiment lifecycle (setup → running → paused → completed → reset).
    /// Coordinates between the scientific model, visualization, and UI.
    /// </summary>
    public abstract class ExperimentController : MonoBehaviour
    {
        [Header("Experiment Configuration")]
        [SerializeField] protected ExperimentDefinition _definition;

        // State
        public ExperimentState CurrentState { get; protected set; } = ExperimentState.Uninitialized;

        // Events for UI/visualization to subscribe to
        public event Action<ExperimentState> OnStateChanged;
        public event Action<string, float> OnParameterChanged; // paramId, newValue
        public event Action<Dictionary<string, float>> OnMeasurementUpdated;
        public event Action<float, float> OnDataPointRecorded; // x, y for graphing

        // Current measurements
        protected Dictionary<string, float> _measurements = new Dictionary<string, float>();

        // Data collection for graphing
        protected List<Vector2> _collectedData = new List<Vector2>();

        /// <summary>
        /// Get the experiment definition.
        /// </summary>
        public ExperimentDefinition Definition => _definition;

        /// <summary>
        /// Get all collected data points for graphing.
        /// </summary>
        public IReadOnlyList<Vector2> CollectedData => _collectedData;

        protected virtual void Start()
        {
            if (_definition != null)
            {
                Initialize();
            }
        }

        /// <summary>
        /// Initialize the experiment. Sets up the scientific model and initial state.
        /// </summary>
        public virtual void Initialize()
        {
            // Reset parameters to defaults
            foreach (var param in _definition.parameters)
            {
                param.Reset();
            }

            _measurements.Clear();
            _collectedData.Clear();

            SetState(ExperimentState.Setup);
            Debug.Log($"[Experiment] {_definition.title} initialized.");
        }

        /// <summary>
        /// Start running the experiment.
        /// </summary>
        public virtual void StartExperiment()
        {
            if (CurrentState != ExperimentState.Setup && CurrentState != ExperimentState.Paused)
            {
                Debug.LogWarning($"[Experiment] Cannot start from state: {CurrentState}");
                return;
            }

            SetState(ExperimentState.Running);
            Debug.Log($"[Experiment] {_definition.title} started.");
        }

        /// <summary>
        /// Pause the running experiment.
        /// </summary>
        public virtual void PauseExperiment()
        {
            if (CurrentState != ExperimentState.Running) return;
            SetState(ExperimentState.Paused);
        }

        /// <summary>
        /// Resume a paused experiment.
        /// </summary>
        public virtual void ResumeExperiment()
        {
            if (CurrentState != ExperimentState.Paused) return;
            SetState(ExperimentState.Running);
        }

        /// <summary>
        /// Stop and complete the experiment.
        /// </summary>
        public virtual void StopExperiment()
        {
            SetState(ExperimentState.Completed);
            Debug.Log($"[Experiment] {_definition.title} completed. Data points: {_collectedData.Count}");
        }

        /// <summary>
        /// Reset the experiment to initial state.
        /// </summary>
        public virtual void ResetExperiment()
        {
            _collectedData.Clear();
            _measurements.Clear();
            Initialize();
        }

        /// <summary>
        /// Update a parameter value. Triggers recalculation.
        /// </summary>
        public virtual void SetParameter(string paramId, float value)
        {
            var param = _definition.parameters.Find(p => p.id == paramId);
            if (param == null)
            {
                Debug.LogWarning($"[Experiment] Unknown parameter: {paramId}");
                return;
            }

            float clampedValue = param.ClampValue(value);
            param.currentValue = clampedValue;
            OnParameterChanged?.Invoke(paramId, clampedValue);

            // Recalculate if the experiment is running
            if (CurrentState == ExperimentState.Running || CurrentState == ExperimentState.Setup)
            {
                Recalculate();
            }
        }

        /// <summary>
        /// Record a data point for graphing.
        /// </summary>
        protected void RecordDataPoint(float x, float y)
        {
            var point = new Vector2(x, y);
            _collectedData.Add(point);
            OnDataPointRecorded?.Invoke(x, y);
        }

        /// <summary>
        /// Update a measurement value.
        /// </summary>
        protected void UpdateMeasurement(string name, float value)
        {
            _measurements[name] = value;
            OnMeasurementUpdated?.Invoke(_measurements);
        }

        /// <summary>
        /// Transition to a new state.
        /// </summary>
        protected void SetState(ExperimentState newState)
        {
            var previousState = CurrentState;
            CurrentState = newState;
            OnStateChanged?.Invoke(newState);
            Debug.Log($"[Experiment] State: {previousState} → {newState}");
        }

        /// <summary>
        /// Override in derived classes to recalculate simulation
        /// when parameters change.
        /// </summary>
        protected abstract void Recalculate();

        /// <summary>
        /// Get a parameter value by ID.
        /// </summary>
        public float GetParameterValue(string paramId)
        {
            var param = _definition.parameters.Find(p => p.id == paramId);
            return param?.currentValue ?? 0f;
        }
    }
}
