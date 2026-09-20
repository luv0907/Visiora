using UnityEngine;

namespace Visora.Interaction
{
    /// <summary>
    /// Base class for interactable objects in the laboratory.
    /// Provides common interaction behaviour (highlight, outline, tooltip).
    /// Derive from this for specific lab equipment.
    /// </summary>
    public abstract class InteractableBase : MonoBehaviour, IInteractable
    {
        [Header("Interaction Settings")]
        [SerializeField] private string _interactionPrompt = "Interact";
        [SerializeField] private bool _canInteract = true;

        [Header("Visual Feedback")]
        [SerializeField] private Color _highlightColor = new Color(0.3f, 0.7f, 1f, 1f);
        [SerializeField] private float _highlightIntensity = 0.3f;

        private Renderer[] _renderers;
        private MaterialPropertyBlock _propertyBlock;
        private bool _isFocused;

        public string InteractionPrompt => _interactionPrompt;
        public bool CanInteract => _canInteract;

        protected virtual void Awake()
        {
            _renderers = GetComponentsInChildren<Renderer>();
            _propertyBlock = new MaterialPropertyBlock();
        }

        public virtual void OnInteract()
        {
            // Override in derived classes for specific interaction behaviour
            Debug.Log($"[Interaction] {gameObject.name}: {_interactionPrompt}");
        }

        public virtual void OnFocus()
        {
            if (_isFocused) return;
            _isFocused = true;

            // Apply subtle highlight to indicate interactability
            foreach (var renderer in _renderers)
            {
                renderer.GetPropertyBlock(_propertyBlock);
                _propertyBlock.SetColor("_EmissionColor", _highlightColor * _highlightIntensity);
                renderer.SetPropertyBlock(_propertyBlock);
            }
        }

        public virtual void OnUnfocus()
        {
            if (!_isFocused) return;
            _isFocused = false;

            // Remove highlight
            foreach (var renderer in _renderers)
            {
                renderer.GetPropertyBlock(_propertyBlock);
                _propertyBlock.SetColor("_EmissionColor", Color.black);
                renderer.SetPropertyBlock(_propertyBlock);
            }
        }

        /// <summary>
        /// Set whether this object can be interacted with.
        /// </summary>
        protected void SetInteractable(bool canInteract)
        {
            _canInteract = canInteract;
        }

        /// <summary>
        /// Update the interaction prompt text.
        /// </summary>
        protected void SetPrompt(string prompt)
        {
            _interactionPrompt = prompt;
        }
    }
}
