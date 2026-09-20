namespace Visora.Experiments.Framework
{
    /// <summary>
    /// Interface for scientific simulation models.
    /// CRITICAL: The scientific model is SEPARATED from Unity visualization.
    /// The model computes the ground truth; Unity only renders the result.
    /// </summary>
    public interface IScientificModel
    {
        /// <summary>
        /// Initialize the model with current parameter values.
        /// Called when the experiment starts or parameters change.
        /// </summary>
        void Initialize(ExperimentDefinition definition);

        /// <summary>
        /// Compute the simulation state for the given input parameters.
        /// This is where the actual physics equations live.
        /// Must use SI units internally.
        /// </summary>
        SimulationResult Compute(float[] inputs);

        /// <summary>
        /// Validate the model against known analytical solutions.
        /// Returns true if the model produces results within tolerance.
        /// </summary>
        bool Validate(float tolerance = 0.01f);

        /// <summary>
        /// Get the governing equation as a human-readable string.
        /// </summary>
        string GetEquation();

        /// <summary>
        /// Get the model's assumptions as documentation.
        /// </summary>
        string GetAssumptions();
    }

    /// <summary>
    /// Result of a scientific computation step.
    /// Contains both numerical results and metadata for visualization.
    /// </summary>
    public struct SimulationResult
    {
        /// <summary>
        /// Primary output values (e.g., current, voltage, resistance).
        /// </summary>
        public float[] Outputs;

        /// <summary>
        /// Whether the result is within the model's valid operating range.
        /// </summary>
        public bool IsValid;

        /// <summary>
        /// Human-readable error or warning message if applicable.
        /// </summary>
        public string Message;
    }
}
