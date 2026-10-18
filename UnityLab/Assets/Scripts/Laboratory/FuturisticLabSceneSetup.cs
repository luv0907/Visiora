using UnityEngine;

namespace Visora.Laboratory
{
    /// <summary>
    /// Master scene orchestrator for the Futuristic Ohm's Law Lab.
    /// Attach this to an empty GameObject in your scene. On Start(), it will:
    /// 1. Build the futuristic lab room
    /// 2. Spawn the player with first-person controller
    /// 3. Build the experiment apparatus
    /// 4. Set up the HUD
    /// 5. Configure LED animations and environment sync
    /// 6. Wire up holographic displays
    /// 
    /// This is designed to be a one-click scene setup — just add this component
    /// to an empty scene and press Play.
    /// </summary>
    public class FuturisticLabSceneSetup : MonoBehaviour
    {
        [Header("Lab Style")]
        [SerializeField] private bool _useFuturisticLab = true;
        [SerializeField] private bool _autoWireCircuit = false;

        [Header("Player")]
        [SerializeField] private Vector3 _playerSpawnPosition = new Vector3(0f, 0.05f, 1.85f);
        [SerializeField] private float _playerSpawnYaw = 0f; // Facing forward (+Z towards bench)

        [Header("Optional Overrides")]
        [SerializeField] private bool _enableLedAnimations = true;
        [SerializeField] private bool _enableHolographicDisplays = true;
        [SerializeField] private bool _enableEnvironmentSync = true;

        private void Start()
        {
            Debug.Log("[FuturisticLabSetup] Initializing Visiora Futuristic Lab Scene...");

            // ── 1. Build the Lab Room ────────────────────────────────────
            if (_useFuturisticLab)
            {
                var labBuilder = gameObject.AddComponent<FuturisticLabRoomBuilder>();
                // BuildLab() is called automatically in Start()
            }
            else
            {
                var classicBuilder = gameObject.AddComponent<LabRoomBuilder>();
            }

            // ── 2. Spawn Player ──────────────────────────────────────────
            SetupPlayer();

            // ── 3. Experiment Controller & Apparatus ─────────────────────
            // The OhmsLawController handles its own apparatus construction
            // via EnsureApparatusBuilt() in Awake(). Just ensure it exists.
            var controller = FindAnyObjectByType<Visora.Experiments.OhmsLaw.OhmsLawController>();
            if (controller == null)
            {
                var expGo = new GameObject("OhmsLawExperiment");
                expGo.transform.SetParent(transform);
                controller = expGo.AddComponent<Visora.Experiments.OhmsLaw.OhmsLawController>();
            }

            // ── 4. HUD ──────────────────────────────────────────────────
            var hud = FindAnyObjectByType<Visora.UI.LabHUD>();
            if (hud == null)
            {
                var hudGo = new GameObject("LabHUD");
                hudGo.transform.SetParent(transform);
                hudGo.AddComponent<Visora.UI.LabHUD>();
            }

            // ── 5. Interaction Manager ──────────────────────────────────
            var interactionMgr = FindAnyObjectByType<Visora.Interaction.InteractionManager>();
            if (interactionMgr == null)
            {
                var interactGo = new GameObject("InteractionManager");
                interactGo.transform.SetParent(transform);
                interactGo.AddComponent<Visora.Interaction.InteractionManager>();
                interactGo.AddComponent<Visora.Interaction.InteractionPromptUI>();
            }

            // ── 6. LED Pulse Animations ─────────────────────────────────
            if (_enableLedAnimations)
            {
                // LED animations are added post-build to LED strip objects
                StartCoroutine(AttachLedAnimatorsDeferred());
            }

            // ── 7. Environment Sync ─────────────────────────────────────
            if (_enableEnvironmentSync)
            {
                var syncGo = new GameObject("LabEnvironmentSync");
                syncGo.transform.SetParent(transform);
                syncGo.AddComponent<LabEnvironmentSync>();
            }

            // ── 8. Holographic Display Controllers ──────────────────────
            if (_enableHolographicDisplays)
            {
                StartCoroutine(AttachHoloControllersDeferred());
            }

            Debug.Log("[FuturisticLabSetup] Scene setup complete.");
        }

        private void SetupPlayer()
        {
            var existingPlayer = FindAnyObjectByType<Visora.Player.FirstPersonController>();
            if (existingPlayer != null) return;

            var playerGo = new GameObject("Player");
            playerGo.transform.position = _playerSpawnPosition;
            playerGo.transform.rotation = Quaternion.Euler(0, _playerSpawnYaw, 0);

            var cc = playerGo.AddComponent<CharacterController>();
            cc.height = 1.7f;
            cc.radius = 0.3f;
            cc.center = new Vector3(0, 0.85f, 0);

            playerGo.AddComponent<Visora.Player.FirstPersonController>();

            // Ensure main camera is set up
            if (Camera.main == null)
            {
                var camGo = new GameObject("MainCamera");
                camGo.tag = "MainCamera";
                var cam = camGo.AddComponent<Camera>();
                cam.nearClipPlane = 0.05f;
                cam.farClipPlane = 100f;
                cam.fieldOfView = 65f;
                camGo.AddComponent<AudioListener>();
                // The FirstPersonController will parent this camera automatically
            }
        }

        private System.Collections.IEnumerator AttachLedAnimatorsDeferred()
        {
            // Wait for the lab room builder to finish constructing everything
            yield return null;
            yield return null;

            // Find all LED strip objects and attach animators
            var allRenderers = FindObjectsByType<Renderer>(FindObjectsSortMode.None);
            int attached = 0;

            foreach (var rend in allRenderers)
            {
                if (rend.gameObject.name.Contains("LED") || rend.gameObject.name.Contains("Led"))
                {
                    // Don't double-add
                    if (rend.GetComponent<LEDPulseAnimator>() != null) continue;

                    var animator = rend.gameObject.AddComponent<LEDPulseAnimator>();

                    // Set appropriate mode based on LED location
                    if (rend.gameObject.name.Contains("Floor"))
                    {
                        animator.SetMode(LEDPulseAnimator.PulseMode.WaveTravel);
                    }
                    else if (rend.gameObject.name.Contains("Ceil"))
                    {
                        animator.SetMode(LEDPulseAnimator.PulseMode.Breathe);
                    }
                    else if (rend.gameObject.name.Contains("Bench"))
                    {
                        animator.SetMode(LEDPulseAnimator.PulseMode.CircuitSync);
                    }
                    else if (rend.gameObject.name.Contains("Corner"))
                    {
                        animator.SetMode(LEDPulseAnimator.PulseMode.ColorShift);
                    }
                    else if (rend.gameObject.name.Contains("Seat"))
                    {
                        animator.SetMode(LEDPulseAnimator.PulseMode.Heartbeat);
                    }
                    else
                    {
                        animator.SetMode(LEDPulseAnimator.PulseMode.Breathe);
                    }

                    attached++;
                }
            }

            Debug.Log($"[FuturisticLabSetup] Attached {attached} LED pulse animators.");
        }

        private System.Collections.IEnumerator AttachHoloControllersDeferred()
        {
            yield return null;
            yield return null;

            // Attach display controllers to holographic panels
            var holoRoot = GameObject.Find("HolographicDisplays");
            if (holoRoot == null) yield break;

            foreach (Transform child in holoRoot.transform)
            {
                if (child.GetComponent<HolographicDisplayController>() != null) continue;

                var ctrl = child.gameObject.AddComponent<HolographicDisplayController>();

                // Configure display mode based on name
                if (child.name.Contains("Main"))
                {
                    // Main display shows experiment formula info
                    // Default mode is ExperimentInfo
                }
                else if (child.name.Contains("Side"))
                {
                    // Side display shows circuit wiring status
                    SetDisplayMode(ctrl, HolographicDisplayController.DisplayMode.CircuitStatus);
                }
                else if (child.name.Contains("Ceiling"))
                {
                    // Ceiling display shows lab branding
                    SetDisplayMode(ctrl, HolographicDisplayController.DisplayMode.LabBranding);
                }
            }

            Debug.Log("[FuturisticLabSetup] Holographic display controllers configured.");
        }

        private void SetDisplayMode(HolographicDisplayController ctrl, HolographicDisplayController.DisplayMode mode)
        {
            // Use reflection or serialized field assignment via Unity
            // For runtime configuration, we use a public method
            var field = typeof(HolographicDisplayController).GetField("_displayMode",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field != null) field.SetValue(ctrl, mode);
        }
    }
}
