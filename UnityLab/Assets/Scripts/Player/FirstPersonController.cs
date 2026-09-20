using UnityEngine;

namespace Visora.Player
{
    /// <summary>
    /// Production-quality first-person controller.
    /// Uses Unity's built-in Input system for maximum stability and zero package dependencies.
    /// Realistic grounded movement with smooth acceleration/deceleration.
    /// Designed for a laboratory environment (no jumping, no crouching).
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class FirstPersonController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float _walkSpeed = 3.5f;
        [SerializeField] private float _sprintSpeed = 5.5f;
        [SerializeField] private float _acceleration = 10f;
        [SerializeField] private float _deceleration = 12f;
        [SerializeField] private float _gravity = -9.81f;

        [Header("Mouse Look")]
        [SerializeField] private float _mouseSensitivity = 2f;
        [SerializeField] private float _maxLookAngle = 80f;
        [SerializeField] private float _lookSmoothing = 0.05f;

        [Header("Player Dimensions")]
        [SerializeField] private float _playerHeight = 1.7f;
        [SerializeField] private float _eyeHeight = 1.6f;

        [Header("References")]
        [SerializeField] private Transform _cameraHolder;

        private CharacterController _characterController;
        private Vector2 _moveInput;
        private Vector2 _lookInput;
        private bool _isSprinting;

        private Vector3 _currentVelocity;
        private float _verticalVelocity;
        private float _xRotation;
        private Vector2 _currentLookVelocity;
        private Vector2 _lookSmoothVelocity;

        private bool _inputEnabled = true;

        private void Awake()
        {
            _characterController = GetComponent<CharacterController>();

            if (_cameraHolder == null)
            {
                // Create camera holder at eye height
                var holder = new GameObject("CameraHolder");
                holder.transform.SetParent(transform);
                holder.transform.localPosition = new Vector3(0f, _eyeHeight, 0f);
                _cameraHolder = holder.transform;

                // Move or create main camera
                var mainCam = Camera.main;
                if (mainCam != null)
                {
                    mainCam.transform.SetParent(_cameraHolder);
                    mainCam.transform.localPosition = Vector3.zero;
                    mainCam.transform.localRotation = Quaternion.identity;
                }
            }
        }

        private void Start()
        {
            // Lock cursor for first-person control
            SetCursorState(false);

            // Configure character controller
            _characterController.height = _playerHeight;
            _characterController.center = new Vector3(0f, _playerHeight / 2f, 0f);
            _characterController.radius = 0.3f;
        }

        private void Update()
        {
            // Toggle cursor lock with Alt or Escape
            if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.LeftAlt))
            {
                SetCursorState(!Cursor.visible);
            }
            // Re-lock cursor on left click if clicking into 3D scene
            else if (Input.GetMouseButtonDown(0) && Cursor.visible)
            {
                // Don't re-lock if clicking over GUI buttons
                if (!IsPointerOverHUD())
                {
                    SetCursorState(false);
                }
            }

            if (!_inputEnabled) return;

            ReadInputs();
            HandleMouseLook();
            HandleMovement();
            HandleGravity();
        }

        private bool IsPointerOverHUD()
        {
            // Simple heuristic for IMGUI areas (top banner, left card, right card, bottom bar)
            Vector2 mp = Input.mousePosition;
            float my = Screen.height - mp.y; // GUI Y is inverted
            float mx = mp.x;

            // Bottom toolbar area
            if (my > Screen.height - 70) return true;
            // Top banner area
            if (my < 70) return true;
            // Left card area
            if (mx < 380 && my < 340) return true;
            // Right card area
            if (mx > Screen.width - 480 && my < 580) return true;

            return false;
        }

        private void ReadInputs()
        {
            // Standard WASD / Arrow keys
            float horizontal = Input.GetAxisRaw("Horizontal");
            float vertical = Input.GetAxisRaw("Vertical");
            _moveInput = new Vector2(horizontal, vertical).normalized;

            // Mouse look: active when cursor is locked OR when holding Right Mouse Button
            bool isLooking = (Cursor.lockState == CursorLockMode.Locked) || Input.GetMouseButton(1);
            if (isLooking)
            {
                _lookInput = new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y"));
            }
            else
            {
                _lookInput = Vector2.zero;
            }

            _isSprinting = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        }

        private void HandleMouseLook()
        {
            // Smooth the look input for a polished feel
            Vector2 targetLookVelocity = _lookInput * _mouseSensitivity;
            _currentLookVelocity = Vector2.SmoothDamp(
                _currentLookVelocity,
                targetLookVelocity,
                ref _lookSmoothVelocity,
                _lookSmoothing
            );

            // Vertical rotation (pitch) — clamped
            _xRotation -= _currentLookVelocity.y;
            _xRotation = Mathf.Clamp(_xRotation, -_maxLookAngle, _maxLookAngle);
            if (_cameraHolder != null)
            {
                _cameraHolder.localRotation = Quaternion.Euler(_xRotation, 0f, 0f);
            }

            // Horizontal rotation (yaw)
            transform.Rotate(Vector3.up * _currentLookVelocity.x);
        }

        private void HandleMovement()
        {
            float targetSpeed = _isSprinting ? _sprintSpeed : _walkSpeed;
            Vector3 targetDirection = transform.right * _moveInput.x + transform.forward * _moveInput.y;
            Vector3 targetVelocity = targetDirection * targetSpeed;

            // Smooth acceleration/deceleration for grounded feel
            float smoothRate = targetDirection.magnitude > 0.1f ? _acceleration : _deceleration;
            _currentVelocity = Vector3.Lerp(_currentVelocity, targetVelocity, smoothRate * Time.deltaTime);

            _characterController.Move(_currentVelocity * Time.deltaTime);
        }

        private void HandleGravity()
        {
            if (_characterController.isGrounded)
            {
                _verticalVelocity = -2f; // Small downward force to keep grounded
            }
            else
            {
                _verticalVelocity += _gravity * Time.deltaTime;
            }

            _characterController.Move(Vector3.up * _verticalVelocity * Time.deltaTime);
        }

        // ── Public API ──────────────────────────────────────────────

        /// <summary>
        /// Enable/disable player input (e.g., during UI interaction).
        /// </summary>
        public void SetInputEnabled(bool enabled)
        {
            _inputEnabled = enabled;
            if (!enabled)
            {
                _moveInput = Vector2.zero;
                _lookInput = Vector2.zero;
                _currentVelocity = Vector3.zero;
            }
        }

        /// <summary>
        /// Show/hide cursor (e.g., for experiment UI interaction).
        /// </summary>
        public void SetCursorState(bool visible)
        {
            Cursor.visible = visible;
            Cursor.lockState = visible ? CursorLockMode.None : CursorLockMode.Locked;
        }

        /// <summary>
        /// Get the camera transform for raycasting from the player's view.
        /// </summary>
        public Transform GetCameraTransform()
        {
            return _cameraHolder;
        }
    }
}
