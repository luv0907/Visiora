using System.Collections.Generic;
using UnityEngine;
using Visora.Laboratory;

namespace Visora.Experiments.OhmsLaw.Wiring
{
    /// <summary>
    /// Professional student-driven interactive cable wiring manager.
    /// Enables students to pick up test leads, drag flexible 3D cables, seat banana plugs into binding posts,
    /// and solve the live circuit network in real-time.
    /// </summary>
    public class InteractiveWiringManager : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private OhmsLawController _controller;
        [SerializeField] private Transform _wiringRoot;

        [Header("Wiring Materials")]
        private Material _wireRedMat;
        private Material _wireBlackMat;
        private Material _wireYellowMat;
        private Material _bananaPlugBrassMat;
        private Material _bananaPlugPlasticRed;
        private Material _bananaPlugPlasticBlack;
        private Material _bananaPlugPlasticYellow;

        [Header("Audio")]
        private AudioSource _audioSource;
        private AudioClip _plugSnapSound;

        // Active dragging state
        private BindingPost _activeStartPost = null;
        private GameObject _dragPreviewWire = null;
        private LineRenderer _previewLineRenderer = null;
        private BindingPost _hoveredPost = null;

        // Solver
        private CircuitNetworkSolver _solver = new CircuitNetworkSolver();
        public CircuitNetworkSolver Solver => _solver;

        public static InteractiveWiringManager Instance { get; private set; }
        public CircuitTopologyStatus CurrentStatus { get; private set; } = CircuitTopologyStatus.Unwired;
        public string CurrentStatusMessage { get; private set; } = "Circuit unwired. Connect terminals using test leads.";

        public event System.Action<CircuitTopologyStatus, string> OnCircuitTopologyChanged;

        private void Awake()
        {
            Instance = this;

            if (_controller == null) _controller = GetComponent<OhmsLawController>();
            if (_controller == null) _controller = FindAnyObjectByType<OhmsLawController>();

            if (_wiringRoot == null)
            {
                var existing = GameObject.Find("CircuitWiring");
                if (existing != null) _wiringRoot = existing.transform;
                else
                {
                    var go = new GameObject("CircuitWiring");
                    go.transform.SetParent(transform);
                    _wiringRoot = go.transform;
                }
            }

            LoadMaterials();
            SetupAudio();
        }

        [Header("Configuration")]
        [SerializeField] private bool _autoWireOnStartup = false;

        private System.Collections.IEnumerator Start()
        {
            // Wait one frame so all BindingPost components finish Awake()
            yield return null;
            if (_autoWireOnStartup)
            {
                AutoWireStandardCircuit();
            }
            else
            {
                ClearAllWires();
                EvaluateCircuitStatus();
            }
        }

        /// <summary>
        /// Teacher Mode tool: instantly connects the verified 7-lead circuit for demonstration.
        /// </summary>
        public void TeacherAutoWire()
        {
            AutoWireStandardCircuit();
        }

        private void LoadMaterials()
        {
            _wireRedMat    = VisoraLabMaterials.GetMaterial("Lab_WireRed");
            _wireBlackMat  = VisoraLabMaterials.GetMaterial("Lab_WireBlack");
            _wireYellowMat = VisoraLabMaterials.GetMaterial("Lab_WireYellow");
            _bananaPlugBrassMat = VisoraLabMaterials.GetMaterial("Lab_Brass");
        }

        private void SetupAudio()
        {
            _audioSource = GetComponent<AudioSource>();
            if (_audioSource == null)
            {
                _audioSource = gameObject.AddComponent<AudioSource>();
                _audioSource.playOnAwake = false;
                _audioSource.spatialBlend = 0.5f;
            }
            _plugSnapSound = CreateSnapSound();
        }

        private void Update()
        {
            HandleReticleRaycast();
            HandleInteractionInput();
            UpdateDragPreview();
        }

        private void HandleReticleRaycast()
        {
            var cam = Camera.main;
            if (cam == null) return;

            Ray ray = new Ray(cam.transform.position, cam.transform.forward);
            if (UnityEngine.Physics.Raycast(ray, out RaycastHit hit, 3.5f))
            {
                var post = hit.collider.GetComponentInParent<BindingPost>();
                if (post != null)
                {
                    if (_hoveredPost != post)
                    {
                        if (_hoveredPost != null) _hoveredPost.SetHovered(false);
                        _hoveredPost = post;
                        _hoveredPost.SetHovered(true);
                    }
                    return;
                }
            }

            if (_hoveredPost != null)
            {
                _hoveredPost.SetHovered(false);
                _hoveredPost = null;
            }
        }

        private void HandleInteractionInput()
        {
            // Left click or [E] to connect/disconnect terminals
            if (Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.E))
            {
                if (_hoveredPost != null)
                {
                    OnTerminalClicked(_hoveredPost);
                }
                else if (_activeStartPost != null)
                {
                    // Clicked in empty space -> cancel dragging
                    CancelDragging();
                }
            }

            // Right click, [X], or [Escape] cancels dragging or disconnects hovered terminal
            if (Input.GetMouseButtonDown(1) || Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.X))
            {
                if (_activeStartPost != null)
                {
                    CancelDragging();
                }
                else if (_hoveredPost != null)
                {
                    DisconnectTerminal(_hoveredPost);
                }
            }
        }

        public void DisconnectTerminal(BindingPost post)
        {
            var toRemove = new List<TerminalId>();
            foreach (var c in _solver.Connections)
            {
                if (c.From == post.Terminal) toRemove.Add(c.To);
                else if (c.To == post.Terminal) toRemove.Add(c.From);
            }

            foreach (var other in toRemove)
            {
                _solver.RemoveConnection(post.Terminal, other);
            }

            post.SetConnected(false);
            PlaySnapSound(0.85f);
            EvaluateCircuitStatus();
        }

        private void OnTerminalClicked(BindingPost post)
        {
            if (_activeStartPost == null)
            {
                // Start drawing wire from this terminal
                _activeStartPost = post;
                StartDragPreview(post.SocketPosition);
                PlaySnapSound(1.15f);
            }
            else
            {
                if (_activeStartPost == post)
                {
                    // Clicked same terminal -> cancel
                    CancelDragging();
                    return;
                }

                // Complete connection between _activeStartPost and post
                CompleteWireConnection(_activeStartPost, post);
                CancelDragging();
            }
        }

        private void StartDragPreview(Vector3 origin)
        {
            if (_dragPreviewWire != null) Destroy(_dragPreviewWire);

            _dragPreviewWire = new GameObject("DragPreviewWire");
            _previewLineRenderer = _dragPreviewWire.AddComponent<LineRenderer>();
            _previewLineRenderer.startWidth = 0.008f;
            _previewLineRenderer.endWidth = 0.008f;
            _previewLineRenderer.positionCount = 16;
            _previewLineRenderer.material = GetWireMaterialForTerminal(_activeStartPost.Terminal);
        }

        private void UpdateDragPreview()
        {
            if (_activeStartPost == null || _previewLineRenderer == null) return;

            Vector3 startPos = _activeStartPost.SocketPosition;
            Vector3 endPos;

            if (_hoveredPost != null && _hoveredPost != _activeStartPost)
            {
                endPos = _hoveredPost.SocketPosition;
            }
            else
            {
                var cam = Camera.main;
                if (cam != null)
                {
                    Ray ray = new Ray(cam.transform.position, cam.transform.forward);
                    if (UnityEngine.Physics.Raycast(ray, out RaycastHit hit, 3.0f)) endPos = hit.point;
                    else endPos = cam.transform.position + cam.transform.forward * 1.5f;
                }
                else endPos = startPos + Vector3.forward * 0.5f;
            }

            // Catenary sag curve
            Vector3 midPos = (startPos + endPos) * 0.5f + Vector3.down * 0.06f;
            for (int i = 0; i < 16; i++)
            {
                float t = i / 15.0f;
                Vector3 p = (1 - t) * (1 - t) * startPos + 2 * (1 - t) * t * midPos + t * t * endPos;
                _previewLineRenderer.SetPosition(i, p);
            }
        }

        private void CancelDragging()
        {
            _activeStartPost = null;
            if (_dragPreviewWire != null)
            {
                Destroy(_dragPreviewWire);
                _dragPreviewWire = null;
                _previewLineRenderer = null;
            }
        }

        public void CompleteWireConnection(BindingPost postA, BindingPost postB)
        {
            var mat = GetWireMaterialForPair(postA.Terminal, postB.Terminal);
            string wireName = $"Wire_{postA.Terminal}_to_{postB.Terminal}";

            var wireObj = OhmsLawApparatusBuilder.BuildWire(wireName, _wiringRoot, postA.SocketPosition, postB.SocketPosition, 0.005f, mat, 0.045f);

            _solver.AddConnection(postA.Terminal, postB.Terminal, wireObj);
            postA.SetConnected(true);
            postB.SetConnected(true);

            PlaySnapSound(1.0f);

            EvaluateCircuitStatus();
        }

        private void EvaluateCircuitStatus()
        {
            var (status, msg) = _solver.EvaluateCircuit();
            CurrentStatus = status;
            CurrentStatusMessage = msg;
            OnCircuitTopologyChanged?.Invoke(status, msg);

            if (_controller != null)
            {
                bool circuitComplete = (status == CircuitTopologyStatus.FullyWired);
                _controller.SetWiringComplete(circuitComplete);
            }

            Debug.Log($"[InteractiveWiring] Circuit Evaluation: {status} — {msg}");
        }

        public void AutoWireStandardCircuit()
        {
            ClearAllWires();

            var allPosts = FindObjectsByType<BindingPost>(FindObjectsInactive.Include);
            var map = new Dictionary<TerminalId, BindingPost>();
            foreach (var p in allPosts) map[p.Terminal] = p;

            void Connect(TerminalId a, TerminalId b)
            {
                if (map.ContainsKey(a) && map.ContainsKey(b))
                {
                    CompleteWireConnection(map[a], map[b]);
                }
            }

            // Standard 7-lead circuit
            Connect(TerminalId.PowerSupply_Pos, TerminalId.Key_Term1);
            Connect(TerminalId.Key_Term2, TerminalId.Rheostat_Lower);
            Connect(TerminalId.Rheostat_Slider, TerminalId.Ammeter_Pos);
            Connect(TerminalId.Ammeter_Neg, TerminalId.Resistor_Term1);
            Connect(TerminalId.Resistor_Term2, TerminalId.PowerSupply_Neg);
            Connect(TerminalId.Voltmeter_Pos, TerminalId.Resistor_Term1);
            Connect(TerminalId.Voltmeter_Neg, TerminalId.Resistor_Term2);

            EvaluateCircuitStatus();
        }

        public void ClearAllWires()
        {
            CancelDragging();
            _solver.ClearAll();

            if (_wiringRoot != null)
            {
                for (int i = _wiringRoot.childCount - 1; i >= 0; i--)
                {
                    var child = _wiringRoot.GetChild(i).gameObject;
                    if (Application.isPlaying) Destroy(child);
                    else DestroyImmediate(child);
                }
            }

            var allPosts = FindObjectsByType<BindingPost>(FindObjectsInactive.Include);
            foreach (var p in allPosts) p.SetConnected(false);

            EvaluateCircuitStatus();
        }

        private Material GetWireMaterialForTerminal(TerminalId id)
        {
            if (id == TerminalId.Voltmeter_Pos || id == TerminalId.Voltmeter_Neg) return _wireYellowMat;
            if (id == TerminalId.PowerSupply_Neg) return _wireBlackMat;
            return _wireRedMat;
        }

        private Material GetWireMaterialForPair(TerminalId a, TerminalId b)
        {
            if (a == TerminalId.Voltmeter_Pos || a == TerminalId.Voltmeter_Neg ||
                b == TerminalId.Voltmeter_Pos || b == TerminalId.Voltmeter_Neg)
            {
                return _wireYellowMat;
            }
            if (a == TerminalId.PowerSupply_Neg || b == TerminalId.PowerSupply_Neg)
            {
                return _wireBlackMat;
            }
            return _wireRedMat;
        }

        private void PlaySnapSound(float pitch = 1.0f)
        {
            if (_audioSource != null && _plugSnapSound != null)
            {
                _audioSource.pitch = pitch;
                _audioSource.PlayOneShot(_plugSnapSound);
            }
        }

        private static AudioClip CreateSnapSound()
        {
            int sampleRate = 44100;
            int samples = (int)(sampleRate * 0.06f);
            float[] data = new float[samples];
            for (int i = 0; i < samples; i++)
            {
                float t = i / (float)sampleRate;
                float decay = Mathf.Exp(-t * 80f);
                data[i] = (Mathf.Sin(2f * Mathf.PI * 2200f * t) * 0.7f + (Random.value * 2f - 1f) * 0.3f) * decay;
            }
            var clip = AudioClip.Create("BananaPlugSnap", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
