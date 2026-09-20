using System.Collections.Generic;
using UnityEngine;

namespace Visora.Experiments.OhmsLaw.Wiring
{
    public enum CircuitTopologyStatus
    {
        Unwired,
        Incomplete,
        SeriesLoopClosed,
        FullyWired,
        ShortCircuitFault,            // Ammeter across resistor / load
        SupplyShortCircuitFault,      // Direct short across Power Supply terminals
        VoltmeterInSeriesFault,       // Voltmeter placed in series in main current path
        ReversedPolarityFault         // Meter connected with inverted polarity
    }

    /// <summary>
    /// Live Kirchhoff graph solver analyzing circuit connections placed by the student.
    /// Traverses the electrical network to identify closed loops, parallel branches,
    /// and authentic student laboratory faults (e.g. ammeter in parallel, voltmeter in series, direct power supply short).
    /// </summary>
    public class CircuitNetworkSolver
    {
        public struct Connection
        {
            public TerminalId From;
            public TerminalId To;
            public GameObject WireObject;
        }

        private readonly List<Connection> _connections = new List<Connection>();
        public IReadOnlyList<Connection> Connections => _connections;

        public void AddConnection(TerminalId a, TerminalId b, GameObject wireObj = null)
        {
            _connections.Add(new Connection { From = a, To = b, WireObject = wireObj });
        }

        public bool RemoveConnection(TerminalId a, TerminalId b)
        {
            int idx = _connections.FindIndex(c => (c.From == a && c.To == b) || (c.From == b && c.To == a));
            if (idx >= 0)
            {
                if (_connections[idx].WireObject != null)
                {
                    Object.Destroy(_connections[idx].WireObject);
                }
                _connections.RemoveAt(idx);
                return true;
            }
            return false;
        }

        public void ClearAll()
        {
            foreach (var c in _connections)
            {
                if (c.WireObject != null) Object.Destroy(c.WireObject);
            }
            _connections.Clear();
        }

        /// <summary>
        /// Evaluates current topology and returns validation state and pedagogical feedback.
        /// </summary>
        public (CircuitTopologyStatus status, string message) EvaluateCircuit()
        {
            if (_connections.Count == 0)
            {
                return (CircuitTopologyStatus.Unwired, "Bench is unwired. Use cables from the tray to connect the circuit.");
            }

            // Build adjacency list graph of terminals
            var adj = new Dictionary<TerminalId, HashSet<TerminalId>>();
            foreach (var c in _connections)
            {
                if (!adj.ContainsKey(c.From)) adj[c.From] = new HashSet<TerminalId>();
                if (!adj.ContainsKey(c.To)) adj[c.To] = new HashSet<TerminalId>();
                adj[c.From].Add(c.To);
                adj[c.To].Add(c.From);
            }

            // ── Fault Check 1: Direct Short Circuit across Power Supply ──────────────────
            bool directSupplyShort = IsConnected(adj, TerminalId.PowerSupply_Pos, TerminalId.PowerSupply_Neg);
            bool ammeterSupplyShort = (IsConnected(adj, TerminalId.PowerSupply_Pos, TerminalId.Ammeter_Pos) || IsConnected(adj, TerminalId.PowerSupply_Pos, TerminalId.Ammeter_Neg)) &&
                                     (IsConnected(adj, TerminalId.PowerSupply_Neg, TerminalId.Ammeter_Pos) || IsConnected(adj, TerminalId.PowerSupply_Neg, TerminalId.Ammeter_Neg));

            if (directSupplyShort || ammeterSupplyShort)
            {
                return (CircuitTopologyStatus.SupplyShortCircuitFault,
                    "⚠ DIRECT SHORT CIRCUIT: Power supply terminals are connected directly without sufficient load! This causes massive current that trips the fuse.");
            }

            // ── Fault Check 2: Ammeter in Parallel across Resistor ───────────────────────
            bool ammParallel = (IsConnected(adj, TerminalId.Ammeter_Pos, TerminalId.Resistor_Term1) &&
                                IsConnected(adj, TerminalId.Ammeter_Neg, TerminalId.Resistor_Term2)) ||
                               (IsConnected(adj, TerminalId.Ammeter_Pos, TerminalId.Resistor_Term2) &&
                                IsConnected(adj, TerminalId.Ammeter_Neg, TerminalId.Resistor_Term1));

            if (ammParallel)
            {
                return (CircuitTopologyStatus.ShortCircuitFault,
                    "⚠ SHORT CIRCUIT FAULT: Ammeter is connected in parallel across the resistor! An ammeter has negligible resistance (~0.05Ω) and bypasses the load. Connect it in series.");
            }

            // ── Fault Check 3: Voltmeter in Series in Main Current Path ─────────────────
            bool voltInSeries = 
                (IsConnected(adj, TerminalId.PowerSupply_Pos, TerminalId.Voltmeter_Pos) && (IsConnected(adj, TerminalId.Voltmeter_Neg, TerminalId.Key_Term1) || IsConnected(adj, TerminalId.Voltmeter_Neg, TerminalId.Key_Term2))) ||
                (IsConnected(adj, TerminalId.PowerSupply_Pos, TerminalId.Voltmeter_Neg) && (IsConnected(adj, TerminalId.Voltmeter_Pos, TerminalId.Key_Term1) || IsConnected(adj, TerminalId.Voltmeter_Pos, TerminalId.Key_Term2))) ||
                (HasDirectOrBridgedPath(adj, TerminalId.Key_Term1, TerminalId.Voltmeter_Pos, TerminalId.Voltmeter_Neg) && HasBridge(adj, TerminalId.Voltmeter_Pos, TerminalId.Voltmeter_Neg, TerminalId.Rheostat_Lower, TerminalId.Rheostat_Slider));

            if (voltInSeries)
            {
                return (CircuitTopologyStatus.VoltmeterInSeriesFault,
                    "⚠ VOLTMETER IN SERIES: Voltmeter is wired into the main current loop! Voltmeters have very high resistance (~20kΩ) and choke the current to near zero. Connect it in parallel across the resistor.");
            }

            // ── Normal Ohm's Law Circuit Topology Evaluation ─────────────────────────────
            // Series Loop: PS(+) -> Key -> Rheostat -> Ammeter -> Resistor -> PS(-)
            bool hasPsToKey = HasDirectOrBridgedPath(adj, TerminalId.PowerSupply_Pos, TerminalId.Key_Term1, TerminalId.Key_Term2);
            bool hasKeyToRheo = HasBridge(adj, TerminalId.Key_Term1, TerminalId.Key_Term2, TerminalId.Rheostat_Lower, TerminalId.Rheostat_Slider);
            bool hasRheoToAmm = HasBridge(adj, TerminalId.Rheostat_Lower, TerminalId.Rheostat_Slider, TerminalId.Ammeter_Pos, TerminalId.Ammeter_Neg);
            bool hasAmmToRes = HasBridge(adj, TerminalId.Ammeter_Pos, TerminalId.Ammeter_Neg, TerminalId.Resistor_Term1, TerminalId.Resistor_Term2);
            bool hasResToPs = HasDirectOrBridgedPath(adj, TerminalId.PowerSupply_Neg, TerminalId.Resistor_Term1, TerminalId.Resistor_Term2);

            bool seriesLoopClosed = hasPsToKey && hasKeyToRheo && hasRheoToAmm && hasAmmToRes && hasResToPs;

            // Parallel Voltmeter across Resistor:
            bool voltParallel = (IsConnected(adj, TerminalId.Voltmeter_Pos, TerminalId.Resistor_Term1) &&
                                 IsConnected(adj, TerminalId.Voltmeter_Neg, TerminalId.Resistor_Term2)) ||
                                (IsConnected(adj, TerminalId.Voltmeter_Pos, TerminalId.Resistor_Term2) &&
                                 IsConnected(adj, TerminalId.Voltmeter_Neg, TerminalId.Resistor_Term1));

            if (seriesLoopClosed && voltParallel)
            {
                return (CircuitTopologyStatus.FullyWired,
                    "✓ CIRCUIT ASSEMBLED CORRECTLY! Insert plug key [K] to begin measurements.");
            }
            else if (seriesLoopClosed && !voltParallel)
            {
                return (CircuitTopologyStatus.SeriesLoopClosed,
                    "Series loop connected. Now connect the Voltmeter (Yellow leads) in parallel across the standard resistor.");
            }
            else
            {
                return (CircuitTopologyStatus.Incomplete,
                    $"Incomplete circuit ({_connections.Count}/7 wires placed). Connect remaining leads according to the schematic.");
            }
        }

        private static bool IsConnected(Dictionary<TerminalId, HashSet<TerminalId>> adj, TerminalId a, TerminalId b)
        {
            return adj.ContainsKey(a) && adj[a].Contains(b);
        }

        private static bool HasDirectOrBridgedPath(Dictionary<TerminalId, HashSet<TerminalId>> adj, TerminalId source, TerminalId targetA, TerminalId targetB)
        {
            return IsConnected(adj, source, targetA) || IsConnected(adj, source, targetB);
        }

        private static bool HasBridge(Dictionary<TerminalId, HashSet<TerminalId>> adj, TerminalId comp1A, TerminalId comp1B, TerminalId comp2A, TerminalId comp2B)
        {
            return IsConnected(adj, comp1A, comp2A) || IsConnected(adj, comp1A, comp2B) ||
                   IsConnected(adj, comp1B, comp2A) || IsConnected(adj, comp1B, comp2B);
        }
    }
}
