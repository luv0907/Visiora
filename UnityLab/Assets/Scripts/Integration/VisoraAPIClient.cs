using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Visora.Integration
{
    /// <summary>
    /// Client for communicating with the existing Visora FastAPI backend.
    /// Allows the Unity lab to share progress, send analytics, and fetch
    /// experiment configurations from the same API used by the React frontend.
    ///
    /// API Base URL: configurable via VisoraConfig.asset
    /// Authentication: Bearer token (Firebase ID token)
    /// </summary>
    public class VisoraAPIClient : MonoBehaviour
    {
        [Header("API Configuration")]
        [SerializeField] private string _baseUrl = "https://your-railway-api.railway.app";
        [SerializeField] private float _requestTimeout = 10f;

        private string _authToken;
        private static VisoraAPIClient _instance;

        public static VisoraAPIClient Instance => _instance;

        private void Awake()
        {
            if (_instance != null && _instance != this) { Destroy(gameObject); return; }
            _instance = this;
            DontDestroyOnLoad(gameObject);

            // Load base URL from environment (WebGL: from JS bridge, Editor: from inspector)
#if UNITY_WEBGL && !UNITY_EDITOR
            _baseUrl = GetWebGLBaseURL();
#endif
        }

        /// <summary>
        /// Set the authentication token (Firebase ID token from the web app).
        /// Called via JS → Unity bridge when the web app passes auth to Unity.
        /// </summary>
        public void SetAuthToken(string token)
        {
            _authToken = token;
            Debug.Log("[VisoraAPI] Auth token set.");
        }

        // ── Analytics ─────────────────────────────────────────────────────────

        /// <summary>
        /// Track a lab event in the existing analytics system.
        /// </summary>
        public void TrackEvent(string eventType, string sessionId, object data = null)
        {
            var payload = new AnalyticsPayload
            {
                session_id = sessionId,
                type = eventType,
                data = data != null ? data.ToString() : "{}",
                ts = DateTime.UtcNow.ToString("o")
            };

            StartCoroutine(PostRequest("/api/v1/analytics/event", JsonUtility.ToJson(payload), null));
        }

        // ── Progress ──────────────────────────────────────────────────────────

        /// <summary>
        /// Record experiment completion in the student's progress profile.
        /// </summary>
        public void RecordExperimentCompletion(string experimentId, Action<bool> callback = null)
        {
            var payload = new ExperimentCompletionPayload { experimentId = experimentId };
            StartCoroutine(PostRequest(
                "/api/v1/progress/experiment-completed",
                JsonUtility.ToJson(payload),
                (success, _) => callback?.Invoke(success)));
        }

        // ── Health Check ──────────────────────────────────────────────────────

        public void CheckHealth(Action<bool> callback)
        {
            StartCoroutine(GetRequest("/health", (success, body) =>
            {
                callback?.Invoke(success);
                Debug.Log($"[VisoraAPI] Health check: {(success ? "OK" : "FAIL")} | {body}");
            }));
        }

        // ── HTTP Helpers ──────────────────────────────────────────────────────

        private IEnumerator PostRequest(string endpoint, string jsonBody,
            Action<bool, string> callback)
        {
            string url = _baseUrl + endpoint;
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);

            using var request = new UnityWebRequest(url, "POST");
            request.uploadHandler   = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.timeout = (int)_requestTimeout;

            if (!string.IsNullOrEmpty(_authToken))
                request.SetRequestHeader("Authorization", $"Bearer {_authToken}");

            yield return request.SendWebRequest();

            bool success = request.result == UnityWebRequest.Result.Success;
            callback?.Invoke(success, request.downloadHandler.text);

            if (!success)
                Debug.LogWarning($"[VisoraAPI] POST {endpoint} failed: {request.error}");
        }

        private IEnumerator GetRequest(string endpoint, Action<bool, string> callback)
        {
            string url = _baseUrl + endpoint;

            using var request = UnityWebRequest.Get(url);
            request.timeout = (int)_requestTimeout;

            if (!string.IsNullOrEmpty(_authToken))
                request.SetRequestHeader("Authorization", $"Bearer {_authToken}");

            yield return request.SendWebRequest();

            bool success = request.result == UnityWebRequest.Result.Success;
            callback?.Invoke(success, request.downloadHandler.text);
        }

#if UNITY_WEBGL && !UNITY_EDITOR
        /// <summary>
        /// In WebGL, read the API base URL injected by the React app via the URL
        /// or a global JS variable set before the Unity instance loads.
        /// </summary>
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern string GetVisoraAPIBaseURL();

        private string GetWebGLBaseURL()
        {
            try { return GetVisoraAPIBaseURL(); }
            catch { return _baseUrl; }
        }
#endif

        // ── Payload Models ────────────────────────────────────────────────────

        [Serializable]
        private class AnalyticsPayload
        {
            public string session_id;
            public string type;
            public string data;
            public string ts;
        }

        [Serializable]
        private class ExperimentCompletionPayload
        {
            public string experimentId;
        }
    }
}
