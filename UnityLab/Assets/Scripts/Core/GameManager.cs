using UnityEngine;
using UnityEngine.SceneManagement;
using Visora.Audio;
using Visora.Interaction;
using Visora.Experiments.Framework;

namespace Visora.Core
{
    /// <summary>
    /// Top-level application manager. Initializes core services,
    /// manages application lifecycle, and coordinates scene transitions.
    /// </summary>
    public class GameManager : Singleton<GameManager>
    {
        [Header("Configuration")]
        [SerializeField] private string _mainMenuScene = "MainMenu";
        [SerializeField] private string _laboratoryHubScene = "LaboratoryHub";

        public enum AppState
        {
            Boot,
            MainMenu,
            Laboratory,
            Experiment,
            Paused
        }

        public AppState CurrentState { get; private set; } = AppState.Boot;

        protected override void Awake()
        {
            base.Awake();
            InitializeServices();
        }

        private void InitializeServices()
        {
            // Register core services — order matters
            // Audio, Interaction, and Experiment services will self-register
            // when their respective managers initialize

            Debug.Log("[GameManager] Core services initialized.");
        }

        /// <summary>
        /// Transition to a new application state.
        /// </summary>
        public void SetState(AppState newState)
        {
            var previousState = CurrentState;
            CurrentState = newState;
            Debug.Log($"[GameManager] State: {previousState} → {newState}");
        }

        /// <summary>
        /// Load a laboratory scene by name.
        /// </summary>
        public void LoadLaboratory(string sceneName)
        {
            SetState(AppState.Laboratory);
            SceneLoader.Instance.LoadScene(sceneName);
        }

        /// <summary>
        /// Load an experiment scene.
        /// </summary>
        public void LoadExperiment(string sceneName)
        {
            SetState(AppState.Experiment);
            SceneLoader.Instance.LoadScene(sceneName);
        }

        /// <summary>
        /// Return to main menu.
        /// </summary>
        public void ReturnToMainMenu()
        {
            SetState(AppState.MainMenu);
            SceneLoader.Instance.LoadScene(_mainMenuScene);
        }

        public void PauseGame()
        {
            if (CurrentState == AppState.Experiment || CurrentState == AppState.Laboratory)
            {
                SetState(AppState.Paused);
                Time.timeScale = 0f;
            }
        }

        public void ResumeGame()
        {
            Time.timeScale = 1f;
            // Return to previous logical state
            SetState(AppState.Laboratory);
        }

        protected override void OnApplicationQuit()
        {
            base.OnApplicationQuit();
            ServiceLocator.Clear();
        }
    }
}
