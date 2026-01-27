import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import { 
  immeublesService, 
  proprietairesService, 
  locatairesService,
  transactionsService,
  fournisseursService,
  compteursEauService
} from '../services/api';

const DataContext = createContext(null);

// Durée du cache en millisecondes (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const DataProvider = ({ children }) => {
  // Cache avec timestamps
  const cache = useRef({
    immeubles: { data: null, timestamp: 0 },
    proprietaires: {}, // Par immeubleId
    locataires: {},    // Par immeubleId
    transactions: {},  // Par immeubleId
    fournisseurs: {},  // Par immeubleId
    compteurs: {},     // Par immeubleId
    stats: { data: null, timestamp: 0 }
  });

  // États de chargement
  const [loading, setLoading] = useState({});
  
  // Vérifier si le cache est valide
  const isCacheValid = (key, subKey = null) => {
    const now = Date.now();
    if (subKey) {
      const entry = cache.current[key]?.[subKey];
      return entry && (now - entry.timestamp) < CACHE_DURATION;
    }
    const entry = cache.current[key];
    return entry?.data && (now - entry.timestamp) < CACHE_DURATION;
  };

  // ==========================================
  // IMMEUBLES (avec compteurs pré-calculés)
  // ==========================================
  const getImmeubles = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('immeubles')) {
      return cache.current.immeubles.data;
    }

    setLoading(prev => ({ ...prev, immeubles: true }));
    
    try {
      const response = await immeublesService.getAll();
      const immeubles = response.data.immeubles || [];
      
      // Charger les compteurs en parallèle pour tous les immeubles
      const immeublesWithCounts = await Promise.all(
        immeubles.map(async (immeuble) => {
          // Utiliser le cache si disponible
          let proprietairesCount = 0;
          let locatairesCount = 0;

          if (isCacheValid('proprietaires', immeuble.id)) {
            proprietairesCount = cache.current.proprietaires[immeuble.id].data.length;
          }
          if (isCacheValid('locataires', immeuble.id)) {
            locatairesCount = cache.current.locataires[immeuble.id].data.length;
          }

          // Si pas en cache, charger en parallèle
          if (!proprietairesCount && !locatairesCount) {
            try {
              const [propRes, locRes] = await Promise.all([
                proprietairesService.getByImmeuble(immeuble.id),
                locatairesService.getByImmeuble(immeuble.id)
              ]);
              
              const props = propRes.data.proprietaires || [];
              const locs = locRes.data.locataires || [];
              
              // Mettre en cache
              cache.current.proprietaires[immeuble.id] = { data: props, timestamp: Date.now() };
              cache.current.locataires[immeuble.id] = { data: locs, timestamp: Date.now() };
              
              proprietairesCount = props.length;
              locatairesCount = locs.length;
            } catch (e) {
              console.error(`Error loading counts for ${immeuble.id}:`, e);
            }
          }

          return { ...immeuble, proprietairesCount, locatairesCount };
        })
      );

      cache.current.immeubles = { data: immeublesWithCounts, timestamp: Date.now() };
      return immeublesWithCounts;
    } catch (error) {
      console.error('Error loading immeubles:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, immeubles: false }));
    }
  }, []);

  // ==========================================
  // STATS DASHBOARD (optimisé en une requête)
  // ==========================================
  const getDashboardStats = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('stats')) {
      return cache.current.stats.data;
    }

    setLoading(prev => ({ ...prev, stats: true }));

    try {
      // Charger les immeubles (utilise le cache)
      const immeubles = await getImmeubles(forceRefresh);
      
      // Calculer les stats
      const stats = {
        immeubles: immeubles.length,
        proprietaires: immeubles.reduce((sum, i) => sum + (i.proprietairesCount || 0), 0),
        locataires: immeubles.reduce((sum, i) => sum + (i.locatairesCount || 0), 0),
        decomptes: 0 // À implémenter si nécessaire
      };

      cache.current.stats = { data: stats, timestamp: Date.now() };
      return stats;
    } catch (error) {
      console.error('Error loading stats:', error);
      return { immeubles: 0, proprietaires: 0, locataires: 0, decomptes: 0 };
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, [getImmeubles]);

  // ==========================================
  // PROPRIÉTAIRES (par immeuble)
  // ==========================================
  const getProprietaires = useCallback(async (immeubleId, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('proprietaires', immeubleId)) {
      return cache.current.proprietaires[immeubleId].data;
    }

    try {
      const response = await proprietairesService.getByImmeuble(immeubleId);
      const data = response.data.proprietaires || [];
      cache.current.proprietaires[immeubleId] = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      console.error('Error loading proprietaires:', error);
      return [];
    }
  }, []);

  // ==========================================
  // LOCATAIRES (par immeuble)
  // ==========================================
  const getLocataires = useCallback(async (immeubleId, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('locataires', immeubleId)) {
      return cache.current.locataires[immeubleId].data;
    }

    try {
      const response = await locatairesService.getByImmeuble(immeubleId);
      const data = response.data.locataires || [];
      cache.current.locataires[immeubleId] = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      console.error('Error loading locataires:', error);
      return [];
    }
  }, []);

  // ==========================================
  // TRANSACTIONS (par immeuble)
  // ==========================================
  const getTransactions = useCallback(async (immeubleId, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('transactions', immeubleId)) {
      return cache.current.transactions[immeubleId].data;
    }

    try {
      const response = await transactionsService.getAll(immeubleId, { limit: 1000 });
      const data = response.data.transactions || [];
      cache.current.transactions[immeubleId] = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }, []);

  // ==========================================
  // FOURNISSEURS (par immeuble)
  // ==========================================
  const getFournisseurs = useCallback(async (immeubleId, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('fournisseurs', immeubleId)) {
      return cache.current.fournisseurs[immeubleId].data;
    }

    try {
      const response = await fournisseursService.getAll(immeubleId);
      const data = response.data.fournisseurs || [];
      cache.current.fournisseurs[immeubleId] = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      console.error('Error loading fournisseurs:', error);
      return [];
    }
  }, []);

  // ==========================================
  // COMPTEURS EAU (par immeuble)
  // ==========================================
  const getCompteurs = useCallback(async (immeubleId, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('compteurs', immeubleId)) {
      return cache.current.compteurs[immeubleId].data;
    }

    try {
      const response = await compteursEauService.getByImmeuble(immeubleId);
      const data = response.data.compteurs || [];
      cache.current.compteurs[immeubleId] = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      console.error('Error loading compteurs:', error);
      return [];
    }
  }, []);

  // ==========================================
  // IMMEUBLE DETAIL (tout en parallèle)
  // ==========================================
  const getImmeubleDetail = useCallback(async (immeubleId, forceRefresh = false) => {
    setLoading(prev => ({ ...prev, [`immeuble_${immeubleId}`]: true }));

    try {
      // Charger tout en parallèle
      const [immeubleRes, proprietaires, locataires, compteurs, fournisseurs] = await Promise.all([
        immeublesService.getOne(immeubleId),
        getProprietaires(immeubleId, forceRefresh),
        getLocataires(immeubleId, forceRefresh),
        getCompteurs(immeubleId, forceRefresh),
        getFournisseurs(immeubleId, forceRefresh)
      ]);

      return {
        immeuble: immeubleRes.data.immeuble,
        proprietaires,
        locataires,
        compteurs,
        fournisseurs
      };
    } catch (error) {
      console.error('Error loading immeuble detail:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, [`immeuble_${immeubleId}`]: false }));
    }
  }, [getProprietaires, getLocataires, getCompteurs, getFournisseurs]);

  // ==========================================
  // INVALIDATION DU CACHE
  // ==========================================
  const invalidateCache = useCallback((type, immeubleId = null) => {
    if (type === 'all') {
      cache.current = {
        immeubles: { data: null, timestamp: 0 },
        proprietaires: {},
        locataires: {},
        transactions: {},
        fournisseurs: {},
        compteurs: {},
        stats: { data: null, timestamp: 0 }
      };
    } else if (immeubleId) {
      if (cache.current[type]) {
        delete cache.current[type][immeubleId];
      }
      // Invalider aussi les stats et immeubles si on modifie des données
      cache.current.stats = { data: null, timestamp: 0 };
      cache.current.immeubles = { data: null, timestamp: 0 };
    } else {
      cache.current[type] = type === 'immeubles' || type === 'stats' 
        ? { data: null, timestamp: 0 }
        : {};
    }
  }, []);

  // ==========================================
  // RAFRAÎCHIR APRÈS MODIFICATION
  // ==========================================
  const refreshAfterUpdate = useCallback(async (type, immeubleId) => {
    invalidateCache(type, immeubleId);
    
    // Recharger les données
    switch (type) {
      case 'proprietaires':
        return getProprietaires(immeubleId, true);
      case 'locataires':
        return getLocataires(immeubleId, true);
      case 'transactions':
        return getTransactions(immeubleId, true);
      case 'fournisseurs':
        return getFournisseurs(immeubleId, true);
      case 'compteurs':
        return getCompteurs(immeubleId, true);
      default:
        return null;
    }
  }, [invalidateCache, getProprietaires, getLocataires, getTransactions, getFournisseurs, getCompteurs]);

  const value = {
    // Getters avec cache
    getImmeubles,
    getDashboardStats,
    getProprietaires,
    getLocataires,
    getTransactions,
    getFournisseurs,
    getCompteurs,
    getImmeubleDetail,
    
    // Gestion du cache
    invalidateCache,
    refreshAfterUpdate,
    
    // État de chargement
    loading,
    
    // Accès direct au cache (lecture seule)
    getCachedData: (type, immeubleId = null) => {
      if (immeubleId) {
        return cache.current[type]?.[immeubleId]?.data || null;
      }
      return cache.current[type]?.data || null;
    }
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Hook personnalisé
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
