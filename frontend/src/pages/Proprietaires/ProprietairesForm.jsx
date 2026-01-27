import { useState, useEffect } from 'react';
import { proprietairesService } from '../../services/api';
import { X, AlertCircle, Save, AlertTriangle, CheckCircle } from 'lucide-react';

function ProprietairesForm({ proprietaire, immeubles, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    immeubleId: '',
    typeProprietaire: 'personne_physique',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    numeroTva: '',
    partsCoproprietaire: '',
    milliemes: '',
    numeroCompteBancaire: ''
  });
  
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImmeuble, setSelectedImmeuble] = useState(null);
  
  // ✅ NOUVEAU: État pour les millièmes disponibles
  const [millièmesDisponibles, setMillièmesDisponibles] = useState(1000);
  const [millièmesUtilises, setMillièmesUtilises] = useState(0);
  
  // ✅ CORRECTION: Recharger les millièmes à chaque ouverture du formulaire
  useEffect(() => {
    if (formData.immeubleId) {
      loadMillièmesDisponibles(formData.immeubleId);
    }
  }, [formData.immeubleId, proprietaire]);

  useEffect(() => {
    if (proprietaire) {
      setFormData({
        immeubleId: proprietaire.immeuble_id || '',
        typeProprietaire: proprietaire.type_proprietaire || 'personne_physique',
        nom: proprietaire.nom || '',
        prenom: proprietaire.prenom || '',
        email: proprietaire.email || '',
        telephone: proprietaire.telephone || '',
        adresse: proprietaire.adresse || '',
        numeroTva: proprietaire.numero_tva || '',
        partsCoproprietaire: proprietaire.parts_coproprietaire || '',
        milliemes: proprietaire.milliemes || '',
        numeroCompteBancaire: proprietaire.numero_compte_bancaire || ''
      });
      
      const immeuble = immeubles.find(i => i.id === proprietaire.immeuble_id);
      setSelectedImmeuble(immeuble);
      
      // ✅ NOUVEAU: Charger les millièmes disponibles
      if (proprietaire.immeuble_id) {
        loadMillièmesDisponibles(proprietaire.immeuble_id);
      }
    } else if (immeubles.length > 0) {
      setFormData(prev => ({
        ...prev,
        immeubleId: immeubles[0].id
      }));
      setSelectedImmeuble(immeubles[0]);
      loadMillièmesDisponibles(immeubles[0].id);
    }
  }, [proprietaire, immeubles]);

  // ✅ NOUVEAU: Charger les millièmes disponibles
  const loadMillièmesDisponibles = async (immeubleId) => {
    try {
      const response = await proprietairesService.getByImmeuble(immeubleId);
      const props = response.data.proprietaires || [];
      
      // Exclure le propriétaire en cours d'édition
      const autresProprietaires = proprietaire 
        ? props.filter(p => p.id !== proprietaire.id)
        : props;
      
      // Calculer millièmes utilisés
      const utilises = autresProprietaires.reduce((sum, p) => {
        return sum + (p.milliemes || p.parts_coproprietaire || 0);
      }, 0);
      
      setMillièmesUtilises(utilises);
      setMillièmesDisponibles(1000 - utilises);
    } catch (err) {
      console.error('Error loading proprietaires:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'immeubleId') {
      const immeuble = immeubles.find(i => i.id === value);
      setSelectedImmeuble(immeuble);
      loadMillièmesDisponibles(value);
      setFormData(prev => ({
        ...prev,
        partsCoproprietaire: '',
        milliemes: ''
      }));
    }
  };

  // ✅ NOUVEAU: Vérifier si les millièmes dépassent
  const isMillièmesExceeded = () => {
    if (!selectedImmeuble) return false;
    
    const systeme = selectedImmeuble.systeme_repartition || 'milliemes';
    const valeurSaisie = systeme === 'milliemes' 
      ? parseFloat(formData.milliemes) || 0
      : parseInt(formData.partsCoproprietaire) || 0;
    
    return valeurSaisie > millièmesDisponibles;
  };

  // ✅ NOUVEAU: Calculer le pourcentage pour la barre
  const getProgressPercentage = () => {
    if (!selectedImmeuble) return 0;
    
    const systeme = selectedImmeuble.systeme_repartition || 'milliemes';
    const valeurSaisie = systeme === 'milliemes' 
      ? parseFloat(formData.milliemes) || 0
      : parseInt(formData.partsCoproprietaire) || 0;
    
    const total = millièmesUtilises + valeurSaisie;
    return Math.min((total / 1000) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 90) return 'bg-orange-500';
    if (percentage > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.immeubleId) {
      newErrors.push('L\'immeuble est requis');
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
    
    if (selectedImmeuble) {
      const systeme = selectedImmeuble.systeme_repartition || 'milliemes';
      
      if (systeme === 'milliemes') {
        if (!formData.milliemes || parseFloat(formData.milliemes) <= 0) {
          newErrors.push('Les millièmes sont requis et doivent être supérieurs à 0');
        }
        // ✅ NOUVEAU: Vérification dépassement
        if (parseFloat(formData.milliemes) > millièmesDisponibles) {
          newErrors.push(`❌ Dépassement de millièmes ! Vous avez saisi ${formData.milliemes} millièmes mais seulement ${millièmesDisponibles} millièmes sont disponibles (${millièmesUtilises} déjà utilisés sur 1000).`);
        }
      } else {
        if (!formData.partsCoproprietaire || parseInt(formData.partsCoproprietaire) <= 0) {
          newErrors.push('Le nombre de parts est requis et doit être supérieur à 0');
        }
        // ✅ NOUVEAU: Vérification dépassement
        if (parseInt(formData.partsCoproprietaire) > millièmesDisponibles) {
          newErrors.push(`❌ Dépassement de parts ! Vous avez saisi ${formData.partsCoproprietaire} parts mais seulement ${millièmesDisponibles} parts sont disponibles (${millièmesUtilises} déjà utilisés sur 1000).`);
        }
      }
    }

    if (formData.numeroTva && formData.typeProprietaire === 'personne_morale') {
      const tvaRegex = /^BE\s?0?\d{3}\.?\d{3}\.?\d{3}$/i;
      if (!tvaRegex.test(formData.numeroTva)) {
        newErrors.push('Le numéro de TVA belge doit être au format BE 0XXX.XXX.XXX');
      }
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
        typeProprietaire: formData.typeProprietaire,
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim() || null,
        telephone: formData.telephone.trim() || null,
        adresse: formData.adresse.trim() || null,
        numeroTva: formData.numeroTva.trim() || null,
        partsCoproprietaire: formData.partsCoproprietaire ? parseInt(formData.partsCoproprietaire) : null,
        milliemes: formData.milliemes ? parseFloat(formData.milliemes) : null,
        numeroCompteBancaire: formData.numeroCompteBancaire.trim() || null
      };

      if (proprietaire) {
        await proprietairesService.update(formData.immeubleId, proprietaire.id, data);
      } else {
        await proprietairesService.create(formData.immeubleId, data);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving proprietaire:', err);
      
      // ✅ AMÉLIORATION: Messages d'erreur plus clairs
      if (err.response?.data?.errors) {
        setErrors(Array.isArray(err.response.data.errors) 
          ? err.response.data.errors 
          : [err.response.data.message || 'Erreur lors de l\'enregistrement']
        );
      } else if (err.response?.data?.message) {
        const errorMsg = err.response.data.message;
        if (errorMsg.includes('millièmes') || errorMsg.includes('parts') || errorMsg.includes('1000')) {
          setErrors([`❌ Dépassement détecté ! Les millièmes/parts totaux ne peuvent pas dépasser 1000. Actuellement ${millièmesUtilises} sont utilisés, il reste ${millièmesDisponibles} disponibles.`]);
        } else {
          setErrors([errorMsg]);
        }
      } else {
        setErrors(['Erreur lors de l\'enregistrement du propriétaire']);
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
            Vous devez d'abord créer un immeuble avant d'ajouter des propriétaires.
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

  const systemeRepartition = selectedImmeuble?.systeme_repartition || 'milliemes';
  const label = systemeRepartition === 'milliemes' ? 'millièmes' : 'parts';
  const exceeded = isMillièmesExceeded();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto z-50">
    <div className="min-h-screen px-4 py-6 flex items-start justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-4">
        {/* Header */}
<div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">
            {proprietaire ? 'Modifier le propriétaire' : 'Ajouter un propriétaire'}
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
            {/* Sélection immeuble et type */}
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
                    disabled={!!proprietaire}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  >
                    {immeubles.map((immeuble) => (
                      <option key={immeuble.id} value={immeuble.id}>
                        {immeuble.nom}
                      </option>
                    ))}
                  </select>
                  {proprietaire && (
                    <p className="mt-1 text-xs text-gray-500">
                      L'immeuble ne peut pas être modifié après création
                    </p>
                  )}
                  {selectedImmeuble && (
                    <p className="mt-1 text-xs text-primary-600">
                      Système: {systemeRepartition === 'milliemes' ? 'Millièmes' : 'Parts'}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="typeProprietaire" className="block text-sm font-medium text-gray-700 mb-1">
                    Type de propriétaire *
                  </label>
                  <select
                    id="typeProprietaire"
                    name="typeProprietaire"
                    required
                    value={formData.typeProprietaire}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="personne_physique">Personne physique</option>
                    <option value="personne_morale">Personne morale (Société)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Informations personnelles */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {formData.typeProprietaire === 'personne_morale' ? 'Informations société' : 'Informations personnelles'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.typeProprietaire === 'personne_morale' ? 'Représentant (prénom)' : 'Prénom'} *
                  </label>
                  <input
                    type="text"
                    id="prenom"
                    name="prenom"
                    required
                    value={formData.prenom}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={formData.typeProprietaire === 'personne_morale' ? 'Jean' : 'Jean'}
                  />
                </div>

                <div>
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.typeProprietaire === 'personne_morale' ? 'Nom société' : 'Nom'} *
                  </label>
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    required
                    value={formData.nom}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={formData.typeProprietaire === 'personne_morale' ? 'Immo Solutions SA' : 'Dupont'}
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
                    placeholder="contact@example.com"
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

                <div className="md:col-span-2">
                  <label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse complète
                  </label>
                  <textarea
                    id="adresse"
                    name="adresse"
                    rows="2"
                    value={formData.adresse}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Rue de la Loi 123, 1000 Bruxelles"
                  />
                </div>

                {formData.typeProprietaire === 'personne_morale' && (
                  <div className="md:col-span-2">
                    <label htmlFor="numeroTva" className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de TVA (optionnel)
                    </label>
                    <input
                      type="text"
                      id="numeroTva"
                      name="numeroTva"
                      value={formData.numeroTva}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="BE 0123.456.789"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Format belge : BE 0XXX.XXX.XXX
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ NOUVEAU: Informations de copropriété avec indicateur */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Informations de copropriété</h3>
              
              {/* Indicateur millièmes disponibles */}
              {selectedImmeuble && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {label.charAt(0).toUpperCase() + label.slice(1)} disponibles
                    </span>
                    <span className={`text-base font-bold ${exceeded ? 'text-red-600' : 'text-green-600'}`}>
                      {exceeded ? (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Dépassement !
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {millièmesDisponibles} / 1000
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getProgressColor()}`}
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Utilisés : {millièmesUtilises}</span>
                    <span>Total : {millièmesUtilises + (systemeRepartition === 'milliemes' ? (parseFloat(formData.milliemes) || 0) : (parseInt(formData.partsCoproprietaire) || 0))}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {systemeRepartition === 'milliemes' ? (
                  <div>
                    <label htmlFor="milliemes" className="block text-sm font-medium text-gray-700 mb-1">
                      Quote-part (millièmes) *
                    </label>
                    <input
                      type="number"
                      id="milliemes"
                      name="milliemes"
                      min="0"
                      step="0.01"
                      required
                      value={formData.milliemes}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                        exceeded 
                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                      }`}
                      placeholder="Ex: 250.50"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Quote-part dans les charges communes (sur 1000 millièmes)
                    </p>
                    
                    {/* Message d'alerte si dépassement */}
                    {exceeded && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          <strong>Attention !</strong> La valeur saisie dépasse les millièmes disponibles. 
                          Maximum autorisé : <strong>{millièmesDisponibles} millièmes</strong>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="partsCoproprietaire" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de parts *
                    </label>
                    <input
                      type="number"
                      id="partsCoproprietaire"
                      name="partsCoproprietaire"
                      min="0"
                      step="1"
                      required
                      value={formData.partsCoproprietaire}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                        exceeded 
                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                      }`}
                      placeholder="Ex: 100"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Nombre de parts possédées (sur 1000 parts au total)
                    </p>
                    
                    {/* Message d'alerte si dépassement */}
                    {exceeded && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          <strong>Attention !</strong> La valeur saisie dépasse les parts disponibles. 
                          Maximum autorisé : <strong>{millièmesDisponibles} parts</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Informations bancaires */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Informations bancaires (optionnel)</h3>
              <div>
                <label htmlFor="numeroCompteBancaire" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de compte bancaire (IBAN)
                </label>
                <input
                  type="text"
                  id="numeroCompteBancaire"
                  name="numeroCompteBancaire"
                  value={formData.numeroCompteBancaire}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="BE68 5390 0754 7034"
                />
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
              disabled={loading || exceeded}
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
                  {proprietaire ? 'Mettre à jour' : 'Créer'}
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

export default ProprietairesForm;
