import { useState, useEffect } from 'react';
import { compteursEauService } from '../../../services/api';
import { Plus, Droplets, Edit, Trash2, AlertCircle, X, Check } from 'lucide-react';
import CompteurTypeGuide from '../CompteurTypeGuide';
import NumeroCompteurInput from '../NumeroCompteurInput';

export default function CompteursTab({ decompte, onUpdate, disabled }) {
  const [compteurs, setCompteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [modeComptageEau, setModeComptageEau] = useState('');
  const [numeroCompteurPrincipal, setNumeroCompteurPrincipal] = useState('');
  
  const [formData, setFormData] = useState({
    type_compteur: 'divisionnaire',
    numero_compteur: '',
    emplacement: '',
    actif: true
  });

  useEffect(() => {
    if (decompte) {
      setModeComptageEau(decompte.mode_comptage_eau || 'divisionnaire');
      setNumeroCompteurPrincipal(decompte.numero_compteur_principal || '');
    }
  }, [decompte]);

  useEffect(() => {
    if (decompte?.immeuble_id) {
      loadCompteurs();
    }
  }, [decompte?.immeuble_id]);

  const loadCompteurs = async () => {
    if (!decompte || !decompte.immeuble_id) return;
    
    try {
      setLoading(true);
      const data = await compteursEauService.getAll(decompte.immeuble_id);
      setCompteurs(data.compteurs || []);
    } catch (error) {
      console.error('Error loading compteurs:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Bloquer changement de mode si compteurs existent
  const canChangeModeComptage = compteurs.length === 0;

  const handleModeComptageChange = (e) => {
    if (!canChangeModeComptage) {
      alert('Impossible de changer le mode de comptage : des compteurs existent déjà. Supprimez-les d\'abord.');
      return;
    }
    
    const value = e.target.value;
    setModeComptageEau(value);
    onUpdate({
      ...decompte,
      mode_comptage_eau: value
    });
  };

  const handleNumeroCompteurChange = (value) => {
    setNumeroCompteurPrincipal(value);
    onUpdate({
      ...decompte,
      numero_compteur_principal: value
    });
  };

  const handleStartCreate = (type = 'divisionnaire') => {
    setFormData({
      type_compteur: type,
      numero_compteur: '',
      emplacement: '',
      actif: true
    });
    setEditingId(null);
    setShowCreateForm(true);
  };

  const handleStartEdit = (compteur) => {
    setFormData({
      type_compteur: compteur.type_compteur,
      numero_compteur: compteur.numero_compteur,
      emplacement: compteur.emplacement || '',
      actif: compteur.actif !== false
    });
    setEditingId(compteur.id);
    setShowCreateForm(true);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      type_compteur: 'divisionnaire',
      numero_compteur: '',
      emplacement: '',
      actif: true
    });
  };

  const handleSaveCompteur = async () => {
    try {
      const payload = {
        ...formData,
        immeuble_id: decompte.immeuble_id
      };

      if (editingId) {
        await compteursEauService.update(decompte.immeuble_id, editingId, payload);
      } else {
        await compteursEauService.create(decompte.immeuble_id, payload);
      }
      
      loadCompteurs();
      handleCancelForm();
    } catch (error) {
      console.error('Error saving compteur:', error);
      alert(`Erreur lors de la sauvegarde: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (compteur) => {
    if (!confirm(`Supprimer le compteur ${compteur.numero_compteur} ?`)) return;

    try {
      await compteursEauService.delete(decompte.immeuble_id, compteur.id);
      loadCompteurs();
    } catch (error) {
      console.error('Error deleting compteur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const compteurPrincipal = compteurs.find(c => c.type_compteur === 'principal');
  const compteursDivisionnaires = compteurs.filter(c => c.type_compteur === 'divisionnaire');
  const hasCompteurPrincipal = !!compteurPrincipal;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!decompte || !decompte.immeuble_id) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <Droplets className="h-12 w-12 text-blue-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium mb-2">Configuration de l'eau</p>
        <p className="text-sm text-gray-600">
          Complétez d'abord l'onglet "Infos".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration générale */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-4">Configuration générale</h3>
        
        {compteurs.length > 0 && !canChangeModeComptage && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ⚠️ Le mode de comptage ne peut plus être modifié car des compteurs existent déjà.
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode de comptage *
            </label>
            <select
              value={modeComptageEau}
              onChange={handleModeComptageChange}
              disabled={disabled || !canChangeModeComptage}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="collectif">Compteur collectif (1 pour tout l'immeuble)</option>
              <option value="divisionnaire">Système divisionnaire (1 principal + sous-compteurs)</option>
              <option value="individuel">Compteurs individuels (1 par logement)</option>
            </select>
          </div>
          
          {modeComptageEau === 'divisionnaire' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro du compteur principal
              </label>
              <NumeroCompteurInput
                value={numeroCompteurPrincipal}
                onChange={handleNumeroCompteurChange}
                disabled={disabled}
                maxLength={15}
              />
              <p className="text-xs text-gray-500 mt-2">
                Saisissez le numéro comme indiqué sur votre facture d'eau
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-600" />
            Compteurs enregistrés
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {compteurs.length} compteur{compteurs.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {!disabled && !showCreateForm && (
          <button
            onClick={() => handleStartCreate(hasCompteurPrincipal ? 'divisionnaire' : 'principal')}
            className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un compteur
          </button>
        )}
      </div>

      {/* Formulaire création/édition inline */}
      {showCreateForm && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Modifier le compteur' : 'Nouveau compteur'}
            </h4>
            <button
              onClick={handleCancelForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de compteur *
              </label>
              <select
                value={formData.type_compteur}
                onChange={(e) => setFormData({...formData, type_compteur: e.target.value})}
                disabled={hasCompteurPrincipal && formData.type_compteur === 'principal'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="principal" disabled={hasCompteurPrincipal && !editingId}>
                  Principal {hasCompteurPrincipal && !editingId ? '(existe déjà)' : ''}
                </option>
                <option value="divisionnaire">Divisionnaire</option>
                <option value="collectif">Collectif</option>
                <option value="individuel">Individuel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emplacement
              </label>
              <input
                type="text"
                value={formData.emplacement}
                onChange={(e) => setFormData({...formData, emplacement: e.target.value})}
                placeholder="Ex: Appt 101, Sous-sol..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de compteur *
            </label>
            <input
              type="text"
              value={formData.numero_compteur}
              onChange={(e) => setFormData({...formData, numero_compteur: e.target.value})}
              placeholder="Ex: C00123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.actif}
                onChange={(e) => setFormData({...formData, actif: e.target.checked})}
                className="rounded border-gray-300"
              />
              Compteur actif
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleCancelForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCompteur}
                disabled={!formData.numero_compteur}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4 mr-2" />
                {editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste compteurs */}
      {modeComptageEau === 'divisionnaire' && (
        <div>
          {compteurPrincipal ? (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-400 rounded-lg p-5 mb-4 shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Droplets className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg text-gray-900">
                        {compteurPrincipal.numero_compteur}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-indigo-600 text-white rounded-full font-semibold">
                        🔵 PRINCIPAL
                      </span>
                    </div>
                    <p className="text-sm text-indigo-900 font-medium">
                      Compteur général de l'immeuble
                    </p>
                    {compteurPrincipal.emplacement && (
                      <p className="text-sm text-gray-700 mt-1">
                        📍 {compteurPrincipal.emplacement}
                      </p>
                    )}
                  </div>
                </div>
                
                {!disabled && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(compteurPrincipal)}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(compteurPrincipal)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">
                    Aucun compteur principal
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Créez d'abord un compteur de type "Principal".
                  </p>
                </div>
              </div>
            </div>
          )}

          {compteursDivisionnaires.length > 0 && (
            <div className="ml-8 space-y-3 relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-200"></div>
              
              {compteursDivisionnaires.map((compteur) => (
                <div
                  key={compteur.id}
                  className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="absolute left-0 top-1/2 -translate-x-8 w-8 h-0.5 bg-indigo-200"></div>
                  <div className="absolute left-0 top-1/2 -translate-x-8 w-2 h-2 bg-cyan-500 rounded-full -translate-y-1/2"></div>
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Droplets className="h-5 w-5 text-cyan-600 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {compteur.numero_compteur}
                        </h5>
                        {compteur.emplacement && (
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {compteur.emplacement}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!disabled && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(compteur)}
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(compteur)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modeComptageEau !== 'divisionnaire' && (
        <div className="space-y-2">
          {compteurs.map((compteur) => (
            <div
              key={compteur.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Droplets className="h-5 w-5 text-cyan-500 mt-1" />
                  <div>
                    <h5 className="font-medium text-gray-900">
                      {compteur.numero_compteur}
                    </h5>
                    {compteur.emplacement && (
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {compteur.emplacement}
                      </p>
                    )}
                  </div>
                </div>
                
                {!disabled && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(compteur)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(compteur)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guide en dessous */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-8">
        <h3 className="font-medium text-gray-900 mb-4">
          ℹ️ Guide des types de compteurs
        </h3>
        <CompteurTypeGuide 
          selectedType={modeComptageEau === 'divisionnaire' ? 'divisionnaire' : modeComptageEau}
          onTypeChange={() => {}}
          existingPrincipal={hasCompteurPrincipal}
        />
      </div>
    </div>
  );
}
