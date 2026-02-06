import { useState, useEffect } from 'react';
import { immeublesService } from '../../services/api';
import { X, AlertCircle, Save, Info, TrendingUp } from 'lucide-react';
import { SubscriptionLimitError } from '../../components/SubscriptionLimitError';

const API_URL = import.meta.env.VITE_API_URL || '';
const [showCompteurForm, setShowCompteurForm] = useState(false);
const [showEditForm, setShowEditForm] = useState(false);

function ImmeublesForm({ immeuble, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    codePostal: '',
    ville: '',
    region: 'brussels',
    totalMilliemes: 1000,
    nombreAppartements: 1,
    systemeRepartition: 'milliemes'
  });
  
  const [errors, setErrors] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Charger les données d'abonnement
  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    if (immeuble) {
      setFormData({
        nom: immeuble.nom || '',
        adresse: immeuble.adresse || '',
        codePostal: immeuble.code_postal || '',
        ville: immeuble.ville || '',
        region: immeuble.region || 'brussels',
        totalMilliemes: immeuble.total_milliemes || 1000,
        nombreAppartements: immeuble.nombre_appartements || 1,
        systemeRepartition: immeuble.systeme_repartition || 'milliemes'
      });
    }
  }, [immeuble]);

  const loadSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/v1/subscription/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Réinitialiser l'erreur de subscription quand on change le nombre d'appartements
    if (name === 'nombreAppartements') {
      setSubscriptionError(null);
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.nom.trim()) {
      newErrors.push('Le nom de l\'immeuble est requis');
    }
    if (!formData.adresse.trim()) {
      newErrors.push('L\'adresse est requise');
    }
    if (!formData.codePostal.trim()) {
      newErrors.push('Le code postal est requis');
    }
    if (!formData.ville.trim()) {
      newErrors.push('La ville est requise');
    }
    if (!formData.nombreAppartements || formData.nombreAppartements <= 0) {
      newErrors.push('Le nombre d\'appartements doit être supérieur à 0');
    }
    if (!formData.totalMilliemes || formData.totalMilliemes <= 0) {
      newErrors.push('Le total des millièmes doit être supérieur à 0');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors([]);
    setSubscriptionError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
        adresse: formData.adresse.trim(),
        codePostal: formData.codePostal.trim(),
        ville: formData.ville.trim(),
        region: formData.region,
        nombreAppartements: parseInt(formData.nombreAppartements),
        totalMilliemes: parseInt(formData.totalMilliemes),
        systemeRepartition: formData.systemeRepartition
      };

      if (immeuble) {
        await immeublesService.update(immeuble.id, data);
      } else {
        await immeublesService.create(data);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving immeuble:', err);
      
      // Gérer les erreurs de limites d'abonnement
      if (err.response?.data?.error?.includes('limit') || err.response?.data?.error?.includes('units')) {
        setSubscriptionError(err.response.data);
      } else if (err.response?.data?.errors) {
        setErrors(Array.isArray(err.response.data.errors) 
          ? err.response.data.errors 
          : [err.response.data.message || 'Erreur lors de l\'enregistrement']
        );
      } else {
        setErrors([err.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'immeuble']);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculer les unités disponibles et le coût
  const getUnitsInfo = () => {
    if (!subscription || !subscription.subscription) return null;

    const sub = subscription.subscription;
    const usage = subscription.usage || { unites: 0 };
    const plan = sub.plan || {};

    const totalUnits = sub.total_units || 0;
    const usedUnits = usage.unites || 0;
    const availableUnits = totalUnits - usedUnits;
    const neededUnits = parseInt(formData.nombreAppartements) || 0;
    const unitsMissing = Math.max(0, neededUnits - availableUnits);
    
    const pricePerUnit = plan.price_monthly || (plan.is_professional ? 4 : 2);
    const isPro = plan.is_professional || false;

    return {
      totalUnits,
      usedUnits,
      availableUnits,
      neededUnits,
      unitsMissing,
      pricePerUnit,
      isPro,
      hasEnough: unitsMissing === 0
    };
  };

  const unitsInfo = getUnitsInfo();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {immeuble ? 'Modifier l\'immeuble' : 'Ajouter un immeuble'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form - Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            
            {/* Erreur de subscription (avec bouton upgrade) */}
            {subscriptionError && (
              <div className="mb-6">
                <SubscriptionLimitError 
                  error={subscriptionError}
                  onDismiss={() => setSubscriptionError(null)}
                />
              </div>
            )}

            {/* Erreurs de validation */}
            {errors.length > 0 && !subscriptionError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {errors.length === 1 ? 'Erreur' : `${errors.length} erreurs`}
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Avertissement unités insuffisantes (AVANT soumission) */}
            {!loadingSubscription && unitsInfo && !unitsInfo.hasEnough && !subscriptionError && (
              <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 mb-2">
                      ⚠️ Attention : Unités insuffisantes
                    </h3>
                    <p className="text-sm text-amber-800 mb-2">
                      Vous essayez de créer {unitsInfo.neededUnits} appartement{unitsInfo.neededUnits > 1 ? 's' : ''} 
                      mais vous n'avez que {unitsInfo.availableUnits} unité{unitsInfo.availableUnits > 1 ? 's' : ''} disponible{unitsInfo.availableUnits > 1 ? 's' : ''}.
                    </p>
                    <div className="bg-white rounded-lg p-3 mb-3 border border-amber-200">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        Vous devez acheter {unitsInfo.unitsMissing} unité{unitsInfo.unitsMissing > 1 ? 's' : ''} supplémentaire{unitsInfo.unitsMissing > 1 ? 's' : ''} :
                      </p>
                      <div className="text-sm text-amber-800 space-y-1">
                        <p>
                          • Prix mensuel : {unitsInfo.unitsMissing} × {unitsInfo.pricePerUnit}€ {unitsInfo.isPro ? 'HTVA' : 'TTC'} = 
                          <span className="font-bold ml-1">
                            {(unitsInfo.unitsMissing * unitsInfo.pricePerUnit).toFixed(2)}€/mois
                          </span>
                        </p>
                        <p>
                          • Prix annuel : 
                          <span className="font-bold ml-1 text-amber-900">
                            {(unitsInfo.unitsMissing * unitsInfo.pricePerUnit * 12).toFixed(2)}€/an
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.location.href = '/parametres?tab=abonnement';
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                    >
                      Acheter {unitsInfo.unitsMissing} unité{unitsInfo.unitsMissing > 1 ? 's' : ''}
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Info unités disponibles */}
            {!loadingSubscription && unitsInfo && unitsInfo.hasEnough && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-green-100 rounded-full flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-green-800">
                      ✓ Vous avez <strong>{unitsInfo.availableUnits}</strong> unité{unitsInfo.availableUnits > 1 ? 's' : ''} disponible{unitsInfo.availableUnits > 1 ? 's' : ''}.
                      Cet immeuble utilisera <strong>{unitsInfo.neededUnits}</strong> unité{unitsInfo.neededUnits > 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>
            )}

          <div className="space-y-6">
            {/* Informations générales */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'immeuble *
                  </label>
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    required
                    value={formData.nom}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: Résidence Royale"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    id="adresse"
                    name="adresse"
                    required
                    value={formData.adresse}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: Avenue Louise 123"
                  />
                </div>

                <div>
                  <label htmlFor="codePostal" className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    id="codePostal"
                    name="codePostal"
                    required
                    value={formData.codePostal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: 1050"
                  />
                </div>

                <div>
                  <label htmlFor="ville" className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    id="ville"
                    name="ville"
                    required
                    value={formData.ville}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: Bruxelles"
                  />
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    Région *
                  </label>
                  <select
                    id="region"
                    name="region"
                    required
                    value={formData.region}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="brussels">Bruxelles</option>
                    <option value="wallonia">Wallonie</option>
                    <option value="flanders">Flandre</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="systemeRepartition" className="block text-sm font-medium text-gray-700 mb-1">
                    Système de répartition *
                  </label>
                  <select
                    id="systemeRepartition"
                    name="systemeRepartition"
                    required
                    value={formData.systemeRepartition}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="milliemes">Millièmes (sur 1000)</option>
                    <option value="parts">Parts</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.systemeRepartition === 'milliemes' 
                      ? 'Système traditionnel belge/français (total: 1000)'
                      : 'Système par nombre de parts possédées'}
                  </p>
                </div>

                <div>
                  <label htmlFor="nombreAppartements" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre d'appartements * 
                    {unitsInfo && (
                      <span className="text-xs text-gray-500 ml-1">
                        (= {formData.nombreAppartements || 0} unité{formData.nombreAppartements > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    id="nombreAppartements"
                    name="nombreAppartements"
                    required
                    min="1"
                    value={formData.nombreAppartements}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="totalMilliemes" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.systemeRepartition === 'milliemes' ? 'Total millièmes *' : 'Total parts *'}
                  </label>
                  <input
                    type="number"
                    id="totalMilliemes"
                    name="totalMilliemes"
                    required
                    min="1"
                    value={formData.totalMilliemes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.systemeRepartition === 'milliemes' 
                      ? 'Généralement 1000 pour les millièmes'
                      : 'Somme totale des parts de tous les propriétaires'}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Eau */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💧 <strong>Configuration de l'eau :</strong> La gestion complète de l'eau (mode de comptage, tarifs, fournisseur) 
                se fait dans l'onglet <strong>"Décomptes Eau"</strong> pour chaque exercice annuel.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || (unitsInfo && !unitsInfo.hasEnough)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {immeuble ? 'Mettre à jour' : 'Créer'}
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default ImmeublesForm;
