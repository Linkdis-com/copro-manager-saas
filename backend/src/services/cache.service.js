import NodeCache from 'node-cache';

/**
 * Cache en mémoire pour les données statiques
 * Alternative simple à Redis, pas de dépendance externe
 * 
 * Installation: npm install node-cache
 */

// Créer une instance de cache
// stdTTL: durée de vie par défaut (en secondes)
// checkperiod: vérification des expiration toutes les X secondes
const cache = new NodeCache({ 
  stdTTL: 3600,      // 1 heure par défaut
  checkperiod: 120   // Vérifier toutes les 2 minutes
});

/**
 * Middleware de cache pour les routes GET
 * Usage: router.get('/route', cacheMiddleware(300), handler)
 */
export const cacheMiddleware = (duration = 3600) => {
  return (req, res, next) => {
    // Ignorer le cache pour les requêtes non-GET
    if (req.method !== 'GET') {
      return next();
    }

    // Créer une clé unique basée sur l'URL et les query params
    const key = `${req.originalUrl || req.url}`;
    
    // Vérifier si les données sont en cache
    const cachedData = cache.get(key);
    
    if (cachedData) {
      console.log(`📦 Cache HIT: ${key}`);
      return res.json(cachedData);
    }

    console.log(`🔍 Cache MISS: ${key}`);

    // Sauvegarder la fonction json originale
    const originalJson = res.json.bind(res);

    // Override res.json pour mettre en cache la réponse
    res.json = (data) => {
      cache.set(key, data, duration);
      return originalJson(data);
    };

    next();
  };
};

/**
 * Fonction helper pour récupérer depuis le cache
 */
export const getFromCache = (key) => {
  return cache.get(key);
};

/**
 * Fonction helper pour mettre en cache
 */
export const setInCache = (key, value, ttl = 3600) => {
  return cache.set(key, value, ttl);
};

/**
 * Fonction helper pour supprimer du cache
 */
export const deleteFromCache = (key) => {
  return cache.del(key);
};

/**
 * Fonction helper pour vider tout le cache
 */
export const clearCache = () => {
  return cache.flushAll();
};

/**
 * Fonction helper pour invalider le cache par pattern
 * Exemple: invalidateCacheByPattern('decomptes')
 */
export const invalidateCacheByPattern = (pattern) => {
  const keys = cache.keys();
  const deletedKeys = [];
  
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.del(key);
      deletedKeys.push(key);
    }
  });

  console.log(`🗑️ Invalidated ${deletedKeys.length} cache entries matching: ${pattern}`);
  return deletedKeys;
};

/**
 * Stats du cache
 */
export const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
};

export default cache;
