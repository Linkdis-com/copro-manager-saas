import { useState, useEffect } from 'react';
import { locatairesService, proprietairesService } from '../../services/api';
import { X, AlertCircle, Save } from 'lucide-react';

function LocatairesForm({ locataire, immeubles, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    immeubleId: '',
    proprietaireId: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    appartement: '',
    dateDebutBail: '',
    dateFinBail: '',
    loyerMensuel: '',
    chargesMensuelles: '',
    quotePartMilliemes: '',
    nombreHabitants: ''
  });
  
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proprietaires, setProprietaires] = useState([]);
  const [loadingProprietaires, setLoadingProprietaires] = useState(false);

  useEffect(() => {
    if (locataire) {
      setFormData({
        immeubleId: locataire.immeuble_id || '',
        proprietaireId: locataire.proprietaire_id || '',
        nom: locataire.nom || '',
        prenom: locataire.prenom || '',
        email: locataire.email || '',
        telephone: locataire.telephone || '',
        appartement: locataire.appartement || '',
        dateDebutBail: locataire.date_debut_bail ? locataire.date_debut_bail.split('T')[0] : '',
        dateFinBail: locataire.date_fin_bail ? locataire.date_fin_bail.split('T')[0] : '',
        // ✅ Convertir 0 ou null en string vide
        loyerMensuel: locataire.loyer_mensuel && locataire.loyer_mensuel > 0 ? locataire.loyer_mensuel : '',
        chargesMensuelles: locataire.charges_mensuelles && locataire.charges_mensuelles > 0 ? locataire.charges_mensuelles : '',
        quotePartMilliemes: locataire.quote_part_milliemes || '',
        nombreHabitants: locataire.nombre_habitants || ''
      });
      
      if (locataire.immeuble_id) {
        loadProprietaires(locataire.immeuble_id);
      }
    } else if (immeubles.length > 0) {
      const firstImmeuble = immeubles[0].id;
      setFormData(prev => ({
        ...prev,
        immeubleId: firstImmeuble
      }));
      // ✅ Charger immédiatement les propriétaires
      loadProprietaires(firstImmeuble);
    }
  }, [locataire, immeubles]);

  const loadProprietaires = async (immeubleId) => {
    try {
      setLoadingProprietaires(true);
      const response = await proprietairesService.getByImmeuble(immeubleId);
      const proprietairesData = response.data.proprietaires || [];
      setProprietaires(proprietairesData);
      
      // ✅ Ne sélectionner auto que si pas de locataire en édition
      if (!locataire && proprietairesData.length > 0) {
        setFormData(prev => ({
          ...prev,
          proprietaireId: proprietairesData[0].id
        }));
      }
    } catch (err) {
      console.error('Error loading proprietaires:', err);
    } finally {
      setLoadingProprietaires(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'immeubleId') {
      loadProprietaires(value);
      setFormData(prev => ({
        ...prev,
        proprietaireId: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.immeubleId) {
      newErrors.push('L\'immeuble est requis');
    }
    if (!formData.proprietaireId) {
      newErrors.push('Le propriétaire est requis');
    }
    if (!formData.nom.trim()) {
      newErrors.push('Le nom est requis');
    }
    if (!formData.prenom.trim()) {
      newErrors.push('Le prénom est requis');
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('L\'email n\'est pas valide');
    }
    if (!formData.dateDebutBail) {
      newErrors.push('La date d\'entrée est requise');
    }
    if (formData.dateFinBail && formData.dateDebutBail) {
      const debut = new Date(formData.dateDebutBail);
      const fin = new Date(formData.dateFinBail);
      if (fin <= debut) {
        newErrors.push('La date de sortie doit être après la date d\'entrée');
      }
    }
    if (formData.loyerMensuel && parseFloat(formData.loyerMensuel) < 0) {
      newErrors.push('Le loyer ne peut pas être négatif');
    }
    if (formData.chargesMensuelles && parseFloat(formData.chargesMensuelles) < 0) {
      newErrors.push('Les charges ne peuvent pas être négatives');
    }
    if (formData.quotePartMilliemes && parseFloat(formData.quotePartMilliemes) < 0) {
      newErrors.push('La quote-part ne peut pas être négative');
    }
    if (formData.nombreHabitants && parseInt(formData.nombreHabitants) < 0) {
      newErrors.push('Le nombre d\'habitants ne peut pas être négatif');
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
        proprietaireId: formData.proprietaireId,
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim() || null,
        telephone: formData.telephone.trim() || null,
        appartement: formData.appartement.trim() || null,
        dateDebutBail: formData.dateDebutBail,
        dateFinBail: formData.dateFinBail || null,
        // ✅ CORRECTION: Convertir en null si vide ou 0
        loyerMensuel: formData.loyerMensuel && formData.loyerMensuel !== '' && parseFloat(formData.loyerMensuel) > 0
          ? parseFloat(formData.loyerMensuel) 
          : null,
        chargesMensuelles: formData.chargesMensuelles && formData.chargesMensuelles !== '' && parseFloat(formData.chargesMensuelles) > 0
          ? parseFloat(formData.chargesMensuelles) 
          : null,
        quotePartMilliemes: formData.quotePartMilliemes && formData.quotePartMilliemes !== '' 
          ? parseFloat(formData.quotePartMilliemes) 
          : null,
        nombreHabitants: formData.nombreHabitants && formData.nombreHabitants !== ''
          ? parseInt(formData.nombreHabitants)
          : null
      };

      console.log('💾 Saving locataire:', data);

      if (locataire) {
        await locatairesService.update(formData.immeubleId, locataire.id, data);
      } else {
        await locatairesService.create(formData.immeubleId, data);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving locataire:', err);
      if (err.response?.data?.errors) {
        setErrors(Array.isArray(err.response.data.errors) 
          ? err.response.data.errors 
          : [err.response.data.message || 'Erreur lors de l\'enregistrement']
        );
      } else {
        setErrors([err.message || 'Erreur lors de l\'enregistrement du locataire']);
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
            Vous devez d'abord créer un immeuble avant d'ajouter des locataires.
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto z-50">
      {/* ✅ CORRECTION MOBILE: Conteneur avec overflow-y-auto et padding */}
      <div className="min-h-screen px-4 py-6 flex items-start justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">
              {locataire ? 'Modifier le locataire' : 'Ajouter un locataire'}
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

            <div className="space-y-6">
              {/* Sélection immeuble et propriétaire */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Immeuble et propriétaire</h3>
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
                      disabled={!!locataire}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    >
                      {immeubles.map((immeuble) => (
                        <option key={immeuble.id} value={immeuble.id}>
                          {immeuble.nom}
                        </option>
                      ))}
                    </select>
                    {locataire && (
                      <p className="mt-1 text-xs text-gray-500">
                        L'immeuble ne peut pas être modifié après création
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="proprietaireId" className="block text-sm font-medium text-gray-700 mb-1">
                      Propriétaire *
                    </label>
                    {loadingProprietaires ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                        <span className="text-sm text-gray-500">Chargement...</span>
                      </div>
                    ) : (
                      <select
                        id="proprietaireId"
                        name="proprietaireId"
                        required
                        value={formData.proprietaireId}
                        onChange={handleChange}
                        disabled={proprietaires.length === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                      >
                        {proprietaires.length === 0 ? (
                          <option>Aucun propriétaire disponible</option>
                        ) : (
                          proprietaires.map((prop) => (
                            <option key={prop.id} value={prop.id}>
                              {prop.prenom} {prop.nom}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                    {proprietaires.length === 0 && !loadingProprietaires && (
                      <p className="mt-1 text-xs text-red-600">
                        Créez d'abord un propriétaire pour cet immeuble
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations personnelles */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      required
                      value={formData.prenom}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Jean"
                    />
                  </div>

                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      required
                      value={formData.nom}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Dupont"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="jean.dupont@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="telephone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0472 123 456"
                    />
                  </div>
                </div>
              </div>

              {/* Informations de location */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Informations de location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="appartement" className="block text-sm font-medium text-gray-700 mb-1">
                      Appartement / Lot
                    </label>
                    <input
                      type="text"
                      id="appartement"
                      name="appartement"
                      value={formData.appartement}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: A12, 3ème étage"
                    />
                  </div>

                  <div>
                    <label htmlFor="nombreHabitants" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'habitants
                    </label>
                    <input
                      type="number"
                      id="nombreHabitants"
                      name="nombreHabitants"
                      min="0"
                      value={formData.nombreHabitants}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: 2"
                    />
                  </div>

                  <div>
                    <label htmlFor="dateDebutBail" className="block text-sm font-medium text-gray-700 mb-1">
                      Date d'entrée *
                    </label>
                    <input
                      type="date"
                      id="dateDebutBail"
                      name="dateDebutBail"
                      required
                      value={formData.dateDebutBail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="dateFinBail" className="block text-sm font-medium text-gray-700 mb-1">
                      Date de sortie (optionnelle)
                    </label>
                    <input
                      type="date"
                      id="dateFinBail"
                      name="dateFinBail"
                      value={formData.dateFinBail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Informations financières */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Informations financières (optionnelles)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="loyerMensuel" className="block text-sm font-medium text-gray-700 mb-1">
                      Loyer mensuel (€)
                    </label>
                    <input
                      type="number"
                      id="loyerMensuel"
                      name="loyerMensuel"
                      min="0"
                      step="0.01"
                      value={formData.loyerMensuel}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: 850.00"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Laissez vide si confidentiel
                    </p>
                  </div>

                  <div>
                    <label htmlFor="chargesMensuelles" className="block text-sm font-medium text-gray-700 mb-1">
                      Charges mensuelles (€)
                    </label>
                    <input
                      type="number"
                      id="chargesMensuelles"
                      name="chargesMensuelles"
                      min="0"
                      step="0.01"
                      value={formData.chargesMensuelles}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: 150.00"
                    />
                  </div>

                  <div>
                    <label htmlFor="quotePartMilliemes" className="block text-sm font-medium text-gray-700 mb-1">
                      Quote-part (millièmes)
                    </label>
                    <input
                      type="number"
                      id="quotePartMilliemes"
                      name="quotePartMilliemes"
                      min="0"
                      step="0.01"
                      value={formData.quotePartMilliemes}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: 50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || proprietaires.length === 0 || loadingProprietaires}
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
                    {locataire ? 'Mettre à jour' : 'Créer'}
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

export default LocatairesForm;
