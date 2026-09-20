# Visora Virtual Lab — Scientific Models Reference

**Document:** ScientificModels.md  
**Last Updated:** 2026-09-16

---

## Experiment: Verification of Ohm's Law

### Overview
**Curriculum:** CBSE/ICSE Class 9 Physics  
**Topic:** Current Electricity  
**Practicum Code:** Science Practical No. 9

### Governing Equation
```
V = I × R
```
Where:
- **V** = Potential difference across the conductor (Volts, V)
- **I** = Electric current through the conductor (Amperes, A)  
- **R** = Resistance of the conductor (Ohms, Ω)

**Ohm's Law statement:** At constant temperature, the current through an ohmic conductor is directly proportional to the potential difference across it.

### Derived Relationships
```
I = V / R         (current from voltage and resistance)
R = V / I         (resistance from measurement)
P = V × I         (power dissipated)
P = V² / R        (power in terms of voltage)
P = I² × R        (power in terms of current)
```

### Assumptions (Documented)
1. **Ohmic conductor**: Resistance is constant, independent of V and I
2. **Constant temperature**: In reality, resistance increases with temperature (positive temperature coefficient for metals). This is ignored for the Class 9 model.
3. **DC circuit**: No AC frequency or reactive effects
4. **Ideal ammeter**: Zero internal resistance (r_A = 0). Real ammeters: r_A ≈ 0.01 Ω
5. **Ideal voltmeter**: Infinite internal resistance (r_V = ∞). Real voltmeters: r_V ≈ 10 MΩ
6. **Ideal battery**: Constant EMF, zero internal resistance. Real cells: r ≈ 0.5–1 Ω
7. **Negligible wire resistance**: Wire r ≈ 0 Ω

### Valid Operating Ranges (Class 9 Lab)
| Parameter | Min | Max | Unit | Notes |
|-----------|-----|-----|------|-------|
| Voltage (V) | 0 | 10 | V | Typical 4×1.5V battery |
| Current (I) | 0 | 5 | A | Safe for school lab |
| Resistance (R) | 1 | 100 | Ω | Standard lab resistors |
| Power (P) | 0 | 50 | W | Practical limit |

### Implementation Details
- **File:** `Assets/Scripts/Experiments/OhmsLaw/OhmsLawModel.cs`
- **Method:** Direct analytical solution (no numerical integration needed — exact linear law)
- **Calculation:** `I = V / R`, `P = V × I`

### Validation Tests
All tests in `Assets/Tests/EditMode/OhmsLawModelTests.cs`:

| Test | Expected | Tolerance |
|------|----------|-----------|
| V=5V, R=10Ω → I | 0.500 A | ±0.001 A |
| V=4V, R=20Ω → I | 0.200 A | ±0.001 A |
| V=6V, R=30Ω → I | 0.200 A | ±0.001 A |
| V=0V, R=10Ω → I | 0.000 A | ±0.001 A |
| V/I = R (5 readings) | constant | ±0.001 Ω |
| P = V²/R = VI = I²R | consistent | ±0.001 W |
| V-I linearity | R=15Ω constant | ±0.001 Ω |
| R from regression | within 5% of actual | — |

### Graph Interpretation
- **Plot:** Voltage (V) on X-axis vs Current (A) on Y-axis
- **Expected shape:** Straight line through origin (0,0)
- **Slope:** `slope = I/V = 1/R` → `R = 1/slope`
- **Verification:** If R_actual = 10Ω, slope should be 0.1 A/V

### Physical Equipment in Simulation
| Equipment | Role | Interaction |
|-----------|------|-------------|
| Battery (4×1.5V cells) | EMF source | Visual only |
| Rheostat | Controls effective voltage | E key + scroll |
| Switch (Key) | Opens/closes circuit | E key |
| Ammeter | Reads current (A) | Visual needle |
| Voltmeter | Reads voltage (V) | Visual needle |
| Resistance wire/resistor | Fixed R | Visual only |
| Connecting wires | Circuit path | Visual |

---

## Future Experiments (Architecture Ready)

The experiment framework supports adding these without rewriting core code:

| Experiment | Equation | Class |
|-----------|----------|-------|
| Simple Pendulum | T = 2π√(L/g) | 9/10 |
| Refraction of Light | n = sin i / sin r (Snell's) | 10 |
| Archimedes' Principle | F_b = ρVg | 9 |
| Hooke's Law | F = kx | 10 |
| Magnetic Field Lines | — (qualitative) | 10 |
| Velocity-Time Graphs | v = u + at | 9 |
| Lens Formula | 1/f = 1/v - 1/u | 10 |
