import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, AlertCircle, Save, Loader } from 'lucide-react';
import { decomptesEauService, immeublesService } from '../../services/api';

function DecompteCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const immeubleIdFromState = location.state?.immeubleId;
  const immeubleNomFromState = location.state?.immeubleNom;
  const anneesExistantesFromState = location.state?.anneesExistantes || [];
  
  const [loading, setLoading] = useState(false);
  const [loadingImmeubles, setLoadingImmeubles] = useState(true);
  const [immeubles, setImmeubles] = useState([]);
  const [error, setError] = useState(null);
  
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    immeubleId: immeubleIdFromState || '',
    annee: currentYear,
    periodeDebut: `${currentYear}-01-01`,
    periodeFin: `${currentYear}-12-31`,
    notes: ''
  });

  const [validation, setValidation] = useState({
    anneeDejaExiste: false,
    datesMismatch: false
  });

  useEffect(() => {
    if (!immeubleIdFromState) {
      loadImmeubles();
    } else {
      setLoadingImmeubles(false);
    }
  }, []);

  useEffect(() => {
    const annee = parseInt(formData.annee);
    if (!isNaN(annee) && annee >= 2000 && annee <= 2100) {
      setFormData(prev => ({
        ...prev,
        periodeDebut: `${annee}-01-01`,
        periodeFin: `${annee}-12-31`
      }));
    }
  }, [formData.annee]);

  useEffect(() => {
    validateForm();
  }, [formData]);

  const loadImmeubles = async () => {
    try {
      const res = await immeublesService.getAll();
      setImmeubles(res.data.immeubles || []);
    } catch (err) {
      setError('Impossible de charger les immeubles');
    } finally {
      setLoadingImmeubles(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (anneesExistantesFromState.includes(parseInt(formData.annee))) {
      errors.anneeDejaExiste = true;
    }

    if (formData.periodeDebut && formData.periodeFin) {
      const yearDebut = new Date(formData.periodeDebut).getFullYear();
      const yearFin = new Date(formData.periodeFin).getFullYear();
      const anneeSelectionnee = parseInt(formData.annee);
      
      if (yearDebut !== anneeSelectionnee || yearFin !== anneeSelectionnee) {
        errors.datesMismatch = true;
      }
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!formData.immeubleId) {
      setError('Veuillez sélectionner un immeuble');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        immeuble_id: formData.immeubleId,
        annee: parseInt(formData.annee),
        periode_debut: formData.periodeDebut,
        periode_fin: formData.periodeFin,
        notes: formData.notes || null
      };

      await decomptesEauService.create(payload);
      navigate('/decomptes');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du décompte');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableYears = () => {
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  if (loadingImmeubles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/decomptes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Retour aux décomptes
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Nouveau décompte d'eau</h1>
        {immeubleNomFromState && <p className="text-gray-600 mt-1">Pour l'immeuble : {immeubleNomFromState}</p>}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="h-4 w-4 inline mr-1" />
              Immeuble *
            </label>
            {immeubleIdFromState ? (
              <div className="px-4 py-3 bg-gray-50 border rounded-lg text-gray-700">
                {immeubleNomFromState}
              </div>
            ) : (
              <select
                value={formData.immeubleId}
                onChange={(e) => setFormData(prev => ({ ...prev, immeubleId: e.target.value }))}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Sélectionner un immeuble</option>
                {immeubles.map(immeuble => (
                  <option key={immeuble.id} value={immeuble.id}>
                    {immeuble.nom} - {immeuble.adresse}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Année du décompte *
            </label>
            <select
              value={formData.annee}
              onChange={(e) => setFormData(prev => ({ ...prev, annee: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                validation.anneeDejaExiste ? 'border-red-300 bg-red-50' : ''
              }`}
              required
            >
              {getAvailableYears().map(year => {
                const existe = anneesExistantesFromState.includes(year);
                return (
                  <option 
                    key={year} 
                    value={year}
                    disabled={existe}
                  >
                    {year} {existe ? '(déjà existant)' : ''}
                  </option>
                );
              })}
            </select>
            
            {validation.anneeDejaExiste && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Un décompte existe déjà pour cette année sur cet immeuble
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début *
              </label>
              <input
                type="date"
                value={formData.periodeDebut}
                onChange={(e) => setFormData(prev => ({ ...prev, periodeDebut: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  validation.datesMismatch ? 'border-red-300 bg-red-50' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="date"
                value={formData.periodeFin}
                onChange={(e) => setFormData(prev => ({ ...prev, periodeFin: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  validation.datesMismatch ? 'border-red-300 bg-red-50' : ''
                }`}
                required
              />
            </div>
          </div>

          {validation.datesMismatch && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-600 font-medium">Incohérence détectée</p>
                <p className="text-red-600 text-sm mt-1">
                  Les dates de période doivent correspondre à l'année sélectionnée ({formData.annee}).
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Période :</strong> {formData.periodeDebut && new Date(formData.periodeDebut).toLocaleDateString('fr-FR')} 
              {' → '} 
              {formData.periodeFin && new Date(formData.periodeFin).toLocaleDateString('fr-FR')}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Année du décompte : {formData.annee}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Ajouter des notes..."
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/decomptes')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || validation.anneeDejaExiste || validation.datesMismatch}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Créer le décompte
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DecompteCreate;
