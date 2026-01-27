import { useState, useEffect } from 'react';
import { decomptesService, tarifsEauService } from '../../services/api';
import { X, AlertCircle, Save } from 'lucide-react';

function DecomptesForm({ immeubles, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    immeubleId: '',
    annee: new Date().getFullYear(),
    periodeDebut: `${new Date().getFullYear()}-01-01`,
    periodeFin: `${new Date().getFullYear()}-12-31`,
    typeComptage: 'divisionnaire',
    tarifEauId: ''
  });
  
  const [tarifs, setTarifs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTarifs, setLoadingTarifs] = useState(true);

  useEffect(() => {
    loadTarifs();
    if (immeubles.length > 0) {
      setFormData(prev => ({
        ...prev,
        immeubleId: immeubles[0].id,
        typeComptage: immeubles[0].mode_comptage_eau || 'divisionnaire'
      }));
    }
  }, [immeubles]);

  const loadTarifs = async () => {
    try {
      setLoadingTarifs(true);
      const response = await tarifsEauService.getAll();
      setTarifs(response.data.tarifs || []);
      
      // Sélectionner le premier tarif par défaut
      if (response.data.tarifs.length > 0) {
        setFormData(prev => ({
          ...prev,
          tarifEauId: response.data.tarifs[0].id
        }));
      }
    } catch (err) {
      console.error('Error loading tarifs:', err);
    } finally {
      setLoadingTarifs(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si on change d'immeuble, adapter le type de comptage
    if (name === 'immeubleId') {
      const immeuble = immeubles.find(i => i.id === value);
      if (immeuble) {
        setFormData(prev => ({
          ...prev,
          typeComptage: immeuble.mode_comptage_eau || 'divisionnaire'
        }));
      }
    }

    // Si on change l'année, mettre à jour les dates
    if (name === 'annee') {
      setFormData(prev => ({
        ...prev,
        periodeDebut: `${value}-01-01`,
        periodeFin: `${value}-12-31`
      }));
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.immeubleId) {
      newErrors.push('L\'immeuble est requis');
    }
    if (!formData.annee) {
      newErrors.push('L\'année est requise');
    }
    if (!formData.periodeDebut) {
      newErrors.push('La date de début est requise');
    }
    if (!formData.periodeFin) {
      newErrors.push('La date de fin est requise');
    }
    if (formData.periodeFin && formData.periodeDebut) {
      const debut = new Date(formData.periodeDebut);
      const fin = new Date(formData.periodeFin);
      if (fin <= debut) {
        newErrors.push('La date de fin doit être après la date de début');
      }
    }
    if (!formData.tarifEauId) {
      newErrors.push('Le tarif d\'eau est requis');
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

    try {
      await decomptesService.create(formData);
      onSuccess();
    } catch (err) {
      console.error('Error creating decompte:', err);
      if (err.response?.data?.errors) {
        setErrors(Array.isArray(err.response.data.errors) 
          ? err.response.data.errors 
          : [err.response.data.message || 'Erreur lors de la création']
        );
      } else {
        setErrors([err.response?.data?.message || 'Erreur lors de la création du décompte']);
      }
    } finally {
      setLoading(false);
    }
  };

  if (immeubles.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Aucun immeuble</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Vous devez d'abord créer un immeuble avant d'ajouter des décomptes.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Nouveau décompte
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
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

          <div className="space-y-6">
            {/* Immeuble et Année */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="immeubleId" className="block text-sm font-medium text-gray-700 mb-1">
                    Immeuble *
                  </label>
                  <select
                    id="immeubleId"
                    name="immeubleId"
                    required
                    value={formData.immeubleId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {immeubles.map((immeuble) => (
                      <option key={immeuble.id} value={immeuble.id}>
                        {immeuble.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="annee" className="block text-sm font-medium text-gray-700 mb-1">
                    Année *
                  </label>
                  <input
                    type="number"
                    id="annee"
                    name="annee"
                    required
                    min="2020"
                    max="2099"
                    value={formData.annee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Période */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Période du décompte</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="periodeDebut" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    id="periodeDebut"
                    name="periodeDebut"
                    required
                    value={formData.periodeDebut}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="periodeFin" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    id="periodeFin"
                    name="periodeFin"
                    required
                    value={formData.periodeFin}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Type de comptage et Tarif */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Configuration eau</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="typeComptage" className="block text-sm font-medium text-gray-700 mb-1">
                    Type de comptage *
                  </label>
                  <select
                    id="typeComptage"
                    name="typeComptage"
                    required
                    value={formData.typeComptage}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="collectif">Collectif (1 compteur)</option>
                    <option value="divisionnaire">Divisionnaire (compteurs individuels)</option>
                    <option value="individuel">Individuel (facturation directe)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tarifEauId" className="block text-sm font-medium text-gray-700 mb-1">
                    Tarif d'eau *
                  </label>
                  <select
                    id="tarifEauId"
                    name="tarifEauId"
                    required
                    value={formData.tarifEauId}
                    onChange={handleChange}
                    disabled={loadingTarifs}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  >
                    {loadingTarifs ? (
                      <option>Chargement...</option>
                    ) : tarifs.length === 0 ? (
                      <option>Aucun tarif disponible</option>
                    ) : (
                      tarifs.map((tarif) => (
                        <option key={tarif.id} value={tarif.id}>
                          {tarif.nom}
                        </option>
                      ))
                    )}
                  </select>
                  {tarifs.length === 0 && !loadingTarifs && (
                    <p className="mt-1 text-xs text-red-600">
                      Aucun tarif configuré. Veuillez d'abord créer un tarif.
                    </p>
                  )}
                </div>
              </div>
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
              disabled={loading || tarifs.length === 0}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Créer le décompte
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DecomptesForm;