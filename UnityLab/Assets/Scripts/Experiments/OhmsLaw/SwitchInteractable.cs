using UnityEngine;
using Visora.Interaction;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Interactive brass plug key switch.
    /// Students click or press [E] to insert/remove the brass key to close/open the circuit.
    /// </summary>
    public class SwitchInteractable : InteractableBase
    {
        [Header("References")]
        [SerializeField] private OhmsLawController _experimentController;
        [SerializeField] private Transform _switchLever;

        [Header("Animation")]
        [SerializeField] private float _insertedY = 0.048f;
        [SerializeField] private float _removedY = 0.082f;
        [SerializeField] private float _animationSpeed = 14f;

        [Header("Audio")]
        [SerializeField] private AudioClip _switchClickSound;
        private AudioSource _audioSource;

        private bool _isClosed;

        public void Configure(OhmsLawController controller, Transform plugTransform)
        {
            _experimentController = controller;
            _switchLever = plugTransform;
            UpdatePrompt();
        }

        protected override void Awake()
        {
            base.Awake();
            _audioSource = GetComponent<AudioSource>();
            if (_audioSource == null)
            {
                _audioSource = gameObject.AddComponent<AudioSource>();
                _audioSource.playOnAwake = false;
                _audioSource.spatialBlend = 1f; // 3D spatialized sound
                _audioSource.volume = 0.7f;
            }

            if (_switchClickSound == null)
            {
                _switchClickSound = CreateProceduralClickSound();
            }

            _isClosed = false;
            if (_experimentController == null)
                _experimentController = FindAnyObjectByType<OhmsLawController>();

            if (_switchLever == null)
                _switchLever = transform.Find("PlugHandle");

            UpdatePrompt();
        }

        private void Start()
        {
            if (_experimentController == null)
                _experimentController = FindAnyObjectByType<OhmsLawController>();

            if (_experimentController != null)
            {
                _experimentController.OnSwitchToggled += HandleSwitchToggled;
                _isClosed = _experimentController.IsSwitchClosed;
                UpdatePrompt();
            }
        }

        private void OnDestroy()
        {
            if (_experimentController != null)
            {
                _experimentController.OnSwitchToggled -= HandleSwitchToggled;
            }
        }

        private void HandleSwitchToggled(bool isClosed)
        {
            _isClosed = isClosed;

            // Tactile audio feedback
            if (_audioSource != null && _switchClickSound != null)
            {
                _audioSource.pitch = _isClosed ? 1.05f : 0.95f;
                _audioSource.PlayOneShot(_switchClickSound);
            }

            UpdatePrompt();
        }

        public override void OnInteract()
        {
            base.OnInteract();

            // Notify experiment controller (which will broadcast OnSwitchToggled)
            if (_experimentController == null)
                _experimentController = FindAnyObjectByType<OhmsLawController>();

            _experimentController?.ToggleSwitch();
        }

        private void Update()
        {
            if (_switchLever == null)
                _switchLever = transform.Find("PlugHandle");
            // Smoothly animate plug key sliding into / out of brass block socket
            if (_switchLever != null)
            {
                float targetY = _isClosed ? _insertedY : _removedY;
                Vector3 p = _switchLever.localPosition;
                float newY = Mathf.Lerp(p.y, targetY, _animationSpeed * Time.deltaTime);
                _switchLever.localPosition = new Vector3(p.x, newY, p.z);
            }
        }

        private void UpdatePrompt()
        {
            SetPrompt(_isClosed ? "Remove Plug Key [E] (Open Circuit)" : "Insert Plug Key [E] (Close Circuit)");
        }

        public bool IsClosed => _isClosed;

        /// <summary>
        /// Synthesizes an authentic metallic click sound procedurally (zero external asset dependency).
        /// </summary>
        private static AudioClip CreateProceduralClickSound()
        {
            int sampleRate = 44100;
            int samples = (int)(sampleRate * 0.08f); // 80ms crisp snap
            float[] data = new float[samples];

            for (int i = 0; i < samples; i++)
            {
                float t = i / (float)sampleRate;
                float decay = Mathf.Exp(-t * 60f);
                float tone1 = Mathf.Sin(2f * Mathf.PI * 1800f * t);
                float tone2 = Mathf.Sin(2f * Mathf.PI * 3400f * t);
                float noise = (Random.value * 2f - 1f) * 0.3f;
                data[i] = (tone1 * 0.5f + tone2 * 0.3f + noise) * decay;
            }

            var clip = AudioClip.Create("PlugKeyClick", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
