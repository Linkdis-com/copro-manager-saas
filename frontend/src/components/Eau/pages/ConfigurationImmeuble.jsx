// =====================================================
// 🌊 PAGE CONFIGURATION IMMEUBLE
// frontend/src/components/Eau/pages/ConfigurationImmeuble.jsx
// VERSION CORRIGÉE AVEC AXIOS + BONS IMPORTS
// =====================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, DollarSign, Droplets } from 'lucide-react';
import { REGIONS, getDistributeurs, getTarifsDefaut } from '../constants';
import { eauConfigService } from '../../../services/api'; 
import CollectifSchema from '../schemas/CollectifSchema';
import DivisonnaireSchema from '../schemas/DivisonnaireSchema';
import IndividuelSchema from '../schemas/IndividuelSchema';

export default function ConfigurationImmeuble() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    region: '',
    distributeur: '',
    type_comptage: typeFromUrl || 'divisionnaire',
    
    // Tarifs communs
    tarif_distribution: '',
    tarif_assainissement: '',
    redevance_fixe: 0,
    tva_pourcent: 6,
    
    // Flandre
    tarif_base: '',
    tarif_confort: '',
    m3_base_par_habitant: 30,
    
    // Wallonie
    m3_gratuits_par_habitant: 15,
    max_habitants_gratuits: 5
  });

  const [distributeurs, setDistributeurs] = useState([]);

  useEffect(() => {
    loadConfig();
  }, [immeubleId]);

  useEffect(() => {
    if (config.region) {
      setDistributeurs(getDistributeurs(config.region));
    }
  }, [config.region]);

  // Auto-remplir tarifs quand distributeur sélectionné
  useEffect(() => {
    if (config.region && config.distributeur) {
      const tarifsDef = getTarifsDefaut(config.region, config.distributeur);
      if (tarifsDef) {
        setConfig(prev => ({ ...prev, ...tarifsDef }));
      }
    }
  }, [config.region, config.distributeur]);

  // ✅ CORRECTION AXIOS
  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await eauConfigService.getConfig(immeubleId);
      
      if (response.data.config) {
        setConfig(response.data.config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      // Si erreur 404, c'est normal (pas encore de config)
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECTION AXIOS
  const handleSave = async () => {
    // Validation
    if (!config.region) {
      setError('Veuillez sélectionner une région');
      return;
    }
    if (!config.distributeur) {
      setError('Veuillez sélectionner un distributeur');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const response = await eauConfigService.saveConfig(immeubleId, config);
      
      console.log('✅ Config saved:', response.data);
      setSuccess(true);
      
      // Redirection après 1 seconde
      setTimeout(() => {
        navigate(`/immeubles/${immeubleId}/eau/compteurs`);
      }, 1000);
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error.response?.data?.error || error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const regionInfo = Object.values(REGIONS).find(r => r.code === config.region);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/immeubles/${immeubleId}/eau`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-600" />
            Configuration Eau
          </h1>
          <p className="text-gray-600 mt-1">
            Paramétrage région, distributeur et tarifs
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">✅ Configuration enregistrée ! Redirection...</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Région */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Région et Distributeur
            </h2>
            
            <div className="space-y-4">
              {/* Région */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Région *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(REGIONS).map(region => (
                    <button
                      key={region.code}
                      onClick={() => setConfig({ ...config, region: region.code, distributeur: '' })}
                      className={`p-4 rounded-lg border-2 transition ${
                        config.region === region.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{region.emoji}</div>
                      <div className="font-medium text-sm">{region.nom}</div>
                      <div className="text-xs text-gray-500 mt-1">{region.systeme}</div>
                    </button>
                  ))}
                </div>
                
                {regionInfo && (
                  <div className={`mt-3 p-3 rounded-lg bg-${regionInfo.couleur}-50 border border-${regionInfo.couleur}-200`}>
                    <p className="text-sm text-gray-700">{regionInfo.description}</p>
                  </div>
                )}
              </div>

              {/* Distributeur */}
              {config.region && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Distributeur d'eau *
                  </label>
                  <select
                    value={config.distributeur}
                    onChange={(e) => setConfig({ ...config, distributeur: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un distributeur</option>
                    {distributeurs.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.nom} {d.principal ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type comptage */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type de comptage *
                </label>
                <select
                  value={config.type_comptage}
                  onChange={(e) => setConfig({ ...config, type_comptage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="collectif">🏢 Compteur Collectif</option>
                  <option value="divisionnaire">🔢 Système Divisionnaire</option>
                  <option value="individuel">👤 Compteurs Individuels</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarifs */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Tarifs
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Tarifs communs (Wallonie et Bruxelles) */}
              {config.region !== 'flandre' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tarif Distribution (€/m³)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={config.tarif_distribution}
                      onChange={(e) => setConfig({ ...config, tarif_distribution: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="5.315"
                    />
                  </div>

                  {config.region === 'wallonie' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tarif Assainissement (€/m³)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={config.tarif_assainissement}
                        onChange={(e) => setConfig({ ...config, tarif_assainissement: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="3.50"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Tarifs Flandre */}
              {config.region === 'flandre' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tarif Base (€/m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.tarif_base}
                      onChange={(e) => setConfig({ ...config, tarif_base: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="6.98"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tarif Confort (€/m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.tarif_confort}
                      onChange={(e) => setConfig({ ...config, tarif_confort: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="13.95"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      M³ base par habitant
                    </label>
                    <input
                      type="number"
                      value={config.m3_base_par_habitant}
                      onChange={(e) => setConfig({ ...config, m3_base_par_habitant: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* Redevance fixe */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Redevance fixe annuelle (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.redevance_fixe}
                  onChange={(e) => setConfig({ ...config, redevance_fixe: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0"
                />
              </div>

              {/* TVA */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  TVA (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.tva_pourcent}
                  onChange={(e) => setConfig({ ...config, tva_pourcent: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* M³ gratuits (Wallonie) */}
              {config.region === 'wallonie' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      M³ gratuits par habitant
                    </label>
                    <input
                      type="number"
                      value={config.m3_gratuits_par_habitant}
                      onChange={(e) => setConfig({ ...config, m3_gratuits_par_habitant: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre max habitants pour gratuits
                    </label>
                    <input
                      type="number"
                      value={config.max_habitants_gratuits}
                      onChange={(e) => setConfig({ ...config, max_habitants_gratuits: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <button
            onClick={handleSave}
            disabled={saving || !config.region || !config.distributeur}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Sauvegarde...' : 'Enregistrer et Continuer'}
          </button>
        </div>

        {/* Schéma visuel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-6 sticky top-6">
            <h3 className="font-bold mb-4">Schéma du système</h3>
            
            {config.type_comptage === 'collectif' && <CollectifSchema />}
            {config.type_comptage === 'divisionnaire' && <DivisonnaireSchema />}
            {config.type_comptage === 'individuel' && <IndividuelSchema />}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                {config.type_comptage === 'collectif' && 
                  'Un seul compteur pour tout l\'immeuble. Répartition selon millièmes.'}
                {config.type_comptage === 'divisionnaire' && 
                  'Compteur principal + compteurs par logement. Calcul des pertes automatique.'}
                {config.type_comptage === 'individuel' && 
                  'Chaque logement a son propre abonnement. Pas de répartition.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
