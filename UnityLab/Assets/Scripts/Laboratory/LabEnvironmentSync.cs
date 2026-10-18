using UnityEngine;
using Visora.Experiments.OhmsLaw;
using Visora.Experiments.OhmsLaw.Wiring;

namespace Visora.Laboratory
{
    /// <summary>
    /// Synchronizes all LED accent strips, holographic displays, and ambient lighting
    /// with circuit experiment events. Creates a reactive "smart lab" experience where
    /// the environment responds to student actions.
    /// 
    /// Events that trigger LED responses:
    /// - Wire connected → green flash ripple
    /// - Wire disconnected → amber flash
    /// - Switch toggled ON → cyan sweep + warm ambient boost
    /// - Switch toggled OFF → fade to resting cyan
    /// - Circuit fully wired → celebration: rainbow wave + all LEDs green pulse
    /// - Fuse blown → red alarm flash on all strips
    /// - Reading recorded → blue confirmation pulse
    /// </summary>
    public class LabEnvironmentSync : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private OhmsLawController _controller;
        [SerializeField] private InteractiveWiringManager _wiringManager;

        [Header("Ambient Lighting")]
        [SerializeField] private Light _ambientFill;
        [SerializeField] private float _ambientIdleIntensity = 1.2f;
        [SerializeField] private float _ambientActiveIntensity = 1.8f;

        private LEDPulseAnimator[] _allLedAnimators;
        private Light[] _allLights;
        private float _targetAmbientIntensity;
        private bool _subscribedToEvents = false;

        private void Start()
        {
            // Deferred initialization to ensure all components are ready
            StartCoroutine(DeferredInit());
        }

        private System.Collections.IEnumerator DeferredInit()
        {
            yield return null; // Wait one frame

            if (_controller == null) _controller = FindAnyObjectByType<OhmsLawController>();
            if (_wiringManager == null) _wiringManager = FindAnyObjectByType<InteractiveWiringManager>();

            // Gather all LED animators in the scene
            _allLedAnimators = FindObjectsByType<LEDPulseAnimator>(FindObjectsSortMode.None);
            _allLights = FindObjectsByType<Light>(FindObjectsSortMode.None);

            if (_ambientFill == null)
            {
                foreach (var l in _allLights)
                {
                    if (l.type == LightType.Directional && l.name.Contains("Fill"))
                    {
                        _ambientFill = l;
                        break;
                    }
                }
            }

            _targetAmbientIntensity = _ambientIdleIntensity;

            SubscribeToEvents();
        }

        private void SubscribeToEvents()
        {
            if (_subscribedToEvents) return;

            if (_controller != null)
            {
                _controller.OnSwitchToggled += OnSwitchToggled;
                _controller.OnCircuitUpdated += OnCircuitUpdated;
            }

            if (_wiringManager != null)
            {
                _wiringManager.OnCircuitTopologyChanged += OnTopologyChanged;
            }

            _subscribedToEvents = true;
        }

        private void Update()
        {
            // Smooth ambient light transitions
            if (_ambientFill != null)
            {
                _ambientFill.intensity = Mathf.Lerp(
                    _ambientFill.intensity,
                    _targetAmbientIntensity,
                    Time.deltaTime * 3.0f);
            }
        }

        // ── Event Handlers ──────────────────────────────────────────────

        private void OnSwitchToggled(bool isClosed)
        {
            if (isClosed)
            {
                // Switch ON → Energize the lab with warm lighting boost
                _targetAmbientIntensity = _ambientActiveIntensity;
                FlashAllLeds(FuturisticLabMaterials.CyanGlow, 0.4f);
                Debug.Log("[LabSync] Circuit energized — LED sweep activated");
            }
            else
            {
                // Switch OFF → Return to idle state
                _targetAmbientIntensity = _ambientIdleIntensity;
                FlashAllLeds(new Color(0.3f, 0.5f, 0.7f), 0.25f);
                Debug.Log("[LabSync] Circuit de-energized — returning to idle");
            }
        }

        private void OnCircuitUpdated(float voltage, float current)
        {
            // Dynamic LED color based on current flow intensity
            if (_allLedAnimators == null) return;

            float normalizedCurrent = Mathf.Clamp01(current / 0.5f); // 0.5A = full brightness
            Color activeColor = Color.Lerp(FuturisticLabMaterials.CyanGlow, FuturisticLabMaterials.GreenGlow, normalizedCurrent);

            foreach (var led in _allLedAnimators)
            {
                if (led != null && led.isActiveAndEnabled)
                {
                    led.SetColor(current > 0.001f ? activeColor : FuturisticLabMaterials.CyanGlow);
                }
            }
        }

        private void OnTopologyChanged(CircuitTopologyStatus status, string message)
        {
            switch (status)
            {
                case CircuitTopologyStatus.FullyWired:
                    // Celebration: all LEDs flash green
                    FlashAllLeds(FuturisticLabMaterials.GreenGlow, 0.6f);
                    _targetAmbientIntensity = _ambientActiveIntensity;
                    Debug.Log("[LabSync] ✅ Circuit complete — celebration pulse!");
                    break;

                case CircuitTopologyStatus.Incomplete:
                    // Progress indicator: amber pulse
                    FlashAllLeds(FuturisticLabMaterials.AmberGlow, 0.3f);
                    break;

                case CircuitTopologyStatus.Unwired:
                    // Reset to resting state
                    ResetAllLeds();
                    _targetAmbientIntensity = _ambientIdleIntensity;
                    break;

                case CircuitTopologyStatus.ShortCircuitFault:
                case CircuitTopologyStatus.SupplyShortCircuitFault:
                    // Alarm: red flash
                    FlashAllLeds(new Color(1f, 0.1f, 0.1f), 0.5f);
                    _targetAmbientIntensity = _ambientIdleIntensity * 0.7f; // Dim slightly
                    Debug.LogWarning("[LabSync] ⚠️ Short circuit detected — alarm flash!");
                    break;
            }
        }

        // ── LED Control Methods ─────────────────────────────────────────

        private void FlashAllLeds(Color flashColor, float duration)
        {
            if (_allLedAnimators == null) return;

            foreach (var led in _allLedAnimators)
            {
                if (led != null && led.isActiveAndEnabled)
                {
                    led.TriggerFlash(flashColor, duration);
                }
            }
        }

        private void ResetAllLeds()
        {
            if (_allLedAnimators == null) return;

            foreach (var led in _allLedAnimators)
            {
                if (led != null)
                {
                    led.SetColor(FuturisticLabMaterials.CyanGlow);
                    led.SetMode(LEDPulseAnimator.PulseMode.Breathe);
                }
            }
        }

        /// <summary>
        /// External API: Flash a success confirmation (e.g., when a reading is recorded).
        /// </summary>
        public void FlashSuccess()
        {
            FlashAllLeds(FuturisticLabMaterials.GreenGlow, 0.3f);
        }

        /// <summary>
        /// External API: Flash a warning (e.g., invalid operation).
        /// </summary>
        public void FlashWarning()
        {
            FlashAllLeds(FuturisticLabMaterials.AmberGlow, 0.4f);
        }

        private void OnDestroy()
        {
            if (_controller != null)
            {
                _controller.OnSwitchToggled -= OnSwitchToggled;
                _controller.OnCircuitUpdated -= OnCircuitUpdated;
            }
            if (_wiringManager != null)
            {
                _wiringManager.OnCircuitTopologyChanged -= OnTopologyChanged;
            }
        }
    }
}
