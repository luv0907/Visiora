using System;
using System.Collections.Generic;
using UnityEngine;

namespace Visora.Experiments.Framework
{
    /// <summary>
    /// ScriptableObject that defines an experiment's metadata and parameters.
    /// This is the data-driven configuration for each experiment.
    /// New experiments can be added by creating new ExperimentDefinition assets.
    /// </summary>
    [CreateAssetMenu(fileName = "NewExperiment", menuName = "Visora/Experiment Definition")]
    public class ExperimentDefinition : ScriptableObject
    {
        [Header("Metadata")]
        public string experimentId;
        public string title;
        [TextArea(3, 6)]
        public string objective;
        [TextArea(2, 4)]
        public string description;
        public string gradeLevel = "Class 9";
        public string subject = "Physics";
        public string topic;

        [Header("Scientific Information")]
        public string governingEquation;
        [TextArea(2, 4)]
        public string assumptions;
        public string validationMethod;

        [Header("Parameters")]
        public List<ExperimentParameter> parameters = new List<ExperimentParameter>();

        [Header("Instructions")]
        [TextArea(2, 3)]
        public List<string> procedureSteps = new List<string>();

        [Header("Equipment")]
        public List<string> requiredEquipment = new List<string>();

        [Header("Display")]
        public Sprite icon;
        public Color themeColor = new Color(0.2f, 0.6f, 1f);
    }
}
