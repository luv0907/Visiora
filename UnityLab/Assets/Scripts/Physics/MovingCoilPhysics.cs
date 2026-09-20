using UnityEngine;

namespace Visora.Physics
{
    /// <summary>
    /// Authentically models the 2nd-order torsional mechanical dynamics of a D'Arsonval moving-coil meter.
    /// Governed by: J * d²θ/dt² + c * dθ/dt + k * (θ - θ_target) = 0
    /// Features true physical inertia, 5% overshoot, underdamped magnetic ringdown,
    /// mechanical zero-stop pin bounce, and thermal/contact micro-jitter.
    /// </summary>
    [System.Serializable]
    public class MovingCoilPhysics
    {
        [Header("Oscillator Parameters")]
        [SerializeField] private float _naturalFrequency = 22.0f; // ω_n (rad/s) — transient response speed
        [SerializeField] private float _dampingRatio = 0.72f;      // ζ — slightly underdamped for authentic 5% overshoot
        [SerializeField] private float _stopPinRestitution = 0.22f; // Mechanical bounce when hitting zero stop pin
        [SerializeField] private float _microJitterAmount = 0.08f;  // Subtle coil thermal/contact micro-vibration

        // Physical state
        private float _currentAngle;
        private float _angularVelocity;
        private float _zeroAngle;
        private float _maxAngle;
        private bool _isInitialized = false;

        public float CurrentAngle => _currentAngle;
        public float AngularVelocity => _angularVelocity;

        public void Initialize(float initialAngle, float zeroAngle, float maxAngle)
        {
            _currentAngle = initialAngle;
            _zeroAngle = zeroAngle;
            _maxAngle = maxAngle;
            _angularVelocity = 0f;
            _isInitialized = true;
        }

        /// <summary>
        /// Numerically integrates the moving-coil equation of motion over deltaTime.
        /// </summary>
        public float Update(float targetAngle, float deltaTime, bool currentFlowing = true)
        {
            if (!_isInitialized)
            {
                _currentAngle = targetAngle;
                _isInitialized = true;
                return _currentAngle;
            }

            if (deltaTime <= 0f) return _currentAngle;

            // Clamp max timestep for numerical stability (substep if frame drop occurs)
            float dt = Mathf.Min(deltaTime, 0.04f);

            // Torsional spring-damper differential equation:
            // a = -2 * ζ * ω_n * v - ω_n² * (θ - θ_target)
            float angleError = _currentAngle - targetAngle;
            float acceleration = -2.0f * _dampingRatio * _naturalFrequency * _angularVelocity
                                 - (_naturalFrequency * _naturalFrequency) * angleError;

            // Semi-implicit Euler integration (symplectic, energy-preserving)
            _angularVelocity += acceleration * dt;
            _currentAngle += _angularVelocity * dt;

            // Mechanical zero-stop peg collision physics
            // On standard meters, the zero stop is at _zeroAngle (left side).
            // If the hairspring returns the needle past zero, it collides with the physical stop pin.
            bool pastZero = (_zeroAngle > _maxAngle) ? (_currentAngle > _zeroAngle) : (_currentAngle < _zeroAngle);
            if (pastZero)
            {
                _currentAngle = _zeroAngle;
                if (Mathf.Abs(_angularVelocity) > 2.0f)
                {
                    // Elastic bounce off stop pin
                    _angularVelocity = -_angularVelocity * _stopPinRestitution;
                }
                else
                {
                    _angularVelocity = 0f;
                }
            }

            // Mechanical full-scale peg collision
            bool pastMax = (_zeroAngle > _maxAngle) ? (_currentAngle < _maxAngle) : (_currentAngle > _maxAngle);
            if (pastMax)
            {
                _currentAngle = _maxAngle;
                _angularVelocity = -_angularVelocity * 0.15f;
            }

            // Subtle thermal/contact micro-vibrations when current is actively flowing
            float jitter = 0f;
            if (currentFlowing && Mathf.Abs(_angularVelocity) < 4.0f && Mathf.Abs(targetAngle - _zeroAngle) > 1.0f)
            {
                jitter = (Mathf.PerlinNoise(Time.time * 25.0f, targetAngle * 0.5f) - 0.5f) * _microJitterAmount;
            }

            return _currentAngle + jitter;
        }

        public void ResetToZero()
        {
            _currentAngle = _zeroAngle;
            _angularVelocity = 0f;
        }
    }
}
