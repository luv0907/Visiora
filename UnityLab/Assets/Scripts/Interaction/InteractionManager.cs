using UnityEngine;

namespace Visora.Interaction
{
    /// <summary>
    /// Manages player interactions via raycasting from the camera center.
    /// Detects IInteractable objects, shows prompts, and triggers interactions.
    /// Uses Unity's built-in Input system for zero package dependencies.
    /// </summary>
    public class InteractionManager : MonoBehaviour
    {
        [Header("Raycast Settings")]
        [SerializeField] private float _interactionRange = 3f;
        [SerializeField] private LayerMask _interactableLayer = ~0; // Default: all layers
        [SerializeField] private float _sphereCastRadius = 0.1f;

        [Header("References")]
        [SerializeField] private Transform _cameraTransform;

        private IInteractable _currentTarget;
        private InteractionPromptUI _promptUI;

        private void Start()
        {
            _promptUI = FindAnyObjectByType<InteractionPromptUI>();

            if (_cameraTransform == null)
            {
                var cam = Camera.main;
                if (cam != null) _cameraTransform = cam.transform;
            }
        }

        private void Update()
        {
            CheckForInteractable();
            HandleInteractionInput();
        }

        private void CheckForInteractable()
        {
            if (_cameraTransform == null) return;

            Ray ray = new Ray(_cameraTransform.position, _cameraTransform.forward);

            if (UnityEngine.Physics.SphereCast(ray, _sphereCastRadius, out RaycastHit hit,
                _interactionRange, _interactableLayer))
            {
                var interactable = hit.collider.GetComponentInParent<IInteractable>();

                if (interactable != null && interactable.CanInteract)
                {
                    if (interactable != _currentTarget)
                    {
                        // New target — unfocus old, focus new
                        _currentTarget?.OnUnfocus();
                        _currentTarget = interactable;
                        _currentTarget.OnFocus();

                        _promptUI?.ShowPrompt(_currentTarget.InteractionPrompt);
                    }
                    return;
                }
            }

            // No valid target found
            if (_currentTarget != null)
            {
                _currentTarget.OnUnfocus();
                _currentTarget = null;
                _promptUI?.HidePrompt();
            }
        }

        private void HandleInteractionInput()
        {
            // Interact with E key or left-click when looking at interactable
            if (Input.GetKeyDown(KeyCode.E) || Input.GetMouseButtonDown(0))
            {
                if (_currentTarget != null && _currentTarget.CanInteract)
                {
                    _currentTarget.OnInteract();
                }
            }
        }

        /// <summary>
        /// Direct programmatic trigger for interaction.
        /// </summary>
        public void TriggerInteraction()
        {
            if (_currentTarget != null && _currentTarget.CanInteract)
            {
                _currentTarget.OnInteract();
            }
        }

        /// <summary>
        /// Get the current interaction target (if any).
        /// </summary>
        public IInteractable GetCurrentTarget()
        {
            return _currentTarget;
        }
    }
}
