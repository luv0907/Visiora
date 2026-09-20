namespace Visora.Interaction
{
    /// <summary>
    /// Interface for any object the player can interact with.
    /// Implements a clean contract for the interaction system.
    /// </summary>
    public interface IInteractable
    {
        /// <summary>
        /// Display name shown in the interaction prompt.
        /// </summary>
        string InteractionPrompt { get; }

        /// <summary>
        /// Whether this object can currently be interacted with.
        /// </summary>
        bool CanInteract { get; }

        /// <summary>
        /// Called when the player begins interacting with this object.
        /// </summary>
        void OnInteract();

        /// <summary>
        /// Called when the player looks at this object (hover/focus).
        /// </summary>
        void OnFocus();

        /// <summary>
        /// Called when the player looks away from this object.
        /// </summary>
        void OnUnfocus();
    }
}
