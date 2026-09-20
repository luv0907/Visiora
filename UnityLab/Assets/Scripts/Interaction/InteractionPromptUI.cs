using UnityEngine;
using TMPro;

namespace Visora.Interaction
{
    /// <summary>
    /// UI element that shows interaction prompts when the player
    /// is looking at an interactable object.
    /// </summary>
    public class InteractionPromptUI : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private GameObject _promptPanel;
        [SerializeField] private TextMeshProUGUI _promptText;
        [SerializeField] private TextMeshProUGUI _keyHintText;

        [Header("Animation")]
        [SerializeField] private float _fadeSpeed = 8f;

        private CanvasGroup _canvasGroup;
        private bool _isVisible;
        private float _targetAlpha;

        private void Awake()
        {
            _canvasGroup = _promptPanel?.GetComponent<CanvasGroup>();
            if (_canvasGroup == null && _promptPanel != null)
            {
                _canvasGroup = _promptPanel.AddComponent<CanvasGroup>();
            }

            if (_canvasGroup != null) _canvasGroup.alpha = 0f;
            if (_keyHintText != null) _keyHintText.text = "[E]";
        }

        private void Update()
        {
            if (_canvasGroup == null) return;
            _canvasGroup.alpha = Mathf.Lerp(_canvasGroup.alpha, _targetAlpha, _fadeSpeed * Time.deltaTime);
        }

        public void ShowPrompt(string text)
        {
            if (_promptText != null) _promptText.text = text;
            _targetAlpha = 1f;
            _isVisible = true;
        }

        public void HidePrompt()
        {
            _targetAlpha = 0f;
            _isVisible = false;
        }
    }
}
