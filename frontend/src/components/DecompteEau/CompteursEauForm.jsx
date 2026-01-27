import { useState, useEffect } from 'react';
import { compteursEauService } from '../../services/api';
import { X, AlertCircle, Save, Droplets, AlertTriangle, CheckCircle, Building2 } from 'lucide-react';
import CompteurTypeGuide from './CompteurTypeGuide';

function CompteursEauForm({ compteur, locataires, proprietaires, immeubleId, onClose, onSuccess, compteursList }) {
  const [formData, setFormData] = useState({
    numeroCompteur: '',
    assignationType: 'copropriete', // Default for principal
    locataireId: '',
    proprietaireId: '',
    typeCompteur: 'divisionnaire',
    compteurPrincipalId: '',
    emplacement: '',
    actif: true
  });
  
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [volumeInfo, setVolumeInfo] = useState({
    principal: 0,
    utilise: 0,
    disponible: 0,
    loading: false
  });

  // Liste des compteurs principaux disponibles
  const compteursPrincipaux = (compteursList || []).filter(c => c.type_compteur === 'principal');

  useEffect(() => {
    if (compteur) {
      // Determine assignment type
      let assignType = 'none';
      if (compteur.type_compteur === 'principal') {
        assignType = compteur.proprietaire_id ? 'proprietaire_gerant' : 'copropriete';
      } else {
        assignType = compteur.locataire_id ? 'locataire' : compteur.proprietaire_id ? 'proprietaire' : 'none';
      }

      setFormData({
        numeroCompteur: compteur.numero_compteur || '',
        assignationType: assignType,
        locataireId: compteur.locataire_id || '',
        proprietaireId: compteur.proprietaire_id || '',
        typeCompteur: compteur.type_compteur || 'divisionnaire',
        compteurPrincipalId: compteur.compteur_principal_id || '',
        emplacement: compteur.emplacement || '',
        actif: compteur.actif === true
      });

      // Load volume info if divisionnaire
      if (compteur.type_compteur === 'divisionnaire' && compteur.compteur_principal_id) {
        loadVolumeInfo(compteur.compteur_principal_id);
      }
    }
  }, [compteur]);

  // Load volume tracking when principal is selected
  useEffect(() => {
    if (formData.typeCompteur === 'divisionnaire' && formData.compteurPrincipalId) {
      loadVolumeInfo(formData.compteurPrincipalId);
    }
  }, [formData.compteurPrincipalId, formData.typeCompteur]);

  // Load volume info from principal meter
  const loadVolumeInfo = async (compteurPrincipalId) => {
    try {
      setVolumeInfo(prev => ({ ...prev, loading: true }));

      // Get all compteurs for this immeuble
      const response = await compteursEauService.getByImmeuble(immeubleId);
      const compteurs = response.data.compteurs || [];

      // Find principal meter
      const principal = compteurs.find(c => c.id === compteurPrincipalId);
      if (!principal) {
        setVolumeInfo({ principal: 0, utilise: 0, disponible: 0, loading: false });
        return;
      }

      // Get last releve of principal (if exists)
      // For now, we'll use a default of 1000 m³ as reference
      // TODO: Get actual volume from releves
      const volumePrincipal = 1000; // Default reference volume

      // Calculate total volume used by divisionnaires
      const divisionnaires = compteurs.filter(c => 
        c.type_compteur === 'divisionnaire' && 
        c.compteur_principal_id === compteurPrincipalId &&
        c.id !== compteur?.id // Exclude current meter if editing
      );

      // TODO: Get actual volumes from releves
      // For now, count number of divisionnaires (simplified)
      const volumeUtilise = divisionnaires.length * 100; // Simplified: 100 m³ per meter
      const volumeDisponible = volumePrincipal - volumeUtilise;

      setVolumeInfo({
        principal: volumePrincipal,
        utilise: volumeUtilise,
        disponible: volumeDisponible,
        loading: false
      });
    } catch (err) {
      console.error('Error loading volume info:', err);
      setVolumeInfo({ principal: 0, utilise: 0, disponible: 0, loading: false });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAssignationTypeChange = (e) => {
    const type = e.target.value;
    setFormData(prev => ({
      ...prev,
      assignationType: type,
      locataireId: '',
      proprietaireId: ''
    }));
  };

  const handleTypeCompteurChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      typeCompteur: newType,
      // Reset assignment based on type
      assignationType: newType === 'principal' ? 'copropriete' : 'none',
      locataireId: '',
      proprietaireId: '',
      compteurPrincipalId: ''
    }));
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.numeroCompteur.trim()) {
      newErrors.push('Le numéro de compteur est requis');
    }
    if (!formData.typeCompteur) {
      newErrors.push('Le type de compteur est requis');
    }
    if (formData.typeCompteur === 'divisionnaire' && !formData.compteurPrincipalId) {
      newErrors.push('Vous devez sélectionner le compteur principal');
    }

    // Validation: Principal cannot be assigned to locataire
    if (formData.typeCompteur === 'principal' && formData.assignationType === 'locataire') {
      newErrors.push('❌ Un compteur principal ne peut PAS être assigné à un locataire. Il doit être assigné à la copropriété ou au propriétaire-gérant.');
    }

    // Validation: Check assignment type
    if (formData.assignationType === 'locataire' && !formData.locataireId) {
      newErrors.push('Veuillez sélectionner un locataire');
    }
    if ((formData.assignationType === 'proprietaire' || formData.assignationType === 'proprietaire_gerant') && !formData.proprietaireId) {
      newErrors.push('Veuillez sélectionner un propriétaire');
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
      const data = {
        numeroCompteur: formData.numeroCompteur.trim(),
        typeCompteur: formData.typeCompteur,
        compteurPrincipalId: formData.compteurPrincipalId || null,
        emplacement: formData.emplacement.trim() || null,
        actif: formData.actif,
        // Assignment logic
        locataireId: formData.assignationType === 'locataire' ? formData.locataireId : null,
        proprietaireId: (formData.assignationType === 'proprietaire' || formData.assignationType === 'proprietaire_gerant') 
          ? formData.proprietaireId 
          : null
      };

      if (compteur) {
        await compteursEauService.update(immeubleId, compteur.id, data);
      } else {
        await compteursEauService.create(immeubleId, data);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving compteur:', err);
      if (err.response?.data?.errors) {
        setErrors(Array.isArray(err.response.data.errors) 
          ? err.response.data.errors 
          : [err.response.data.message || 'Erreur lors de l\'enregistrement']
        );
      } else {
        setErrors([err.response?.data?.message || 'Erreur lors de l\'enregistrement du compteur']);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get assignment options based on meter type
  const getAssignmentOptions = () => {
    switch (formData.typeCompteur) {
      case 'principal':
        return [
          { value: 'copropriete', label: '🏢 Copropriété Immeuble', icon: Building2 },
          { value: 'proprietaire_gerant', label: 'Propriétaire-gérant', icon: null }
        ];
      case 'divisionnaire':
        return [
          { value: 'none', label: 'Non assigné', icon: null },
          { value: 'proprietaire', label: 'Propriétaire occupant', icon: null },
          { value: 'locataire', label: 'Locataire', icon: null }
        ];
      case 'collectif':
        return [
          { value: 'copropriete', label: '🏢 Copropriété (partagé)', icon: Building2 },
          { value: 'proprietaire', label: 'Groupe de propriétaires', icon: null }
        ];
      case 'individuel':
        return [
          { value: 'proprietaire', label: 'Propriétaire (hors copro)', icon: null }
        ];
      default:
        return [{ value: 'none', label: 'Non assigné', icon: null }];
    }
  };

  const assignmentOptions = getAssignmentOptions();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Droplets className="h-6 w-6 text-cyan-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {compteur ? 'Modifier le compteur' : 'Nouveau compteur'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
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
              {/* Numéro de compteur */}
              <div>
                <label htmlFor="numeroCompteur" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de compteur *
                </label>
                <input
                  type="text"
                  id="numeroCompteur"
                  name="numeroCompteur"
                  required
                  value={formData.numeroCompteur}
                  onChange={handleChange}
                  placeholder="Ex: C-001 ou C-APPT-1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* 🎨 Guide visuel des types de compteurs - SEULEMENT en création */}
              {!compteur ? (
                <CompteurTypeGuide 
                  selectedType={formData.typeCompteur}
                  onTypeChange={handleTypeCompteurChange}
                />
              ) : (
                // En édition : afficher juste un badge avec le type
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className={`
                      px-3 py-1.5 rounded-full text-sm font-medium
                      ${formData.typeCompteur === 'principal' ? 'bg-indigo-100 text-indigo-800' : ''}
                      ${formData.typeCompteur === 'divisionnaire' ? 'bg-blue-100 text-blue-800' : ''}
                      ${formData.typeCompteur === 'collectif' ? 'bg-amber-100 text-amber-800' : ''}
                      ${formData.typeCompteur === 'individuel' ? 'bg-green-100 text-green-800' : ''}
                    `}>
                      {formData.typeCompteur === 'principal' && '🔵 Compteur Principal'}
                      {formData.typeCompteur === 'divisionnaire' && '💧 Compteur Divisionnaire'}
                      {formData.typeCompteur === 'collectif' && '🟡 Compteur Collectif'}
                      {formData.typeCompteur === 'individuel' && '🟢 Compteur Individuel'}
                    </div>
                    <span className="text-sm text-gray-500">
                      Le type ne peut pas être modifié après création
                    </span>
                  </div>
                </div>
              )}

              {/* Compteur principal (si type = divisionnaire) */}
              {formData.typeCompteur === 'divisionnaire' && (
                <div>
                  <label htmlFor="compteurPrincipalId" className="block text-sm font-medium text-gray-700 mb-1">
                    Compteur principal *
                  </label>
                  {compteursPrincipaux.length > 0 ? (
                    <select
                      id="compteurPrincipalId"
                      name="compteurPrincipalId"
                      required
                      value={formData.compteurPrincipalId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Sélectionnez le compteur principal</option>
                      {compteursPrincipaux.map((cpt) => (
                        <option key={cpt.id} value={cpt.id}>
                          {cpt.numero_compteur}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-amber-800 font-medium mb-2">
                            Aucun compteur principal disponible
                          </p>
                          <p className="text-sm text-amber-700 mb-3">
                            Pour créer un compteur divisionnaire, vous devez d'abord créer le compteur principal au pied de l'immeuble.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleTypeCompteurChange('principal')}
                            className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
                          >
                            → Créer d'abord le compteur principal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Lien vers le compteur général de l'immeuble
                  </p>
                </div>
              )}

              {/* 📊 Volume disponible (pour divisionnaire) */}
              {formData.typeCompteur === 'divisionnaire' && formData.compteurPrincipalId && !volumeInfo.loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Volume de référence (compteur principal)
                    </span>
                    <span className="text-base font-bold text-blue-600">
                      {volumeInfo.disponible} m³ disponibles
                    </span>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        volumeInfo.utilise / volumeInfo.principal > 0.9 
                          ? 'bg-red-500' 
                          : volumeInfo.utilise / volumeInfo.principal > 0.75 
                          ? 'bg-orange-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((volumeInfo.utilise / volumeInfo.principal) * 100, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Utilisé : {volumeInfo.utilise} m³</span>
                    <span>Total : {volumeInfo.principal} m³</span>
                  </div>

                  <p className="text-xs text-blue-700 mt-2">
                    ℹ️ Les compteurs divisionnaires partagent le volume du compteur principal (comme les millièmes)
                  </p>
                </div>
              )}

              {/* Type d'assignation */}
              <div>
                <label htmlFor="assignationType" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigné à
                  {formData.typeCompteur === 'principal' && (
                    <span className="ml-2 text-xs text-blue-600">
                      (⚠️ Un compteur principal ne peut PAS être assigné à un locataire)
                    </span>
                  )}
                </label>
                <select
                  id="assignationType"
                  name="assignationType"
                  value={formData.assignationType}
                  onChange={handleAssignationTypeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {assignmentOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                
                {/* Info message for principal */}
                {formData.typeCompteur === 'principal' && formData.assignationType === 'copropriete' && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Le compteur principal appartient à la copropriété. Tous les copropriétaires partagent ce compteur.
                    </p>
                  </div>
                )}
              </div>

              {/* Locataire (si type = locataire) */}
              {formData.assignationType === 'locataire' && (
                <div>
                  <label htmlFor="locataireId" className="block text-sm font-medium text-gray-700 mb-1">
                    Locataire *
                  </label>
                  <select
                    id="locataireId"
                    name="locataireId"
                    required
                    value={formData.locataireId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Sélectionnez un locataire</option>
                    {locataires.map((locataire) => (
                      <option key={locataire.id} value={locataire.id}>
                        {locataire.prenom} {locataire.nom}
                        {locataire.proprietaire_nom && ` (Prop: ${locataire.proprietaire_prenom} ${locataire.proprietaire_nom})`}
                      </option>
                    ))}
                  </select>
                  {locataires.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Aucun locataire disponible. Créez d'abord un locataire.
                    </p>
                  )}
                </div>
              )}

              {/* Propriétaire (si type = proprietaire ou proprietaire_gerant) */}
              {(formData.assignationType === 'proprietaire' || formData.assignationType === 'proprietaire_gerant') && (
                <div>
                  <label htmlFor="proprietaireId" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.assignationType === 'proprietaire_gerant' ? 'Propriétaire-gérant *' : 'Propriétaire occupant *'}
                  </label>
                  <select
                    id="proprietaireId"
                    name="proprietaireId"
                    required
                    value={formData.proprietaireId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Sélectionnez un propriétaire</option>
                    {proprietaires.map((proprietaire) => (
                      <option key={proprietaire.id} value={proprietaire.id}>
                        {proprietaire.prenom} {proprietaire.nom}
                      </option>
                    ))}
                  </select>
                  {proprietaires.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Aucun propriétaire disponible. Créez d'abord un propriétaire.
                    </p>
                  )}
                </div>
              )}

              {/* Emplacement */}
              <div>
                <label htmlFor="emplacement" className="block text-sm font-medium text-gray-700 mb-1">
                  Emplacement / Remarques
                </label>
                <textarea
                  id="emplacement"
                  name="emplacement"
                  rows="2"
                  value={formData.emplacement}
                  onChange={handleChange}
                  placeholder="Ex: Cave, 1er étage, local technique..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Actif */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="actif"
                  name="actif"
                  checked={formData.actif}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="actif" className="ml-2 block text-sm text-gray-700">
                  Compteur actif
                </label>
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
                disabled={loading}
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
                    {compteur ? 'Mettre à jour' : 'Créer le compteur'}
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

export default CompteursEauForm;
