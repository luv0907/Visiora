using System.IO;
using UnityEditor;
using UnityEditor.TestTools.TestRunner.Api;
using UnityEngine;

namespace Visora.Editor
{
    [InitializeOnLoad]
    public static class VisoraTestRunner
    {
        private static readonly string TriggerPath = Path.Combine(Application.dataPath, "../.run_tests");
        private static readonly string ResultsPath = Path.Combine(Application.dataPath, "../TestResults.txt");

        static VisoraTestRunner()
        {
            EditorApplication.update += OnEditorUpdate;
        }

        private static void OnEditorUpdate()
        {
            if (File.Exists(TriggerPath))
            {
                try { File.Delete(TriggerPath); } catch { }
                RunAllTests();
            }
        }

        [MenuItem("Visora/Run All Tests")]
        public static void RunAllTests()
        {
            File.WriteAllText(ResultsPath, "RUNNING...\n");
            var testRunnerApi = ScriptableObject.CreateInstance<TestRunnerApi>();
            var filter = new Filter
            {
                testMode = TestMode.EditMode
            };

            testRunnerApi.RegisterCallbacks(new TestListener());
            testRunnerApi.Execute(new ExecutionSettings(filter));
            Debug.Log("[VisoraTestRunner] EditMode tests dispatched to TestRunnerApi.");
        }

        private class TestListener : ICallbacks
        {
            public void RunStarted(ITestAdaptor testsToRun)
            {
                Debug.Log($"[VisoraTestRunner] Test suite started: {testsToRun.TestCaseCount} test cases.");
                File.AppendAllText(ResultsPath, $"Started: {testsToRun.TestCaseCount} tests\n");
            }

            public void RunFinished(ITestResultAdaptor result)
            {
                string summary = $"[VisoraTestRunner] FINISHED: Total={result.PassCount + result.FailCount}, Passed={result.PassCount}, Failed={result.FailCount}, Inconclusive={result.InconclusiveCount}, Status={result.TestStatus}";
                Debug.Log(summary);
                File.AppendAllText(ResultsPath, summary + "\n");
            }

            public void TestStarted(ITestAdaptor test) { }

            public void TestFinished(ITestResultAdaptor result)
            {
                if (result.TestStatus == TestStatus.Failed)
                {
                    string failMsg = $"[VisoraTestRunner] FAILED: {result.Name} -> {result.Message}\n{result.StackTrace}";
                    Debug.LogError(failMsg);
                    File.AppendAllText(ResultsPath, failMsg + "\n");
                }
                else if (result.TestStatus == TestStatus.Passed)
                {
                    File.AppendAllText(ResultsPath, $"PASSED: {result.Name}\n");
                }
            }
        }
    }
}
