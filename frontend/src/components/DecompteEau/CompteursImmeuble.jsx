// =====================================================
// 🚀 SOLUTION NUCLÉAIRE - PAGE COMPTEURS
// Version complète et testée
// =====================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { immeublesService, compteursEauService, proprietairesService } from '../../services/api';
import { ArrowLeft, Plus, Droplets, Edit, Trash2, X, Check, Settings, AlertCircle } from 'lucide-react';
import NumeroCompteurInput from './NumeroCompteurInput';

export default function CompteursImmeuble() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [immeuble, setImmeuble] = useState(null);
  const [compteurs, setCompteurs] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  
  const [modeComptageEau, setModeComptageEau] = useState('divisionnaire');
  const [numeroCompteurPrincipal, setNumeroCompteurPrincipal] = useState('');
  
  const [formData, setFormData] = useState({
    type_compteur: 'divisionnaire',
    numero_compteur: '',
    emplacement: '',
    actif: true,
    proprietaire_id: ''
  });

  useEffect(() => {
    if (immeubleId) loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger immeuble
      const immeubleRes = await immeublesService.getOne(immeubleId);
      const immeubleData = immeubleRes.data.immeuble;
      setImmeuble(immeubleData);
      setModeComptageEau(immeubleData.mode_comptage_eau || 'divisionnaire');
      setNumeroCompteurPrincipal(immeubleData.numero_compteur_principal || '');
      
      // Charger compteurs
      const compteursRes = await compteursEauService.getAll(immeubleId);
      setCompteurs(compteursRes.data?.compteurs || []);
      
      // Charger propriétaires
      const propRes = await proprietairesService.getByImmeuble(immeubleId);
      setProprietaires(propRes.data.proprietaires || []);
    } catch (error) {
      console.error('❌ Load error:', error);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const canChangeModeComptage = compteurs.length === 0;

  const handleModeComptageChange = async (e) => {
    if (!canChangeModeComptage) {
      alert('Impossible de changer le mode : des compteurs existent déjà');
      return;
    }
    
    setModeComptageEau(e.target.value);
    
    try {
      await immeublesService.update(immeubleId, { 
        mode_comptage_eau: e.target.value 
      });
    } catch (error) {
      console.error('❌ Update error:', error);
    }
  };

  const handleNumeroCompteurChange = async (value) => {
    setNumeroCompteurPrincipal(value);
    
    try {
      await immeublesService.update(immeubleId, { 
        numero_compteur_principal: value 
      });
    } catch (error) {
      console.error('❌ Update error:', error);
    }
  };

  const handleSaveCompteur = async () => {
    try {
      setError(null);
      
      const payload = {
        ...formData,
        immeuble_id: immeubleId
      };

      if (editingId) {
        await compteursEauService.update(immeubleId, editingId, payload);
      } else {
        await compteursEauService.create(immeubleId, payload);
      }
      
      await loadData();
      setShowCreateForm(false);
      setEditingId(null);
      setFormData({
        type_compteur: 'divisionnaire',
        numero_compteur: '',
        emplacement: '',
        actif: true,
        proprietaire_id: ''
      });
    } catch (error) {
      console.error('❌ Save error:', error);
      setError(error.response?.data?.error || error.message);
    }
  };

  const handleDelete = async (compteur) => {
    if (!confirm(`Supprimer le compteur ${compteur.numero_compteur} ?`)) return;
    
    try {
      setError(null);
      await compteursEauService.delete(immeubleId, compteur.id);
      await loadData();
    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleEdit = (compteur) => {
    setFormData({
      type_compteur: compteur.type_compteur,
      numero_compteur: compteur.numero_compteur,
      emplacement: compteur.emplacement || '',
      actif: compteur.actif,
      proprietaire_id: compteur.proprietaire_id || ''
    });
    setEditingId(compteur.id);
    setShowCreateForm(true);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setError(null);
    setFormData({
      type_compteur: 'divisionnaire',
      numero_compteur: '',
      emplacement: '',
      actif: true,
      proprietaire_id: ''
    });
  };

  const compteurPrincipal = compteurs.find(c => c.type_compteur === 'principal');
  const compteursDivisionnaires = compteurs.filter(c => c.type_compteur === 'divisionnaire');
  const canAddMore = compteursDivisionnaires.length < proprietaires.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/immeubles/${immeubleId}/decomptes-eau`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7 text-blue-600" />
            Configuration des compteurs
          </h1>
          <p className="text-gray-600">
            {immeuble?.nom} • {compteurs.length} compteur{compteurs.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Configuration générale */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Configuration générale</h2>
        
        {compteurs.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm text-amber-800">
              ⚠️ Mode bloqué car des compteurs existent déjà
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Mode de comptage *
            </label>
            <select
              value={modeComptageEau}
              onChange={handleModeComptageChange}
              disabled={!canChangeModeComptage}
              className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="collectif">Compteur collectif</option>
              <option value="divisionnaire">Système divisionnaire</option>
              <option value="individuel">Compteurs individuels</option>
            </select>
          </div>
          
          {modeComptageEau === 'divisionnaire' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Numéro compteur principal
              </label>
              <NumeroCompteurInput
                value={numeroCompteurPrincipal}
                onChange={handleNumeroCompteurChange}
                maxLength={15}
              />
            </div>
          )}
        </div>
      </div>

      {/* Liste des compteurs */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-600" />
            Compteurs enregistrés
          </h2>
          
          {!showCreateForm && (
            <button
              onClick={() => {
                setFormData({
                  type_compteur: compteurPrincipal ? 'divisionnaire' : 'principal',
                  numero_compteur: '',
                  emplacement: '',
                  actif: true,
                  proprietaire_id: ''
                });
                setShowCreateForm(true);
              }}
              disabled={!canAddMore && !!compteurPrincipal}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </button>
          )}
        </div>

        {!canAddMore && compteursDivisionnaires.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Limite atteinte : {proprietaires.length} propriétaires = {proprietaires.length} compteurs max
            </p>
          </div>
        )}

        {/* Formulaire création/édition */}
        {showCreateForm && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">
                {editingId ? 'Modifier' : 'Nouveau'} compteur
              </h3>
              <button onClick={handleCancelForm} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.type_compteur}
                  onChange={(e) => setFormData({...formData, type_compteur: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="principal">Principal</option>
                  <option value="divisionnaire">Divisionnaire</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Emplacement</label>
                <input
                  type="text"
                  value={formData.emplacement}
                  onChange={(e) => setFormData({...formData, emplacement: e.target.value})}
                  placeholder="Ex: Cave, Garage"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Numéro *</label>
              <input
                type="text"
                value={formData.numero_compteur}
                onChange={(e) => setFormData({...formData, numero_compteur: e.target.value})}
                placeholder="C00123"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.type_compteur === 'divisionnaire' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Propriétaire *</label>
                <select
                  value={formData.proprietaire_id}
                  onChange={(e) => setFormData({...formData, proprietaire_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un propriétaire</option>
                  {proprietaires.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.prenom} {p.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelForm}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCompteur}
                disabled={!formData.numero_compteur}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Check className="h-4 w-4 mr-2" />
                {editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        )}

        {/* Liste des compteurs */}
        <div className="space-y-3">
          {/* Compteur principal */}
          {compteurPrincipal && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-400 rounded-lg p-5">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Droplets className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg">{compteurPrincipal.numero_compteur}</h4>
                      <span className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-full font-semibold">
                        PRINCIPAL
                      </span>
                    </div>
                    {compteurPrincipal.emplacement && (
                      <p className="text-sm text-gray-600">📍 {compteurPrincipal.emplacement}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(compteurPrincipal)}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded transition"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(compteurPrincipal)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compteurs divisionnaires */}
          {compteursDivisionnaires.map(c => {
            const prop = proprietaires.find(p => p.id === c.proprietaire_id);
            return (
              <div key={c.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <Droplets className="h-5 w-5 text-cyan-600 mt-1 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium mb-1">{c.numero_compteur}</h5>
                      {prop && (
                        <p className="text-sm text-gray-600">👤 {prop.prenom} {prop.nom}</p>
                      )}
                      {c.emplacement && (
                        <p className="text-xs text-gray-500">📍 {c.emplacement}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-2 text-cyan-600 hover:bg-cyan-50 rounded transition"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {compteurs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Droplets className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Aucun compteur enregistré</p>
              <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
