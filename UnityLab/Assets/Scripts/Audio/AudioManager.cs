using UnityEngine;
using Visora.Core;

namespace Visora.Audio
{
    /// <summary>
    /// Central audio manager for the Visora Virtual Lab.
    /// Handles ambient sounds, SFX, and spatial audio.
    /// Uses object pooling to avoid runtime allocations.
    /// </summary>
    public class AudioManager : Singleton<AudioManager>
    {
        [Header("Ambient")]
        [SerializeField] private AudioClip _labAmbientHum;
        [SerializeField] private float _ambientVolume = 0.15f;

        [Header("SFX")]
        [SerializeField] private AudioClip _switchClickSound;
        [SerializeField] private AudioClip _knobTurnSound;
        [SerializeField] private AudioClip _buttonPressSound;
        [SerializeField] private AudioClip _dataRecordSound;
        [SerializeField] private AudioClip _experimentCompleteSound;

        [Header("Pool")]
        [SerializeField] private int _sfxPoolSize = 8;

        private AudioSource _ambientSource;
        private AudioSource[] _sfxPool;
        private int _poolIndex = 0;

        private float _masterVolume = 1f;
        private bool _isMuted = false;

        protected override void Awake()
        {
            base.Awake();
            SetupAmbientSource();
            SetupSFXPool();
        }

        private void SetupAmbientSource()
        {
            _ambientSource = gameObject.AddComponent<AudioSource>();
            _ambientSource.clip = _labAmbientHum;
            _ambientSource.loop = true;
            _ambientSource.volume = _ambientVolume;
            _ambientSource.spatialBlend = 0f; // 2D — fills the entire lab space
            _ambientSource.playOnAwake = false;

            if (_labAmbientHum != null)
                _ambientSource.Play();
        }

        private void SetupSFXPool()
        {
            _sfxPool = new AudioSource[_sfxPoolSize];
            for (int i = 0; i < _sfxPoolSize; i++)
            {
                var go = new GameObject($"SFX_Pool_{i}");
                go.transform.SetParent(transform);
                _sfxPool[i] = go.AddComponent<AudioSource>();
                _sfxPool[i].spatialBlend = 0f;
                _sfxPool[i].playOnAwake = false;
            }
        }

        // ── Public SFX Methods ────────────────────────────────────────

        public void PlaySwitchClick() => PlaySFX(_switchClickSound);
        public void PlayKnobTurn()   => PlaySFX(_knobTurnSound);
        public void PlayButtonPress() => PlaySFX(_buttonPressSound);
        public void PlayDataRecord() => PlaySFX(_dataRecordSound);
        public void PlayExperimentComplete() => PlaySFX(_experimentCompleteSound);

        /// <summary>
        /// Play a spatial 3D sound at a world position (e.g., equipment click).
        /// </summary>
        public void PlaySFXAt(AudioClip clip, Vector3 worldPosition, float volume = 1f)
        {
            if (clip == null || _isMuted) return;
            AudioSource.PlayClipAtPoint(clip, worldPosition, volume * _masterVolume);
        }

        public void SetMasterVolume(float volume)
        {
            _masterVolume = Mathf.Clamp01(volume);
            UpdateAllVolumes();
        }

        public void SetMuted(bool muted)
        {
            _isMuted = muted;
            _ambientSource.mute = muted;
        }

        private void PlaySFX(AudioClip clip)
        {
            if (clip == null || _isMuted) return;

            // Grab next pool slot
            var source = _sfxPool[_poolIndex];
            _poolIndex = (_poolIndex + 1) % _sfxPoolSize;

            source.clip = clip;
            source.volume = _masterVolume;
            source.Play();
        }

        private void UpdateAllVolumes()
        {
            if (_ambientSource != null)
                _ambientSource.volume = _ambientVolume * _masterVolume;

            foreach (var src in _sfxPool)
                if (src != null) src.volume = _masterVolume;
        }
    }
}
