import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Building2,
  Tag,
  X,
  Edit2,
  Droplets,
  Zap,
  Flame,
  Building,
  Shield,
  Wrench,
  Landmark,
  Package
} from 'lucide-react';
import { fournisseursService, immeublesService } from '../../services/api';

// Icônes par catégorie
const CATEGORY_ICONS = {
  eau: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Eau' },
  electricite: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Électricité' },
  gaz: { icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Gaz' },
  chauffage: { icon: Flame, color: 'text-red-600', bg: 'bg-red-100', label: 'Chauffage' },
  ascenseur: { icon: Building, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Ascenseur' },
  nettoyage: { icon: Wrench, color: 'text-green-600', bg: 'bg-green-100', label: 'Nettoyage' },
  assurance: { icon: Shield, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Assurance' },
  syndic: { icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Syndic' },
  entretien: { icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Entretien' },
  reparations: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Réparations' },
  frais_bancaires: { icon: Landmark, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Frais bancaires' },
  taxes: { icon: Landmark, color: 'text-rose-600', bg: 'bg-rose-100', label: 'Taxes' },
  autre: { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Autre' }
};

const CATEGORIES = [
  { value: 'eau', label: 'Eau', emoji: '💧' },
  { value: 'electricite', label: 'Électricité', emoji: '⚡' },
  { value: 'gaz', label: 'Gaz', emoji: '🔥' },
  { value: 'chauffage', label: 'Chauffage', emoji: '🔥' },
  { value: 'ascenseur', label: 'Ascenseur', emoji: '🛗' },
  { value: 'nettoyage', label: 'Nettoyage', emoji: '🧹' },
  { value: 'assurance', label: 'Assurance', emoji: '🛡️' },
  { value: 'syndic', label: 'Syndic', emoji: '🏢' },
  { value: 'entretien', label: 'Entretien', emoji: '🔧' },
  { value: 'reparations', label: 'Réparations', emoji: '🛠️' },
  { value: 'frais_bancaires', label: 'Frais bancaires', emoji: '🏦' },
  { value: 'taxes', label: 'Taxes', emoji: '📋' },
  { value: 'autre', label: 'Autre', emoji: '📦' }
];

function FournisseursPage() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [immeuble, setImmeuble] = useState(null);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'autre',
    email: '',
    telephone: '',
    iban: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  // Charger les données
  useEffect(() => {
    loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [immeubleRes, fournisseursRes] = await Promise.all([
        immeublesService.getOne(immeubleId),
        fournisseursService.getAll(immeubleId)
      ]);
      
      setImmeuble(immeubleRes.data.immeuble);
      setFournisseurs(fournisseursRes.data.fournisseurs || []);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le formulaire pour ajout
  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      nom: '',
      type: 'autre',
      email: '',
      telephone: '',
      iban: '',
      tags: []
    });
    setShowForm(true);
  };

  // Ouvrir le formulaire pour édition
  const handleEdit = (fournisseur) => {
    setEditingId(fournisseur.id);
    setFormData({
      nom: fournisseur.nom || '',
      type: fournisseur.type || 'autre',
      email: fournisseur.email || '',
      telephone: fournisseur.telephone || '',
      iban: fournisseur.iban || '',
      tags: fournisseur.tags || []
    });
    setShowForm(true);
  };

  // Ajouter un tag
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toUpperCase())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim().toUpperCase()]
      });
      setNewTag('');
    }
  };

  // Supprimer un tag
  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Sauvegarder
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Ajouter automatiquement le nom comme tag s'il n'existe pas
      const tagsWithNom = formData.tags.includes(formData.nom.toUpperCase()) 
        ? formData.tags 
        : [formData.nom.toUpperCase(), ...formData.tags];
      
      const dataToSend = {
        nom: formData.nom,
        type: formData.type,
        email: formData.email || null,
        telephone: formData.telephone || null,
        iban: formData.iban || null,
        tags: tagsWithNom
      };
      
      if (editingId) {
        await fournisseursService.update(immeubleId, editingId, dataToSend);
        setSuccess('Fournisseur modifié avec succès');
      } else {
        await fournisseursService.create(immeubleId, dataToSend);
        setSuccess('Fournisseur ajouté avec succès');
      }
      
      setShowForm(false);
      loadData();
      
    } catch (err) {
      console.error('Error saving fournisseur:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer
  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    
    try {
      await fournisseursService.delete(immeubleId, id);
      setSuccess('Fournisseur supprimé');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Render catégorie badge
  const renderCategoryBadge = (type) => {
    const cat = CATEGORY_ICONS[type] || CATEGORY_ICONS.autre;
    const Icon = cat.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cat.bg} ${cat.color}`}>
        <Icon className="w-3 h-3" />
        {cat.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Fournisseurs
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {immeuble?.nom}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ajouter Fournisseur
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info reconnaissance */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Tag className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Reconnaissance automatique</h3>
            <p className="text-sm text-blue-700 mt-1">
              Les tags permettent de reconnaître automatiquement les fournisseurs lors de l'import d'extraits bancaires. 
              Ajoutez des variantes du nom (ex: "VIVAQUA", "VIVAQUA SA", "VIVAQUA BRUXELLES").
            </p>
          </div>
        </div>
      </div>

      {/* Liste des fournisseurs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {fournisseurs.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun fournisseur configuré</p>
            <button
              onClick={handleAdd}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              + Ajouter un fournisseur
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {fournisseurs.map((f) => (
              <div key={f.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      {(() => {
                        const cat = CATEGORY_ICONS[f.type] || CATEGORY_ICONS.autre;
                        const Icon = cat.icon;
                        return <Icon className={`w-6 h-6 ${cat.color}`} />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{f.nom}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {renderCategoryBadge(f.type)}
                        {f.email && (
                          <span className="text-sm text-gray-500">{f.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(f)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                {f.tags && f.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {f.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du fournisseur *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: VIVAQUA"
                    required
                  />
                </div>
                
                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Email & Téléphone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="02/..."
                    />
                  </div>
                </div>
                
                {/* IBAN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => setFormData({...formData, iban: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="BE..."
                  />
                </div>
                
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags de reconnaissance
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Mots-clés pour identifier ce fournisseur dans les extraits bancaires
                  </p>
                  
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ajouter un tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {editingId ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FournisseursPage;