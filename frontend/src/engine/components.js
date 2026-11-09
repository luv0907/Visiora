/**
 * VISIORA — how real circuit parts behave, as physics rather than fixed numbers.
 *
 * Every part that gets hot has a temperature T that follows
 *     C dT/dt = P_in − P_loss(T)
 * so bulbs take a moment to light, glow red when under-run, draw a big surge of current when
 * cold, fuses melt after a delay that depends on how big the overload is, resistors and
 * rheostats warm up and can burn out, and meters burn out when abused.
 *
 * Sources for the numbers:
 *   Tungsten resistivity, 300–3600 K: Forsythe & Worthing (1925), as tabulated in
 *     D. Stewart, "Resistivity of Tungsten", The Physics Factbook (2004).
 *   Blackbody colour: T. Helland's fit to the CIE colour of a Planckian radiator.
 *   Eye sensitivity: Gaussian fit to the CIE 1931 photopic curve V(λ).
 *   Alkaline AA cell: fresh EMF about 1.6 V, internal resistance about 0.15 Ω fresh and
 *     several times that when nearly flat, capacity about 2.6 Ah at light loads (Energizer E91).
 *   Fuse wire: tin–lead alloy melting at 183 °C; does not melt at 1.3 × rating, melts within
 *     seconds at about 2 × (the "fusing factor" of a rewirable fuse).
 *   House wire: 1.5 mm² copper with PVC, adiabatic limit I²t = k²S² with k = 115.
 */

export const T_ROOM = 303 // 30 °C: a warm classroom
export const SIGMA = 5.670e-8

// ——— tungsten ———
const W_RHO = [
  [300, 5.65], [400, 8.06], [500, 10.56], [600, 13.23], [700, 16.09], [800, 19.0], [900, 21.94], [1000, 24.93],
  [1100, 27.94], [1200, 30.98], [1300, 34.08], [1400, 37.19], [1500, 40.36], [1600, 43.55], [1700, 46.78],
  [1800, 50.05], [1900, 53.35], [2000, 56.67], [2100, 60.06], [2200, 63.48], [2300, 66.91], [2400, 70.39],
  [2500, 73.91], [2600, 77.49], [2700, 81.04], [2800, 84.7], [2900, 88.33], [3000, 92.04], [3100, 95.76],
  [3200, 99.54], [3300, 103.3], [3400, 107.2], [3500, 111.1], [3600, 115.0],
]
function interp(table, x) {
  if (x <= table[0][0]) {
    const [[x0, y0], [x1, y1]] = table
    return y0 + ((y1 - y0) / (x1 - x0)) * (x - x0)
  }
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1], [x1, y1] = table[i]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  const [x0, y0] = table[table.length - 2], [x1, y1] = table[table.length - 1]
  return y1 + ((y1 - y0) / (x1 - x0)) * (x - x1)
}
/** Resistivity of tungsten at T, relative to room temperature. */
export const tungsten = T => interp(W_RHO, T) / interp(W_RHO, T_ROOM)
export const W_MELT = 3695

// ——— light ———
/** Visible share of a blackbody's radiation, per unit of σT⁴ (relative units). */
function visibleShare(T) {
  let s = 0
  for (let nm = 380; nm <= 780; nm += 5) {
    const l = nm * 1e-9, um = nm / 1000
    const B = 1 / (l ** 5 * (Math.exp(1.4388e-2 / (l * T)) - 1))
    s += B * 1.019 * Math.exp(-285.4 * (um - 0.559) ** 2)
  }
  return s / T ** 4
}
const LUM = []
for (let T = 300; T <= 4000; T += 25) LUM.push([T, visibleShare(T)])
/** How much of a filament's radiated power the eye sees, at temperature T (relative). */
export const luminousShare = T => Math.max(0, interp(LUM, T))

/** The colour of something glowing at temperature T, as [r, g, b] 0–255. */
export function glowColor(T) {
  const t = Math.max(6, T / 100)
  const c = v => Math.max(0, Math.min(255, v))
  const r = t <= 66 ? 255 : c(329.698727446 * (t - 60) ** -0.1332047592)
  const g = t <= 66 ? c(99.4708025861 * Math.log(t) - 161.1195681661) : c(288.1221695283 * (t - 60) ** -0.0755148492)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : c(138.5177312231 * Math.log(t - 10) - 305.0447927307)
  return [r, g, b]
}

// ——— filaments ———
/**
 * A tungsten-filament bulb rated Vr volts, Ir amps, running at Top kelvin.
 * Heat leaves by radiation, a(T⁴ − T₀⁴), and a little by conduction down the supports, b(T − T₀).
 * tau: how quickly it settles when running normally (s).
 */
export function filament({ Vr, Ir, Top = 2700, tau, conduction = 0.1 }) {
  const P = Vr * Ir, Rhot = Vr / Ir
  const R0 = Rhot / tungsten(Top)
  const a = ((1 - conduction) * P) / (Top ** 4 - T_ROOM ** 4)
  const b = (conduction * P) / (Top - T_ROOM)
  const C = tau * (4 * a * Top ** 3 + b)
  return {
    Vr, Ir, P, Top, R0, Rhot, C, a, b,
    R: T => R0 * tungsten(T),
    loss: T => a * (T ** 4 - T_ROOM ** 4) + b * (T - T_ROOM),
    slope: T => 4 * a * T ** 3 + b,
    /** Light given out, where 1 is the brightness it is made for. */
    light: T => (a * (T ** 4 - T_ROOM ** 4) * luminousShare(T)) / (a * (Top ** 4 - T_ROOM ** 4) * luminousShare(Top)),
    BLOW: 3450, // a little below tungsten's melting point: thin spots in the coil fail first
  }
}

/**
 * A part that heats linearly: R(T) = R₀(1 + α(T − T₀)), loses heat as (T − T₀)/θ,
 * has heat capacity C = tau/θ, and fails at Tfail.
 */
export function thermal({ alpha = 0, theta, tau, Tfail }) {
  return { alpha, theta, tau, C: tau / theta, Tfail, slope: () => 1 / theta, loss: T => (T - T_ROOM) / theta }
}

// ——— the parts ———
export const TORCH_BULB = filament({ Vr: 3, Ir: 0.3, Top: 2700, tau: 0.05 })
export const MAINS_LAMP = filament({ Vr: 220, Ir: 60 / 220, Top: 2750, tau: 0.12, conduction: 0.07 })

/** Copper hook-up wire on the board (and the house wiring in the room). */
export const WIRE = { R: 0.01, alpha: 0.0039, ...thermal({ theta: 18, tau: 40, Tfail: 1356 }), INSULATION: 433 }
// adiabatic check: C·ΔT for PVC (160 °C) ≈ (115 × 1.5)² × R → C ≈ 2.3 J/K, so tau = Cθ ≈ 40 s

/** A fixed resistor rated 2 W (it runs at about 150 °C at its rating, burns out near 330 °C). */
export const RESISTOR = { rating: 2, ...thermal({ alpha: 0.0001, theta: 60, tau: 20, Tfail: 600 }), SCORCH: 470 }
/** A coil of nichrome resistance wire, as used in the school practical. */
export const COIL = { ...thermal({ alpha: 0.0004, theta: 35, tau: 25, Tfail: 1400 }) }
/**
 * A sliding rheostat: nichrome wound on a ceramic tube, 0–Rmax, rated for `amps`.
 * Only the part of the coil in the circuit heats, so θ grows as the slider goes down:
 * at its rated current it runs at the same temperature wherever the slider is.
 */
export const RHEOSTAT = { Rmax: 50, amps: 1.5, alpha: 0.0004, tau: 12, rise: 250, Tfail: 1250 }
export const rheostatTheta = (R, Rmax = RHEOSTAT.Rmax, amps = RHEOSTAT.amps) => RHEOSTAT.rise / (amps * amps * Math.max(0.02 * Rmax, R))

/** A 2000 W room heater: an open nichrome coil that glows orange. */
export const HEATER = { P: 2000, V: 220, Top: 1150, alpha: 0.00012, tau: 9, Tfail: 1650 }
HEATER.theta = (HEATER.Top - T_ROOM) / HEATER.P
HEATER.R0 = HEATER.V ** 2 / HEATER.P / (1 + HEATER.alpha * (HEATER.Top - T_ROOM))

/**
 * A ceiling fan (an AC induction motor), as its RMS equivalent: a load whose effective resistance
 * rises as it speeds up, R = Rw(1 + ω/ω_run). Standing still it takes twice its running current;
 * the share of its power beyond the winding's own heating, I²(R − Rw), turns the blades against
 * air drag ∝ ω². It is passive: with the supply cut it slows down, it does not generate.
 * Runs at 300 rpm drawing 75 W, and takes several seconds to come up to speed.
 */
export const FAN = (() => {
  const V = 220, P = 75, I = P / V, rpm = 300, w = (rpm * 2 * Math.PI) / 60
  const Rw = V / (2 * I)
  const torque = I => (I * I * Rw) / w // shaft torque at current I (any speed)
  return { V, P, Rw, J: 0.9, wRun: w, R: s => Rw * (1 + Math.max(0, s) / w), torque, drag: torque(I) / w ** 2 }
})()

/** An electric bell: a coil, and a contact that the armature opens about 16 times a second. */
export const BELL = { V: 9, R: 30, hz: 16, duty: 0.55 }

/**
 * Fuse wire: tin–lead, melting at 183 °C. Rated current I_r: steady at 1.5 × I_r just reaches the
 * melting point, so it never melts at its rating but a big overload melts it in a second or two,
 * and a short circuit in milliseconds.
 */
export const FUSE = {
  R: 0.02, T_MELT: 456, factor: 1.5, tau: 2,
  // the unsafe "repair": a length of thick copper wire, heavier than the house wiring it should protect
  COPPER: { R: 0.0025, C: 8, theta: 5 },
}
export const fuseTheta = rating => (FUSE.T_MELT - T_ROOM) / (FUSE.factor * rating) ** 2 / FUSE.R

// ——— cells ———
/** Alkaline cell EMF against the share of its charge left (open circuit, room temperature). */
const ALKALINE = [[0, 0.8], [0.02, 0.95], [0.05, 1.0], [0.15, 1.12], [0.3, 1.22], [0.5, 1.3], [0.7, 1.4], [0.9, 1.5], [1, 1.6]]
export const CELL = {
  capacity: 2.6 * 3600, // coulombs (2.6 Ah)
  emf: soc => interp(ALKALINE, Math.max(0, Math.min(1, soc))),
  // grows as it is used, then shoots up as the last of the zinc is used: a flat cell cannot push current
  r: soc => { const q = Math.max(0, Math.min(1, soc)); return 0.15 + 0.6 * (1 - q) ** 2 + 0.06 / (q + 0.008) - 0.06 / 1.008 },
  theta: 7, tau: 90, // a 23 g cell: shorted, it gets too hot to hold
}

/** A school battery eliminator / DC supply: set 0–12 V, limits its current to 2 A. */
export const SUPPLY = { R: 0.05, limit: 2, max: 12 }
/** The house supply: 220 V RMS, with enough behind it to push hundreds of amps into a short. */
export const MAINS = { V: 220, R: 0.5 }

// ——— meters ———
/**
 * Moving-coil meters. The needle is a damped spring: natural frequency f0, damping ratio zeta.
 * Ammeter: a low-resistance shunt (75 mV across it at full scale).
 * Voltmeter: 1000 Ω per volt of range.
 * The coil burns out if it is overloaded for long (about 3 × full scale for a second).
 */
export const METER = { f0: 1.1, zeta: 0.62, divisions: 50, burden: 0.075, ohmsPerVolt: 1000, ...thermal({ theta: 1, tau: 0.6, Tfail: T_ROOM + 140 }) }
export const AMMETER_RANGES = [0.5, 1, 5]
export const VOLTMETER_RANGES = [5, 10]
export const leastCount = range => range / METER.divisions
/** Heat put into the coil, scaled so full scale warms it by 15 K. */
export const meterHeat = frac => 15 * frac * frac

/** Digital multimeter used as a voltmeter: 10 MΩ, shows 3 digits, updates 3 times a second. */
export const DMM = { R: 10e6, hz: 3 }
