using UnityEngine;

namespace Visora.Laboratory
{
    /// <summary>
    /// Animates LED strips with subtle pulsing, breathing, and color-shift effects.
    /// Attach to any GameObject with Renderer components that use emissive materials.
    /// Provides that "alive" feeling to the futuristic lab environment.
    /// </summary>
    public class LEDPulseAnimator : MonoBehaviour
    {
        public enum PulseMode
        {
            Breathe,        // Smooth sine-wave brightness oscillation
            Heartbeat,      // Quick double-pulse then pause
            WaveTravel,     // Sequential brightness sweep (requires multiple strips)
            ColorShift,     // Gradual hue rotation between two colors
            CircuitSync,    // Pulses in response to circuit events
            Static          // No animation, just constant glow
        }

        [Header("Pulse Settings")]
        [SerializeField] private PulseMode _mode = PulseMode.Breathe;
        [SerializeField] private float _speed = 1.0f;
        [SerializeField] private float _minIntensity = 1.5f;
        [SerializeField] private float _maxIntensity = 4.0f;

        [Header("Color Settings")]
        [SerializeField] private Color _baseColor = new Color(0.0f, 0.92f, 1.0f); // Cyan
        [SerializeField] private Color _altColor  = new Color(0.95f, 0.15f, 0.85f); // Magenta
        [SerializeField] private float _colorShiftSpeed = 0.3f;

        [Header("Wave Settings (WaveTravel mode)")]
        [SerializeField] private float _wavePhaseOffset = 0.5f;
        [SerializeField] private int _waveIndex = 0; // Position in the wave sequence

        private Renderer _renderer;
        private Material _material;
        private Color _originalEmission;
        private float _time;
        private static readonly int EmissionColorId = Shader.PropertyToID("_EmissionColor");

        private void Awake()
        {
            _renderer = GetComponent<Renderer>();
            if (_renderer == null) _renderer = GetComponentInChildren<Renderer>();
        }

        private void Start()
        {
            if (_renderer != null)
            {
                _material = _renderer.material; // Instance the material
                if (_material.HasProperty(EmissionColorId))
                {
                    _originalEmission = _material.GetColor(EmissionColorId);
                }
                else
                {
                    _originalEmission = _baseColor * _minIntensity;
                }
            }
        }

        private void Update()
        {
            if (_material == null || _mode == PulseMode.Static) return;

            _time += Time.deltaTime * _speed;
            float intensity;
            Color color;

            switch (_mode)
            {
                case PulseMode.Breathe:
                    intensity = Mathf.Lerp(_minIntensity, _maxIntensity,
                        (Mathf.Sin(_time * Mathf.PI * 2f) + 1f) * 0.5f);
                    SetEmission(_baseColor * intensity);
                    break;

                case PulseMode.Heartbeat:
                    float phase = _time % 2.0f;
                    if (phase < 0.12f)
                        intensity = Mathf.Lerp(_minIntensity, _maxIntensity, phase / 0.12f);
                    else if (phase < 0.24f)
                        intensity = Mathf.Lerp(_maxIntensity, _minIntensity, (phase - 0.12f) / 0.12f);
                    else if (phase < 0.40f)
                        intensity = Mathf.Lerp(_minIntensity, _maxIntensity * 0.8f, (phase - 0.24f) / 0.16f);
                    else if (phase < 0.56f)
                        intensity = Mathf.Lerp(_maxIntensity * 0.8f, _minIntensity, (phase - 0.40f) / 0.16f);
                    else
                        intensity = _minIntensity;
                    SetEmission(_baseColor * intensity);
                    break;

                case PulseMode.WaveTravel:
                    float wavePhase = _time + _waveIndex * _wavePhaseOffset;
                    intensity = Mathf.Lerp(_minIntensity, _maxIntensity,
                        (Mathf.Sin(wavePhase * Mathf.PI * 2f) + 1f) * 0.5f);
                    SetEmission(_baseColor * intensity);
                    break;

                case PulseMode.ColorShift:
                    float t = (Mathf.Sin(_time * _colorShiftSpeed * Mathf.PI * 2f) + 1f) * 0.5f;
                    color = Color.Lerp(_baseColor, _altColor, t);
                    intensity = Mathf.Lerp(_minIntensity, _maxIntensity, t);
                    SetEmission(color * intensity);
                    break;

                case PulseMode.CircuitSync:
                    // Default: gentle breathe; overridden by external Pulse() calls
                    intensity = Mathf.Lerp(_minIntensity, _maxIntensity * 0.6f,
                        (Mathf.Sin(_time * 0.5f * Mathf.PI * 2f) + 1f) * 0.5f);
                    SetEmission(_baseColor * intensity);
                    break;
            }
        }

        /// <summary>
        /// Trigger a bright flash pulse (for circuit events like switch toggle, wire connection).
        /// </summary>
        public void TriggerFlash(Color flashColor, float duration = 0.3f)
        {
            StopAllCoroutines();
            StartCoroutine(FlashCoroutine(flashColor, duration));
        }

        private System.Collections.IEnumerator FlashCoroutine(Color flashColor, float duration)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                float flashIntensity = Mathf.Lerp(_maxIntensity * 2.5f, _minIntensity, t);
                SetEmission(Color.Lerp(flashColor, _baseColor, t) * flashIntensity);
                yield return null;
            }
        }

        /// <summary>
        /// Set the color and restart the animation.
        /// </summary>
        public void SetColor(Color newColor)
        {
            _baseColor = newColor;
        }

        /// <summary>
        /// Configure the pulse mode at runtime.
        /// </summary>
        public void SetMode(PulseMode mode) => _mode = mode;

        private void SetEmission(Color emissionColor)
        {
            if (_material == null) return;
            _material.EnableKeyword("_EMISSION");
            _material.SetColor(EmissionColorId, emissionColor);
            _material.SetColor("_BaseColor", _baseColor);
        }

        private void OnDestroy()
        {
            // Clean up instanced material
            if (_material != null && Application.isPlaying)
            {
                Destroy(_material);
            }
        }
    }
}
