import { useState, useEffect } from 'react';
import { relevesService } from '../../services/api';
import { X, AlertCircle, Save, Calendar } from 'lucide-react';

function RelevesForm({ decompteId, compteurs, onClose, onSuccess }) {
  const [releves, setReleves] = useState([]);
  const [dateReleve, setDateReleve] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialiser avec tous les compteurs
    const initialReleves = compteurs.map(compteur => ({
      compteurId: compteur.id,
      numeroCompteur: compteur.numero_compteur,
      locataireNom: compteur.locataire_nom 
        ? `${compteur.locataire_prenom} ${compteur.locataire_nom}`
        : 'Non assigné',
      indexPrecedent: '',
      indexActuel: '',
      nombreHabitants: compteur.nombre_habitants || 0
    }));
    setReleves(initialReleves);
  }, [compteurs]);

  const handleReleveChange = (compteurId, field, value) => {
    setReleves(prev => prev.map(r => 
      r.compteurId === compteurId 
        ? { ...r, [field]: value }
        : r
    ));
  };

  const validateForm = () => {
    const newErrors = [];

    if (!dateReleve) {
      newErrors.push('La date du relevé est requise');
    }

    releves.forEach(releve => {
      if (releve.indexPrecedent !== '' && releve.indexActuel !== '') {
        const prev = parseFloat(releve.indexPrecedent);
        const actual = parseFloat(releve.indexActuel);
        
        if (isNaN(prev) || isNaN(actual)) {
          newErrors.push(`${releve.numeroCompteur}: Les index doivent être des nombres`);
        } else if (actual < prev) {
          newErrors.push(`${releve.numeroCompteur}: L'index actuel doit être supérieur ou égal à l'index précédent`);
        }
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
      // Créer les relevés uniquement pour les compteurs avec des valeurs remplies
      const relevesToCreate = releves.filter(r => 
        r.indexPrecedent !== '' && r.indexActuel !== ''
      );

      if (relevesToCreate.length === 0) {
        setErrors(['Veuillez saisir au moins un relevé']);
        setLoading(false);
        return;
      }

      const promises = relevesToCreate.map(releve =>
        relevesService.create(decompteId, {
          compteurId: releve.compteurId,
          dateReleve: dateReleve,
          indexPrecedent: parseFloat(releve.indexPrecedent),
          indexActuel: parseFloat(releve.indexActuel)
        })
      );

      await Promise.all(promises);
      onSuccess();
    } catch (err) {
      console.error('Error creating releves:', err);
      setErrors([err.response?.data?.message || 'Erreur lors de la sauvegarde des relevés']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
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

          {/* Date du relevé */}
          <div className="mb-6">
            <label htmlFor="dateReleve" className="block text-sm font-medium text-gray-700 mb-2">
              Date du relevé *
            </label>
            <input
              type="date"
              id="dateReleve"
              value={dateReleve}
              onChange={(e) => setDateReleve(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Tableau des relevés */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Compteur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Locataire
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Index précédent (m³)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Index actuel (m³)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Consommation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Habitants
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {releves.map((releve) => {
                  const consommation = releve.indexActuel && releve.indexPrecedent
                    ? (parseFloat(releve.indexActuel) - parseFloat(releve.indexPrecedent)).toFixed(2)
                    : '-';
                  
                  return (
                    <tr key={releve.compteurId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {releve.numeroCompteur}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {releve.locataireNom}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={releve.indexPrecedent}
                          onChange={(e) => handleReleveChange(releve.compteurId, 'indexPrecedent', e.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={releve.indexActuel}
                          onChange={(e) => handleReleveChange(releve.compteurId, 'indexActuel', e.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-600">
                        {consommation}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {releve.nombreHabitants}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {compteurs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun compteur configuré pour cet immeuble
            </div>
          )}

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
              disabled={loading || compteurs.length === 0}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
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