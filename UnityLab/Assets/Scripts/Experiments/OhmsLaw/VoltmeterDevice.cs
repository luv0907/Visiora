using System;
using UnityEngine;
using Visora.Physics;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Masterclass Physics Laboratory Analog DC Voltmeter.
    /// Realizes authentic 2nd-order D'Arsonval torsional galvanometer dynamics,
    /// mechanical zero-adjustment screw calibration, dual-range sensitivity (3V / 15V),
    /// hard stop-pin elastic bounce, and anti-parallax mirror optical alignment.
    /// </summary>
    [SelectionBase]
    public class VoltmeterDevice : MonoBehaviour
    {
        [Header("Instrument Ranges")]
        [SerializeField] private float _rangeMax = 3.0f; // Default 3V range
        [SerializeField] private bool _use15VRange = false;

        [Header("Moving Coil Geometry")]
        [SerializeField] private Transform _needlePivot;
        [SerializeField] private Transform _zeroAdjustScrew;
        [SerializeField] private Transform _dialFace;
        [SerializeField] private float _zeroAngle = -50f;       // Zero mark angle (degrees)
        [SerializeField] private float _fullScaleAngle = 50f;   // Full scale mark angle (degrees)
        [SerializeField] private float _minStopAngle = -54f;    // Left physical stop pin
        [SerializeField] private float _maxStopAngle = 54f;     // Right physical stop pin

        [Header("Torsional Dynamics (SI Units)")]
        [SerializeField] private float _springStiffness = 2.8e-4f; // N*m/rad
        [SerializeField] private float _momentOfInertia = 1.2e-6f; // kg*m^2
        [SerializeField] private float _dampingCoeff = 1.1e-4f;    // N*m*s/rad (air + eddy current)
        [SerializeField] private float _stopPinRestitution = 0.35f; // Elastic rebound coefficient

        // Physical state
        private float _currentAngle = -50f;
        private float _angularVelocity = 0f;
        private float _zeroCalibrationOffset = 0f; // Mechanical zero adjustment (-3° to +3°)
        private float _inputVoltage = 0f;
        private bool _isInspecting = false;

        // Parallax calculation
        private float _parallaxErrorAngle = 0f;
        private bool _isParallaxAligned = false;

        // Events
        public event Action<float> OnVoltageChanged;

        public float CurrentAngle => _currentAngle;
        public float DisplayedVoltage
        {
            get
            {
                float normalized = Mathf.InverseLerp(_zeroAngle + _zeroCalibrationOffset, _fullScaleAngle, _currentAngle);
                return Mathf.Clamp01(normalized) * _rangeMax;
            }
        }
        public float ZeroCalibrationOffset => _zeroCalibrationOffset;
        public float RangeMax => _rangeMax;
        public bool IsParallaxAligned => _isParallaxAligned;
        public float ParallaxAngle => _parallaxErrorAngle;
        public bool IsInspecting => _isInspecting;

        private void Awake()
        {
            _currentAngle = _zeroAngle;
            FindReferences();
        }

        private void FindReferences()
        {
            if (_needlePivot == null)
            {
                _needlePivot = transform.Find("Voltmeter_Needle") 
                    ?? transform.Find("NeedlePivot") 
                    ?? transform.Find("FaceAssembly/NeedlePivot");
            }
            if (_zeroAdjustScrew == null)
            {
                _zeroAdjustScrew = transform.Find("ZeroScrew");
            }
            if (_dialFace == null)
            {
                _dialFace = transform.Find("DialFace") ?? transform.Find("FaceAssembly/DialPlate");
            }
        }

        public void SetInputVoltage(float voltage)
        {
            _inputVoltage = Mathf.Max(0f, voltage);
            OnVoltageChanged?.Invoke(_inputVoltage);
        }

        public void SetRange(bool use15V)
        {
            _use15VRange = use15V;
            _rangeMax = _use15VRange ? 15.0f : 3.0f;
        }

        /// <summary>
        /// Mechanical screw calibration: rotates hairspring anchor to shift resting zero.
        /// </summary>
        public void AdjustZeroScrew(float deltaDegrees)
        {
            _zeroCalibrationOffset = Mathf.Clamp(_zeroCalibrationOffset + deltaDegrees, -4.5f, 4.5f);
            if (_zeroAdjustScrew != null)
            {
                _zeroAdjustScrew.localRotation = Quaternion.Euler(0f, 0f, _zeroCalibrationOffset * 8f);
            }
        }

        public void SetInspecting(bool inspecting)
        {
            _isInspecting = inspecting;
        }

        private void Update()
        {
            UpdateTorsionalPhysics(Time.deltaTime);
            UpdateParallaxOpticalRay();
            ApplyNeedleTransform();
        }

        /// <summary>
        /// Exact 2nd-order torsional differential equation solver (Semi-Implicit Euler).
        /// J * d2θ/dt2 + c * dθ/dt + κ * (θ - θ_rest) = τ_electromagnetic
        /// </summary>
        private void UpdateTorsionalPhysics(float dt)
        {
            if (dt <= 0f || dt > 0.1f) dt = 0.016f;

            // Target deflecting angle from electrodynamic Lorentz torque
            float targetFraction = Mathf.Clamp01(_inputVoltage / _rangeMax);
            float targetRestAngle = (_zeroAngle + _zeroCalibrationOffset) + targetFraction * (_fullScaleAngle - _zeroAngle);

            // Torsional torque: Spring return torque + Electromagnetic deflecting torque
            float displacementRad = (_currentAngle - targetRestAngle) * Mathf.Deg2Rad;
            float restoringTorque = -_springStiffness * displacementRad;
            float dampingTorque = -_dampingCoeff * (_angularVelocity * Mathf.Deg2Rad);

            float totalTorque = restoringTorque + dampingTorque;
            float angularAccelerationRad = totalTorque / _momentOfInertia;
            float angularAccelerationDeg = angularAccelerationRad * Mathf.Rad2Deg;

            // Integrate velocity & position
            _angularVelocity += angularAccelerationDeg * dt;
            _currentAngle += _angularVelocity * dt;

            // Physical hard stop pin collisions
            if (_currentAngle < _minStopAngle)
            {
                _currentAngle = _minStopAngle;
                if (_angularVelocity < 0f)
                {
                    _angularVelocity = -_angularVelocity * _stopPinRestitution;
                }
            }
            else if (_currentAngle > _maxStopAngle)
            {
                _currentAngle = _maxStopAngle;
                if (_angularVelocity > 0f)
                {
                    _angularVelocity = -_angularVelocity * _stopPinRestitution;
                }
            }
        }

        /// <summary>
        /// Evaluates the angle between the student's line of sight and the dial normal.
        /// In real laboratories, the student aligns view until the needle conceals its mirror reflection.
        /// </summary>
        private void UpdateParallaxOpticalRay()
        {
            var cam = Camera.main;
            if (cam == null) return;

            Vector3 viewDir = (transform.position - cam.transform.position).normalized;
            Vector3 dialNormal = _dialFace != null ? _dialFace.forward : transform.up;

            // Angle between line of sight and perpendicular normal
            float angleOffNormal = Vector3.Angle(-viewDir, dialNormal);
            _parallaxErrorAngle = angleOffNormal;

            // Aligned if viewed within 6 degrees of true perpendicular normal
            _isParallaxAligned = angleOffNormal < 6.5f;
        }

        private void ApplyNeedleTransform()
        {
            if (_needlePivot != null)
            {
                // Deflection rotation around local Z or forward axis
                _needlePivot.localRotation = Quaternion.Euler(0f, 0f, _currentAngle);
            }
        }
    }
}
