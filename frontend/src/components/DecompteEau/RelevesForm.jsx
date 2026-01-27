import { useState, useEffect } from 'react';
import { relevesService } from '../../services/api';
import { X, Save, AlertCircle, Calendar, Droplets } from 'lucide-react';

function RelevesForm({ decompteId, compteurs, onClose, onSuccess }) {
  const [dateReleve, setDateReleve] = useState(new Date().toISOString().split('T')[0]);
  const [releves, setReleves] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialiser avec les compteurs
    const initialReleves = compteurs.map(compteur => ({
      compteurId: compteur.id,
      numero_compteur: compteur.numero_compteur,
      locataire_nom: compteur.locataire_nom || compteur.proprietaire_nom || 'Non assigné',
      locataire_prenom: compteur.locataire_prenom || compteur.proprietaire_prenom || '',
      nombre_habitants: compteur.nombre_habitants || 0,
      indexPrecedent: '',
      indexActuel: '',
      consommation: 0,
      notes: ''
    }));
    setReleves(initialReleves);
  }, [compteurs]);

  const handleIndexChange = (index, field, value) => {
    const newReleves = [...releves];
    newReleves[index][field] = value;

    // Calculer automatiquement la consommation
    if (field === 'indexPrecedent' || field === 'indexActuel') {
      const precedent = parseFloat(newReleves[index].indexPrecedent) || 0;
      const actuel = parseFloat(newReleves[index].indexActuel) || 0;
      newReleves[index].consommation = Math.max(0, actuel - precedent);
    }

    setReleves(newReleves);
  };

  const validateForm = () => {
    const newErrors = [];

    if (!dateReleve) {
      newErrors.push('La date du relevé est requise');
    }

    releves.forEach((releve, idx) => {
      if (releve.indexPrecedent === '' || releve.indexActuel === '') {
        newErrors.push(`Compteur ${releve.numero_compteur}: Les index sont requis`);
      }

      const precedent = parseFloat(releve.indexPrecedent);
      const actuel = parseFloat(releve.indexActuel);

      if (actuel < precedent) {
        newErrors.push(`Compteur ${releve.numero_compteur}: L'index actuel doit être ≥ index précédent`);
      }

      if (releve.consommation > 1000) {
        newErrors.push(`Compteur ${releve.numero_compteur}: Consommation anormalement élevée (${releve.consommation} m³)`);
      }
    });

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
      // Envoyer en masse
      const relevesData = releves.map(r => ({
        compteurId: r.compteurId,
        dateReleve,
        indexPrecedent: parseFloat(r.indexPrecedent),
        indexActuel: parseFloat(r.indexActuel),
        notes: r.notes || null
      }));

      await relevesService.bulkImport(decompteId, relevesData);

      onSuccess();
    } catch (err) {
      console.error('Error saving releves:', err);
      setErrors([err.response?.data?.message || 'Erreur lors de la sauvegarde des relevés']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Saisir les relevés de compteurs
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {errors.length} erreur{errors.length > 1 ? 's' : ''}
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

            {/* Date du relevé */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date du relevé *
              </label>
              <input
                type="date"
                value={dateReleve}
                onChange={(e) => setDateReleve(e.target.value)}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Table des relevés */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Locataire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Index précédent (m³) *
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Index actuel (m³) *
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consommation (m³)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Habitants
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {releves.map((releve, index) => (
                    <tr key={releve.compteurId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Droplets className="h-5 w-5 text-cyan-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {releve.numero_compteur}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {releve.locataire_prenom} {releve.locataire_nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          required
                          value={releve.indexPrecedent}
                          onChange={(e) => handleIndexChange(index, 'indexPrecedent', e.target.value)}
                          placeholder="0.000"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          required
                          value={releve.indexActuel}
                          onChange={(e) => handleIndexChange(index, 'indexActuel', e.target.value)}
                          placeholder="0.000"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          releve.consommation > 1000 ? 'text-red-600' :
                          releve.consommation > 0 ? 'text-primary-600' :
                          'text-gray-400'
                        }`}>
                          {releve.consommation.toFixed(3)} m³
                        </span>
                        {releve.consommation > 1000 && (
                          <div className="text-xs text-red-500 mt-1">⚠ Très élevé</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {releve.nombre_habitants}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Résumé */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">Total compteurs</div>
                  <div className="text-2xl font-bold text-gray-900">{releves.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Consommation totale</div>
                  <div className="text-2xl font-bold text-primary-600">
                    {releves.reduce((sum, r) => sum + r.consommation, 0).toFixed(3)} m³
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Habitants totaux</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {releves.reduce((sum, r) => sum + (r.nombre_habitants || 0), 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
                  Enregistrer les relevés
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RelevesForm;
