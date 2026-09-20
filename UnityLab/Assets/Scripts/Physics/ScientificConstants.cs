using UnityEngine;

namespace Visora.Physics
{
    /// <summary>
    /// SI physical constants used across all Visora experiments.
    /// All values from NIST 2022 CODATA.
    /// </summary>
    public static class ScientificConstants
    {
        // ── Fundamental Constants ─────────────────────────────────
        /// <summary>Speed of light in vacuum (m/s)</summary>
        public const double C = 2.99792458e8;

        /// <summary>Elementary charge (C)</summary>
        public const double ELEMENTARY_CHARGE = 1.602176634e-19;

        /// <summary>Planck constant (J·s)</summary>
        public const double PLANCK = 6.62607015e-34;

        // ── Mechanical Constants ──────────────────────────────────
        /// <summary>Standard gravity on Earth surface (m/s²)</summary>
        public const float G_EARTH = 9.80665f;

        /// <summary>Gravitational constant (m³/(kg·s²))</summary>
        public const double G_UNIVERSAL = 6.67430e-11;

        // ── Electromagnetic Constants ─────────────────────────────
        /// <summary>Vacuum permittivity (F/m)</summary>
        public const double EPSILON_0 = 8.8541878128e-12;

        /// <summary>Vacuum permeability (H/m)</summary>
        public const double MU_0 = 1.25663706212e-6;

        // ── Lab Standard Values ───────────────────────────────────
        /// <summary>Standard temperature (°C)</summary>
        public const float STANDARD_TEMP_CELSIUS = 20f;

        /// <summary>Standard temperature (K)</summary>
        public const float STANDARD_TEMP_KELVIN = 293.15f;

        /// <summary>Standard atmospheric pressure (Pa)</summary>
        public const float STANDARD_PRESSURE = 101325f;

        // ── Planet Gravities (m/s²) ───────────────────────────────
        public const float G_MOON    = 1.62f;
        public const float G_MARS    = 3.72f;
        public const float G_JUPITER = 24.79f;

        // ── Utility ───────────────────────────────────────────────
        /// <summary>Convert degrees to radians.</summary>
        public static float DegToRad(float degrees) => degrees * Mathf.Deg2Rad;

        /// <summary>Convert radians to degrees.</summary>
        public static float RadToDeg(float radians) => radians * Mathf.Rad2Deg;
    }
}
