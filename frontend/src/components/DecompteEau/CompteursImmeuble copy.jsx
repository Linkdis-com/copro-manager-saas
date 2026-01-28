import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { immeublesService, compteursEauService, proprietairesService } from '../../services/api';
import { ArrowLeft, Plus, Droplets, Edit, Trash2, X, Check, Settings } from 'lucide-react';
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
      
      const immeubleRes = await immeublesService.getOne(immeubleId);
      const immeubleData = immeubleRes.data.immeuble;
      setImmeuble(immeubleData);
      setModeComptageEau(immeubleData.mode_comptage_eau || 'divisionnaire');
      setNumeroCompteurPrincipal(immeubleData.numero_compteur_principal || '');
      
      const compteursRes = await compteursEauService.getAll(immeubleId);
      setCompteurs(compteursRes.compteurs || []);
      
      const propRes = await proprietairesService.getByImmeuble(immeubleId);
      setProprietaires(propRes.data.proprietaires || []);
    } catch (error) {
      console.error('Error:', error);
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
      await immeublesService.update(immeubleId, { mode_comptage_eau: e.target.value });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleNumeroCompteurChange = async (value) => {
    setNumeroCompteurPrincipal(value);
    try {
      await immeublesService.update(immeubleId, { numero_compteur_principal: value });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSaveCompteur = async () => {
    try {
      const payload = { ...formData, immeuble_id: immeubleId };
      if (editingId) {
        await compteursEauService.update(immeubleId, editingId, payload);
      } else {
        await compteursEauService.create(immeubleId, payload);
      }
      loadData();
      setShowCreateForm(false);
      setEditingId(null);
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleDelete = async (compteur) => {
    if (!confirm(`Supprimer ${compteur.numero_compteur} ?`)) return;
    try {
      await compteursEauService.delete(immeubleId, compteur.id);
      loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const compteurPrincipal = compteurs.find(c => c.type_compteur === 'principal');
  const compteursDivisionnaires = compteurs.filter(c => c.type_compteur === 'divisionnaire');
  const canAddMore = compteursDivisionnaires.length < proprietaires.length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/immeubles/${immeubleId}/decomptes-eau`)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7 text-blue-600" />
            Configuration des compteurs
          </h1>
          <p className="text-gray-600">{immeuble?.nom} • {compteurs.length} compteur{compteurs.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Configuration générale</h2>
        {compteurs.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm text-amber-800">⚠️ Mode bloqué car compteurs existent</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mode de comptage *</label>
            <select value={modeComptageEau} onChange={handleModeComptageChange} disabled={!canChangeModeComptage} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
              <option value="collectif">Compteur collectif</option>
              <option value="divisionnaire">Système divisionnaire</option>
              <option value="individuel">Compteurs individuels</option>
            </select>
          </div>
          {modeComptageEau === 'divisionnaire' && (
            <div>
              <label className="block text-sm font-medium mb-2">Numéro compteur principal</label>
              <NumeroCompteurInput value={numeroCompteurPrincipal} onChange={handleNumeroCompteurChange} maxLength={15} />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-cyan-600" />
            Compteurs enregistrés
          </h2>
          {!showCreateForm && (
            <button onClick={() => { setFormData({ type_compteur: compteurPrincipal ? 'divisionnaire' : 'principal', numero_compteur: '', emplacement: '', actif: true, proprietaire_id: '' }); setShowCreateForm(true); }} disabled={!canAddMore && !!compteurPrincipal} className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </button>
          )}
        </div>

        {!canAddMore && compteursDivisionnaires.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">ℹ️ Limite: {proprietaires.length} propriétaires = {proprietaires.length} compteurs max</p>
          </div>
        )}

        {showCreateForm && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-4">
            <div className="flex justify-between mb-4">
              <h3 className="font-medium">{editingId ? 'Modifier' : 'Nouveau'} compteur</h3>
              <button onClick={() => { setShowCreateForm(false); setEditingId(null); }}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select value={formData.type_compteur} onChange={(e) => setFormData({...formData, type_compteur: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="principal">Principal</option>
                  <option value="divisionnaire">Divisionnaire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Emplacement</label>
                <input type="text" value={formData.emplacement} onChange={(e) => setFormData({...formData, emplacement: e.target.value})} placeholder="Ex: Appt 101" className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Numéro *</label>
              <input type="text" value={formData.numero_compteur} onChange={(e) => setFormData({...formData, numero_compteur: e.target.value})} placeholder="C00123" className="w-full px-3 py-2 border rounded-md" />
            </div>
            {formData.type_compteur === 'divisionnaire' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Propriétaire *</label>
                <select value={formData.proprietaire_id} onChange={(e) => setFormData({...formData, proprietaire_id: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="">Sélectionner</option>
                  {proprietaires.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCreateForm(false); setEditingId(null); }} className="px-4 py-2 border rounded-md">Annuler</button>
              <button onClick={handleSaveCompteur} disabled={!formData.numero_compteur} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">
                <Check className="h-4 w-4 mr-2" />
                {editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {compteurPrincipal && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-400 rounded-lg p-5">
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Droplets className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{compteurPrincipal.numero_compteur}</h4>
                      <span className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-full font-semibold">PRINCIPAL</span>
                    </div>
                    {compteurPrincipal.emplacement && <p className="text-sm">📍 {compteurPrincipal.emplacement}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData(compteurPrincipal); setEditingId(compteurPrincipal.id); setShowCreateForm(true); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(compteurPrincipal)} className="p-2 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}
          {compteursDivisionnaires.map(c => {
            const prop = proprietaires.find(p => p.id === c.proprietaire_id);
            return (
              <div key={c.id} className="border rounded-lg p-4 hover:shadow-md">
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <Droplets className="h-5 w-5 text-cyan-600 mt-1" />
                    <div>
                      <h5 className="font-medium">{c.numero_compteur}</h5>
                      {prop && <p className="text-sm text-gray-600">👤 {prop.prenom} {prop.nom}</p>}
                      {c.emplacement && <p className="text-xs text-gray-500">📍 {c.emplacement}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setFormData(c); setEditingId(c.id); setShowCreateForm(true); }} className="p-2 hover:text-cyan-600 hover:bg-cyan-50 rounded"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c)} className="p-2 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
