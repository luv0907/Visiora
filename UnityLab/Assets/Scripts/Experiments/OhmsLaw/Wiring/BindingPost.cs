using UnityEngine;

namespace Visora.Experiments.OhmsLaw.Wiring
{
    public enum TerminalId
    {
        PowerSupply_Pos,
        PowerSupply_Neg,
        Key_Term1,
        Key_Term2,
        Rheostat_Lower,
        Rheostat_Slider,
        Ammeter_Pos,
        Ammeter_Neg,
        Resistor_Term1,
        Resistor_Term2,
        Voltmeter_Pos,
        Voltmeter_Neg
    }

    /// <summary>
    /// Interactive machined brass binding post terminal.
    /// Features glowing hover feedback, connection sockets, and student interaction triggers.
    /// </summary>
    public class BindingPost : MonoBehaviour
    {
        [Header("Terminal Identity")]
        [SerializeField] private TerminalId _terminalId;
        [SerializeField] private string _friendlyName = "Binding Post";
        [SerializeField] private Color _terminalColor = new Color(0.92f, 0.76f, 0.35f); // Brass default

        [Header("Socket Position")]
        [SerializeField] private Transform _socketAnchor;

        [Header("Hover Highlight")]
        private Renderer _renderer;
        private MaterialPropertyBlock _propBlock;
        private bool _isHovered = false;
        private bool _hasConnectedWire = false;

        public TerminalId Terminal => _terminalId;
        public string FriendlyName => _friendlyName;
        public Vector3 SocketPosition => _socketAnchor != null ? _socketAnchor.position : (transform.position + Vector3.up * 0.015f);
        public bool HasConnectedWire => _hasConnectedWire;

        public void Configure(TerminalId id, string name, Color color, Transform anchor = null)
        {
            _terminalId = id;
            _friendlyName = name;
            _terminalColor = color;
            _socketAnchor = anchor;
        }

        private void Awake()
        {
            _propBlock = new MaterialPropertyBlock();
            _renderer = GetComponent<Renderer>();
            if (_renderer == null) _renderer = GetComponentInChildren<Renderer>();

            // Ensure collider for player raycast interaction
            var col = GetComponent<Collider>();
            if (col == null)
            {
                var sphereCol = gameObject.AddComponent<SphereCollider>();
                sphereCol.radius = 0.035f;
                sphereCol.center = new Vector3(0, 0.015f, 0);
            }
        }

        public void SetHovered(bool hovered)
        {
            if (_isHovered == hovered) return;
            _isHovered = hovered;

            if (_renderer != null)
            {
                _renderer.GetPropertyBlock(_propBlock);
                if (_isHovered)
                {
                    _propBlock.SetColor("_EmissionColor", new Color(0.2f, 0.8f, 1f) * 1.5f);
                }
                else
                {
                    _propBlock.SetColor("_EmissionColor", Color.black);
                }
                _renderer.SetPropertyBlock(_propBlock);
            }
        }

        public void SetConnected(bool connected)
        {
            _hasConnectedWire = connected;
        }

        public void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere(SocketPosition, 0.015f);
        }
    }
}
