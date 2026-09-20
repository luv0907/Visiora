// VISORA VIRTUAL LAB — Project Setup Wizard
// This Editor script runs ONE TIME when the project is first opened
// to automatically configure URP, Input System, and create the
// OhmsLawLab scene with all objects pre-placed.
//
// Usage: Unity Menu → Visora → Setup Project (First Time)
// Or it runs automatically via InitializeOnLoad on first open.

using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;
using System.IO;

namespace Visora.Editor
{
    /// <summary>
    /// One-click project setup wizard.
    /// Configures URP, creates required folders, and builds the 
    /// OhmsLaw experiment scene automatically.
    /// </summary>
    public static class ProjectSetupWizard
    {
        private const string SETUP_DONE_KEY = "Visora_SetupComplete_v1";

        // ── Auto-run on domain reload / first open ───────────────────────────
        [InitializeOnLoadMethod]
        static void AutoSetupOnFirstOpen()
        {
            EditorApplication.delayCall += () =>
            {
                if (EditorApplication.isPlayingOrWillChangePlaymode) return;

                // 1. Ensure materials exist
                if (!File.Exists("Assets/Art/Materials/Lab_BenchTop.mat"))
                {
                    Debug.Log("[Visora Setup] Auto-generating missing lab materials...");
                    LabMaterialFactory.CreateAllMaterials();
                }

                // 2. Ensure scene is built
                if (!EditorPrefs.GetBool(SETUP_DONE_KEY, false))
                {
                    Debug.Log("[Visora Setup] Auto-configuring project for the first time...");
                    RunFullSetup();
                }
            };
        }

        // ── Manual trigger from menu ───────────────────────────────────────────
        [MenuItem("Visora/Setup Project (First Time)", priority = 1)]
        public static void RunFullSetup()
        {
            Debug.Log("[Visora Setup] Starting project configuration...");

            bool success = true;
            success &= EnsureRequiredFolders();
            success &= CreateURPAssets();
            success &= ConfigureQualitySettings();
            success &= BuildOhmsLawScene();

            if (success)
            {
                EditorPrefs.SetBool(SETUP_DONE_KEY, true);
                if (!Application.isBatchMode)
                {
                    EditorUtility.DisplayDialog(
                        "VISORA Setup Complete ✓",
                        "Project configured successfully!\n\n" +
                        "Next steps:\n" +
                        "1. Open Window → General → Test Runner\n" +
                        "2. Click 'Edit Mode' tab → Run All tests\n" +
                        "3. Open OhmsLawLab scene and press Play\n\n" +
                        "For WebGL build: File → Build Settings → WebGL → Build",
                        "Great!"
                    );
                }
            }
            else
            {
                if (!Application.isBatchMode)
                {
                    EditorUtility.DisplayDialog(
                        "Setup Partial",
                        "Some steps completed. Check Console for details.",
                        "OK"
                    );
                }
            }
        }

        [MenuItem("Visora/Rebuild OhmsLaw Scene", priority = 2)]
        public static void RebuildScene()
        {
            BuildOhmsLawScene();
        }

        [MenuItem("Visora/Open Documentation", priority = 50)]
        public static void OpenDocs()
        {
            string path = Path.GetFullPath("Documentation/Architecture.md");
            if (File.Exists(path))
                EditorUtility.RevealInFinder(path);
            else
                Application.OpenURL("https://github.com/your-org/visora");
        }

        // ── Setup Steps ────────────────────────────────────────────────────────

        static bool EnsureRequiredFolders()
        {
            string[] folders =
            {
                "Assets/Scenes",
                "Assets/Scenes/Experiments",
                "Assets/Prefabs",
                "Assets/Prefabs/Equipment",
                "Assets/Prefabs/Environment",
                "Assets/Prefabs/UI",
                "Assets/Prefabs/Player",
                "Assets/Resources",
                "Assets/ScriptableObjects",
                "Assets/ScriptableObjects/Experiments",
                "Assets/Art/Materials",
                "Assets/Art/Textures",
                "Assets/Audio/SFX",
                "Assets/Audio/Ambient",
                "Assets/Settings"
            };

            foreach (string folder in folders)
            {
                if (!AssetDatabase.IsValidFolder(folder))
                {
                    string parent = Path.GetDirectoryName(folder);
                    string name = Path.GetFileName(folder);
                    AssetDatabase.CreateFolder(parent, name);
                }
            }

            AssetDatabase.Refresh();
            Debug.Log("[Visora Setup] ✓ Required folders created.");
            return true;
        }

        static bool CreateURPAssets()
        {
            // Check if URP package is available
            var urpType = System.Type.GetType(
                "UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset, Unity.RenderPipelines.Universal.Runtime");

            if (urpType == null)
            {
                Debug.LogWarning("[Visora Setup] URP package not yet loaded. " +
                    "Wait for Package Manager to finish downloading packages, then re-run setup.");
                return false;
            }

            string settingsFolder = "Assets/Settings";
            if (!AssetDatabase.IsValidFolder(settingsFolder))
            {
                AssetDatabase.CreateFolder("Assets", "Settings");
            }

            string rendererAssetPath = "Assets/Settings/VisoraURP_Renderer.asset";
            string urpAssetPath = "Assets/Settings/VisoraURP.asset";

            var rendererData = AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.Universal.ScriptableRendererData>(rendererAssetPath);
            if (rendererData == null)
            {
                rendererData = ScriptableObject.CreateInstance<UnityEngine.Rendering.Universal.UniversalRendererData>();
                AssetDatabase.CreateAsset(rendererData, rendererAssetPath);
            }

            var urpAsset = AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset>(urpAssetPath);
            if (urpAsset == null)
            {
                urpAsset = UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset.Create(rendererData);
                AssetDatabase.CreateAsset(urpAsset, urpAssetPath);
            }
            else
            {
                // Ensure renderer is assigned in m_RendererDataList
                var so = new SerializedObject(urpAsset);
                var rendererListProp = so.FindProperty("m_RendererDataList");
                if (rendererListProp != null)
                {
                    if (rendererListProp.arraySize == 0) rendererListProp.arraySize = 1;
                    rendererListProp.GetArrayElementAtIndex(0).objectReferenceValue = rendererData;
                    so.ApplyModifiedProperties();
                }
            }

            UnityEngine.Rendering.GraphicsSettings.defaultRenderPipeline = urpAsset;
            QualitySettings.renderPipeline = urpAsset;
            AssetDatabase.SaveAssets();

            Debug.Log("[Visora Setup] ✓ URP Pipeline Asset and Renderer configured.");
            return true;
        }

        static bool ConfigureQualitySettings()
        {
            // Set target frame rate for WebGL
            Application.targetFrameRate = 60;

            // Configure for WebGL best practices
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.productName = "Visora Virtual Lab";
            PlayerSettings.companyName = "Visora Education";

            Debug.Log("[Visora Setup] ✓ Quality settings configured for WebGL.");
            return true;
        }

        static bool BuildOhmsLawScene()
        {
            string scenePath = "Assets/Scenes/Experiments/OhmsLawLab.unity";

            // 1. Ensure all PBR materials and 2K textures are created
            LabMaterialFactory.CreateAllMaterials();

            // 2. Create new scene
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "OhmsLawLab";

            // ── Lab Environment ──────────────────────────────────────────
            var labRoot = new GameObject("=== LAB ENVIRONMENT ===");
            var labBuilderGo = new GameObject("LabRoomBuilder");
            labBuilderGo.transform.SetParent(labRoot.transform);
            var labBuilder = labBuilderGo.AddComponent<Visora.Laboratory.LabRoomBuilder>();
            labBuilder.BuildLab();

            // ── Player (Framed directly in front of bench) ─────────────────
            var playerRoot = new GameObject("=== PLAYER ===");
            var playerGo = new GameObject("Player");
            playerGo.transform.SetParent(playerRoot.transform);
            playerGo.transform.position = new Vector3(0f, 0f, 1.85f); // Natural standing distance in front of bench
            playerGo.tag = "Player";

            var cc = playerGo.AddComponent<CharacterController>();
            cc.height = 1.7f;
            cc.center = new Vector3(0f, 0.85f, 0f);
            var fpc = playerGo.AddComponent<Visora.Player.FirstPersonController>();

            // Camera looking directly at the workbench instruments
            var cameraGo = new GameObject("Main Camera");
            cameraGo.transform.SetParent(playerGo.transform);
            cameraGo.transform.localPosition = new Vector3(0f, 1.45f, 0f); // Natural eye height looking down
            cameraGo.transform.localRotation = Quaternion.Euler(20f, 0f, 0f); // Tilted directly at the apparatus
            var cam = cameraGo.AddComponent<Camera>();
            cam.fieldOfView = 65f;
            cam.nearClipPlane = 0.05f;
            cam.farClipPlane = 100f;
            cameraGo.tag = "MainCamera";
            cameraGo.AddComponent<AudioListener>();

            // ── Experiment & Apparatus ───────────────────────────────────
            var experimentRoot = new GameObject("=== EXPERIMENT ===");

            var expGo = new GameObject("OhmsLawExperiment");
            expGo.transform.SetParent(experimentRoot.transform);
            expGo.transform.position = new Vector3(0f, 0.90f, 2.85f);

            var controller = expGo.AddComponent<Visora.Experiments.OhmsLaw.OhmsLawController>();
            var visualization = expGo.AddComponent<Visora.Experiments.OhmsLaw.OhmsLawVisualization>();

            // Construct photorealistic 3D apparatus
            var apparatusRefs = Visora.Experiments.OhmsLaw.OhmsLawApparatusBuilder.BuildApparatus(experimentRoot.transform, controller);
            visualization.ConfigureApparatus(
                apparatusRefs.AmmeterNeedle,
                apparatusRefs.VoltmeterNeedle,
                apparatusRefs.RheostatSlider,
                apparatusRefs.SwitchPlug,
                apparatusRefs.ResistorRenderer
            );

            // Connect visualization references via SerializedObject so they are persisted to scene YAML
            var soVis = new SerializedObject(visualization);
            var ammProp = soVis.FindProperty("_ammeterNeedle");
            if (ammProp != null) ammProp.objectReferenceValue = apparatusRefs.AmmeterNeedle;
            var voltProp = soVis.FindProperty("_voltmeterNeedle");
            if (voltProp != null) voltProp.objectReferenceValue = apparatusRefs.VoltmeterNeedle;
            var rheoProp = soVis.FindProperty("_rheostatKnob");
            if (rheoProp != null) rheoProp.objectReferenceValue = apparatusRefs.RheostatSlider;
            var switchProp = soVis.FindProperty("_switchHandle");
            if (switchProp != null) switchProp.objectReferenceValue = apparatusRefs.SwitchPlug;
            var resProp = soVis.FindProperty("_resistorRenderer");
            if (resProp != null) resProp.objectReferenceValue = apparatusRefs.ResistorRenderer;
            soVis.ApplyModifiedProperties();

            // Connect controller to visualization via SerializedObject
            var so = new SerializedObject(controller);
            var visProp = so.FindProperty("_visualization");
            if (visProp != null) visProp.objectReferenceValue = visualization;
            so.ApplyModifiedProperties();

            // Add interactive OnGUI HUD and AutoHealer
            expGo.AddComponent<Visora.UI.LabHUD>();
            expGo.AddComponent<Visora.Experiments.OhmsLaw.OhmsLawLabAutoHealer>();

            // Construct interactive digital observation tablet on the bench
            Visora.UI.LabObservationTablet.BuildTablet(
                experimentRoot.transform,
                new Vector3(0.80f, 0.905f, 2.70f),
                Quaternion.Euler(0, -20f, 0),
                controller
            );

            // ── Managers ─────────────────────────────────────────────────
            var managersRoot = new GameObject("=== MANAGERS ===");

            var gameManager = new GameObject("GameManager");
            gameManager.transform.SetParent(managersRoot.transform);
            gameManager.AddComponent<Visora.Core.GameManager>();

            var sceneLoader = new GameObject("SceneLoader");
            sceneLoader.transform.SetParent(managersRoot.transform);
            sceneLoader.AddComponent<Visora.Core.SceneLoader>();

            var audioManager = new GameObject("AudioManager");
            audioManager.transform.SetParent(managersRoot.transform);
            audioManager.AddComponent<Visora.Audio.AudioManager>();

            var interactionManager = new GameObject("InteractionManager");
            interactionManager.transform.SetParent(managersRoot.transform);
            interactionManager.AddComponent<Visora.Interaction.InteractionManager>();

            // ── Post Processing Volume ────────────────────────────────────
            var postRoot = new GameObject("=== POST PROCESSING ===");
            var volumeGo = new GameObject("GlobalVolume");
            volumeGo.transform.SetParent(postRoot.transform);
            var volume = volumeGo.AddComponent<UnityEngine.Rendering.Volume>();
            volume.isGlobal = true;

            var profile = AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.VolumeProfile>("Assets/DefaultVolumeProfile.asset");
            if (profile != null) volume.profile = profile;

            // ── Save Scene & Set in Build Settings ────────────────────────
            EditorSceneManager.MarkSceneDirty(scene);
            bool saved = EditorSceneManager.SaveScene(scene, scenePath);

            if (saved)
            {
                Debug.Log($"[Visora Setup] ✓ Photorealistic OhmsLawLab scene saved: {scenePath}");

                var buildScenes = new EditorBuildSettingsScene[]
                {
                    new EditorBuildSettingsScene(scenePath, true)
                };
                EditorBuildSettings.scenes = buildScenes;

                return true;
            }
            else
            {
                Debug.LogError($"[Visora Setup] ✗ Failed to save scene to: {scenePath}");
                return false;
            }
        }
    }
}
