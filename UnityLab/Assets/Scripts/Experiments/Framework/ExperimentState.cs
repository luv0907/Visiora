namespace Visora.Experiments.Framework
{
    /// <summary>
    /// Experiment state machine states.
    /// Defines the lifecycle of any experiment.
    /// </summary>
    public enum ExperimentState
    {
        /// <summary>Experiment not yet loaded.</summary>
        Uninitialized,

        /// <summary>Experiment loaded, student can set up equipment and parameters.</summary>
        Setup,

        /// <summary>Experiment is actively running. Simulation in progress.</summary>
        Running,

        /// <summary>Experiment paused. Can resume.</summary>
        Paused,

        /// <summary>Experiment completed. Results available.</summary>
        Completed,

        /// <summary>Error state. Something went wrong.</summary>
        Error
    }
}
