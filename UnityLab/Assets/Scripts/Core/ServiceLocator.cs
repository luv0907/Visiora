using System;
using System.Collections.Generic;
using UnityEngine;

namespace Visora.Core
{
    /// <summary>
    /// Lightweight service locator for decoupling systems.
    /// Allows registration and retrieval of services by interface type.
    /// Preferred over direct Singleton references for testability.
    /// </summary>
    public static class ServiceLocator
    {
        private static readonly Dictionary<Type, object> _services = new Dictionary<Type, object>();

        /// <summary>
        /// Register a service implementation for a given interface type.
        /// </summary>
        public static void Register<TInterface>(TInterface service) where TInterface : class
        {
            var type = typeof(TInterface);
            if (_services.ContainsKey(type))
            {
                Debug.LogWarning($"[ServiceLocator] Overwriting existing service for {type.Name}");
            }
            _services[type] = service;
        }

        /// <summary>
        /// Retrieve a registered service. Returns null if not registered.
        /// </summary>
        public static TInterface Get<TInterface>() where TInterface : class
        {
            var type = typeof(TInterface);
            if (_services.TryGetValue(type, out var service))
            {
                return service as TInterface;
            }

            Debug.LogError($"[ServiceLocator] Service {type.Name} not registered.");
            return null;
        }

        /// <summary>
        /// Check if a service is registered.
        /// </summary>
        public static bool Has<TInterface>() where TInterface : class
        {
            return _services.ContainsKey(typeof(TInterface));
        }

        /// <summary>
        /// Remove a registered service.
        /// </summary>
        public static void Unregister<TInterface>() where TInterface : class
        {
            _services.Remove(typeof(TInterface));
        }

        /// <summary>
        /// Clear all registered services. Call on application quit.
        /// </summary>
        public static void Clear()
        {
            _services.Clear();
        }
    }
}
