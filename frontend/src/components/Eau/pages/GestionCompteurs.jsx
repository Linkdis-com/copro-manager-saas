// =====================================================
// 🔢 PAGE GESTION COMPTEURS
// frontend/src/components/Eau/pages/GestionCompteurs.jsx
// =====================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Droplets, AlertCircle, Save, X } from 'lucide-react';
import DivisonnaireSchema from '../schemas/DivisonnaireSchema';

export default function GestionCompteurs() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [compteurs, setCompteurs] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    type_compteur: 'principal',
    numero_compteur: '',
    emplacement: '',
    proprietaire_id: '',
    actif: true
  });

  useEffect(() => {
    loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Config
      const configRes = await fetch(`/api/v1/eau/configuration/${immeubleId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const configData = await configRes.json();
      setConfig(configData.config);
      
      // Compteurs
      const compteursRes = await fetch(`/api/v1/immeubles/${immeubleId}/compteurs-eau`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const compteursData = await compteursRes.json();
      setCompteurs(compteursData.compteurs || []);
      
      // Propriétaires
      const propRes = await fetch(`/api/v1/immeubles/${immeubleId}/proprietaires`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const propData = await propRes.json();
      setProprietaires(propData.proprietaires || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      // Validation
      if (!formData.numero_compteur || !formData.type_compteur) {
        setError('Numéro et type de compteur requis');
        return;
      }
      
      if (formData.type_compteur === 'divisionnaire' && !formData.proprietaire_id) {
        setError('Propriétaire requis pour un compteur divisionnaire');
        return;
      }

      const url = editingId 
        ? `/api/v1/immeubles/${immeubleId}/compteurs-eau/${editingId}`
        : `/api/v1/immeubles/${immeubleId}/compteurs-eau`;
      
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      await loadData();
      handleCancelForm();
      
    } catch (error) {
      console.error('Error saving compteur:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (compteur) => {
    if (!confirm(`Supprimer le compteur ${compteur.numero_compteur} ?`)) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/v1/immeubles/${immeubleId}/compteurs-eau/${compteur.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      await loadData();
      
    } catch (error) {
      console.error('Error deleting compteur:', error);
      setError(error.message);
    }
  };

  const handleEdit = (compteur) => {
    setFormData({
      type_compteur: compteur.type_compteur,
      numero_compteur: compteur.numero_compteur,
      emplacement: compteur.emplacement || '',
      proprietaire_id: compteur.proprietaire_id || '',
      actif: compteur.actif
    });
    setEditingId(compteur.id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setFormData({
      type_compteur: 'principal',
      numero_compteur: '',
      emplacement: '',
      proprietaire_id: '',
      actif: true
    });
  };

  const handleAddNew = () => {
    const hasPrincipal = compteurs.some(c => c.type_compteur === 'principal');
    setFormData({
      type_compteur: hasPrincipal ? 'divisionnaire' : 'principal',
      numero_compteur: '',
      emplacement: '',
      proprietaire_id: '',
      actif: true
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            ⚠️ Vous devez d'abord configurer le système eau
          </p>
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}/eau/configuration`)}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Aller à la configuration
          </button>
        </div>
      </div>
    );
  }

  const compteurPrincipal = compteurs.find(c => c.type_compteur === 'principal');
  const compteursDivisionnaires = compteurs.filter(c => c.type_compteur === 'divisionnaire');
  const canAddDivisionnaire = compteursDivisionnaires.length < proprietaires.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/immeubles/${immeubleId}/eau`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-600" />
            Gestion des Compteurs
          </h1>
          <p className="text-gray-600 mt-1">
            {config.type_comptage} • {compteurs.length} compteur{compteurs.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Erreurs */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste compteurs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Actions */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Compteurs configurés</h2>
              <p className="text-sm text-gray-600">
                {config.type_comptage === 'divisionnaire' && 
                  `Max ${proprietaires.length} compteurs divisionnaires`}
              </p>
            </div>
            
            {!showForm && (
              <button
                onClick={handleAddNew}
                disabled={config.type_comptage === 'divisionnaire' && compteurPrincipal && !canAddDivisionnaire}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            )}
          </div>

          {/* Formulaire */}
          {showForm && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-lg">
                  {editingId ? 'Modifier' : 'Nouveau'} compteur
                </h3>
                <button onClick={handleCancelForm} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={formData.type_compteur}
                    onChange={(e) => setFormData({...formData, type_compteur: e.target.value})}
                    disabled={compteurPrincipal && !editingId}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="principal">💧 Principal</option>
                    <option value="divisionnaire">🔢 Divisionnaire</option>
                    {config.type_comptage === 'collectif' && (
                      <option value="collectif">🏢 Collectif</option>
                    )}
                  </select>
                </div>

                {/* Numéro */}
                <div>
                  <label className="block text-sm font-medium mb-1">Numéro compteur *</label>
                  <input
                    type="text"
                    value={formData.numero_compteur}
                    onChange={(e) => setFormData({...formData, numero_compteur: e.target.value})}
                    placeholder="C00001"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Propriétaire (si divisionnaire) */}
                {formData.type_compteur === 'divisionnaire' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Propriétaire *</label>
                    <select
                      value={formData.proprietaire_id}
                      onChange={(e) => setFormData({...formData, proprietaire_id: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un propriétaire</option>
                      {proprietaires.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.prenom} {p.nom} {p.numero_appartement && `(Appt ${p.numero_appartement})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Emplacement */}
                <div>
                  <label className="block text-sm font-medium mb-1">Emplacement</label>
                  <input
                    type="text"
                    value={formData.emplacement}
                    onChange={(e) => setFormData({...formData, emplacement: e.target.value})}
                    placeholder="Cave, Garage, Appt 101..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleCancelForm}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.numero_compteur}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Save className="h-4 w-4" />
                    {editingId ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Liste */}
          <div className="space-y-3">
            {/* Principal */}
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
                      disabled={compteursDivisionnaires.length > 0}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={compteursDivisionnaires.length > 0 ? 'Supprimez d\'abord les divisionnaires' : ''}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Divisionnaires */}
            {compteursDivisionnaires.map(c => {
              const prop = proprietaires.find(p => p.id === c.proprietaire_id);
              return (
                <div key={c.id} className="border rounded-lg p-4 hover:shadow-md transition bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Droplets className="h-5 w-5 text-cyan-600 mt-1 flex-shrink-0" />
                      <div>
                        <h5 className="font-medium mb-1">{c.numero_compteur}</h5>
                        {prop && (
                          <p className="text-sm text-gray-600">
                            👤 {prop.prenom} {prop.nom}
                            {prop.numero_appartement && ` • Appt ${prop.numero_appartement}`}
                          </p>
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
              <div className="text-center py-12 text-gray-500">
                <Droplets className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Aucun compteur configuré</p>
                <p className="text-sm">Cliquez sur "Ajouter" pour commencer</p>
              </div>
            )}
          </div>

          {/* Bouton continuer */}
          {compteurs.length > 0 && (
            <button
              onClick={() => navigate(`/immeubles/${immeubleId}/eau/releves`)}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Continuer vers la saisie des relevés →
            </button>
          )}
        </div>

        {/* Schéma */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-6 sticky top-6">
            <h3 className="font-bold mb-4">Schéma du système</h3>
            
            {config.type_comptage === 'divisionnaire' && <DivisonnaireSchema />}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                💡 Configuration actuelle
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Type: {config.type_comptage}</li>
                <li>• Région: {config.region}</li>
                <li>• {compteurs.length} compteur{compteurs.length > 1 ? 's' : ''} configuré{compteurs.length > 1 ? 's' : ''}</li>
                {config.type_comptage === 'divisionnaire' && (
                  <li>• Max: {proprietaires.length} divisionnaires</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
