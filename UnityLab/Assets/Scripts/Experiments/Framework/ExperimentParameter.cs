using System;
using UnityEngine;

namespace Visora.Experiments.Framework
{
    /// <summary>
    /// Defines a single adjustable parameter for an experiment.
    /// Includes SI units, valid ranges, and display configuration.
    /// </summary>
    [Serializable]
    public class ExperimentParameter
    {
        [Header("Identity")]
        public string id;
        public string displayName;
        public string symbol; // e.g., "V", "I", "R"

        [Header("Value")]
        public float defaultValue;
        public float currentValue;
        public float minValue;
        public float maxValue;
        public float stepSize = 0.1f;

        [Header("Units (SI)")]
        public string unit; // e.g., "V", "A", "Ω", "m", "kg"
        public string unitName; // e.g., "Volts", "Amperes", "Ohms"

        [Header("Classification")]
        public ParameterType parameterType = ParameterType.Independent;

        [Header("Display")]
        public int decimalPlaces = 2;
        public bool isReadOnly; // For dependent variables / measurements

        public enum ParameterType
        {
            Independent,   // Student can adjust (e.g., voltage via rheostat)
            Dependent,     // Measured result (e.g., current from ammeter)
            Constant,      // Fixed for this experiment run (e.g., resistance)
            Derived         // Calculated from other values (e.g., R = V/I)
        }

        /// <summary>
        /// Clamp value to valid range.
        /// </summary>
        public float ClampValue(float value)
        {
            return Mathf.Clamp(value, minValue, maxValue);
        }

        /// <summary>
        /// Get formatted display string with unit.
        /// </summary>
        public string GetFormattedValue()
        {
            return $"{currentValue.ToString($"F{decimalPlaces}")} {unit}";
        }

        /// <summary>
        /// Reset to default value.
        /// </summary>
        public void Reset()
        {
            currentValue = defaultValue;
        }
    }
}
