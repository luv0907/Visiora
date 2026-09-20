using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Visora.Core
{
    /// <summary>
    /// Manages async scene loading with loading screen support.
    /// Provides progress callbacks for UI updates.
    /// </summary>
    public class SceneLoader : Singleton<SceneLoader>
    {
        public event Action<float> OnLoadProgress;
        public event Action<string> OnSceneLoaded;
        public event Action OnLoadStarted;

        public bool IsLoading { get; private set; }

        /// <summary>
        /// Load a scene asynchronously with optional progress tracking.
        /// </summary>
        public void LoadScene(string sceneName, LoadSceneMode mode = LoadSceneMode.Single)
        {
            if (IsLoading)
            {
                Debug.LogWarning($"[SceneLoader] Already loading a scene. Ignoring request for '{sceneName}'.");
                return;
            }

            StartCoroutine(LoadSceneAsync(sceneName, mode));
        }

        private IEnumerator LoadSceneAsync(string sceneName, LoadSceneMode mode)
        {
            IsLoading = true;
            OnLoadStarted?.Invoke();

            Debug.Log($"[SceneLoader] Loading scene: {sceneName}");

            AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName, mode);
            if (asyncLoad == null)
            {
                Debug.LogError($"[SceneLoader] Failed to start loading scene: {sceneName}");
                IsLoading = false;
                yield break;
            }

            asyncLoad.allowSceneActivation = false;

            while (asyncLoad.progress < 0.9f)
            {
                OnLoadProgress?.Invoke(asyncLoad.progress / 0.9f);
                yield return null;
            }

            // Scene is ready to activate
            OnLoadProgress?.Invoke(1f);
            asyncLoad.allowSceneActivation = true;

            yield return new WaitUntil(() => asyncLoad.isDone);

            IsLoading = false;
            OnSceneLoaded?.Invoke(sceneName);
            Debug.Log($"[SceneLoader] Scene loaded: {sceneName}");
        }

        /// <summary>
        /// Additively load a scene (for modular lab areas).
        /// </summary>
        public void LoadSceneAdditive(string sceneName)
        {
            LoadScene(sceneName, LoadSceneMode.Additive);
        }

        /// <summary>
        /// Unload an additively loaded scene.
        /// </summary>
        public void UnloadScene(string sceneName)
        {
            SceneManager.UnloadSceneAsync(sceneName);
        }
    }
}
