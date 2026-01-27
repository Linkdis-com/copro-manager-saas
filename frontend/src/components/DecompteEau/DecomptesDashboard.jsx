import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Calendar, Building2, FileText, Search, Filter, 
  ChevronDown, ChevronUp, Grid3x3, List, Droplets,
  AlertCircle, RefreshCw, CheckCircle, Eye
} from 'lucide-react';
import { decomptesEauService, immeublesService } from '../../services/api';

const IMMEUBLE_COLORS = [
  { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100', btn: 'bg-cyan-600 hover:bg-cyan-700' },
  { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100', btn: 'bg-purple-600 hover:bg-purple-700' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100', btn: 'bg-amber-600 hover:bg-amber-700' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100', btn: 'bg-rose-600 hover:bg-rose-700' },
  { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100', btn: 'bg-blue-600 hover:bg-blue-700' },
];

function DecomptesDashboard() {
  const [decomptes, setDecomptes] = useState([]);
  const [immeubles, setImmeubles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [viewMode, setViewMode] = useState('grid');
  const [expandedImmeubles, setExpandedImmeubles] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [decomptesRes, immeublesRes] = await Promise.all([
        decomptesEauService.getAll(),
        immeublesService.getAll()
      ]);
      setDecomptes(decomptesRes.data.decomptes || []);
      setImmeubles(immeublesRes.data.immeubles || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const decomptesGroupes = useMemo(() => {
    const groupes = {};
    immeubles.forEach((immeuble, index) => {
      const decomptesDeCetImmeuble = decomptes.filter(d => d.immeuble_id === immeuble.id);
      const anneesSet = new Set();
      decomptesDeCetImmeuble.forEach(d => anneesSet.add(d.annee));
      const annees = Array.from(anneesSet).sort((a, b) => b - a);
      const parAnnee = {};
      annees.forEach(annee => {
        parAnnee[annee] = decomptesDeCetImmeuble.filter(d => d.annee === annee);
      });
      groupes[immeuble.id] = {
        immeuble,
        decomptes: decomptesDeCetImmeuble,
        annees,
        anneesExistantes: annees,
        parAnnee,
        color: IMMEUBLE_COLORS[index % IMMEUBLE_COLORS.length]
      };
    });
    return groupes;
  }, [decomptes, immeubles]);

  const decomptesFiltrésGlobal = useMemo(() => {
    return decomptes.filter(d => {
      const matchSearch = searchTerm === '' || 
        d.immeuble_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.annee?.toString().includes(searchTerm);
      const matchStatut = filterStatut === 'tous' || d.statut === filterStatut;
      return matchSearch && matchStatut;
    });
  }, [decomptes, searchTerm, filterStatut]);

  const stats = useMemo(() => {
    const filtered = decomptesFiltrésGlobal;
    return {
      total: filtered.length,
      brouillon: filtered.filter(d => d.statut === 'brouillon').length,
      calcule: filtered.filter(d => d.statut === 'calcule').length,
      valide: filtered.filter(d => d.statut === 'valide').length
    };
  }, [decomptesFiltrésGlobal]);

  const getStatutBadge = (statut) => {
    const badges = {
      'brouillon': { bg: 'bg-gray-100', text: 'text-gray-800' },
      'calcule': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'valide': { bg: 'bg-green-100', text: 'text-green-800' },
    };
    return badges[statut] || badges['brouillon'];
  };

  const toggleImmeuble = (immeubleId) => {
    setExpandedImmeubles(prev => ({ ...prev, [immeubleId]: !prev[immeubleId] }));
  };

  const handleCreateDecompte = (groupe) => {
    navigate('/decomptes/nouveau', { 
      state: { 
        immeubleId: groupe.immeuble.id,
        immeubleNom: groupe.immeuble.nom,
        anneesExistantes: groupe.anneesExistantes
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={loadData} className="mt-2 text-red-600 hover:text-red-800 underline text-sm">
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Droplets className="h-7 w-7 text-primary-600" />
          Décomptes d'eau
        </h1>
        <p className="text-gray-600 mt-1">Gérez tous vos décomptes d'eau par immeuble</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par immeuble ou année..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="tous">Tous les statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="calcule">Calculé</option>
              <option value="valide">Validé</option>
            </select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {Object.keys(decomptesGroupes).length} immeuble(s) • {stats.total} décompte(s)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Brouillon</p>
              <p className="text-2xl font-bold">{stats.brouillon}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Calculé</p>
              <p className="text-2xl font-bold">{stats.calcule}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Validé</p>
              <p className="text-2xl font-bold">{stats.valide}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {immeubles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun immeuble</h3>
          <p className="text-gray-500 mb-4">Commencez par créer un immeuble</p>
          <button
            onClick={() => navigate('/immeubles')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Créer un immeuble
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(decomptesGroupes).map((groupe) => {
            const isExpanded = expandedImmeubles[groupe.immeuble.id];
            return (
              <div key={groupe.immeuble.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${groupe.color.border}`}>
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                      onClick={() => toggleImmeuble(groupe.immeuble.id)}
                      className="flex-1 flex items-center gap-4 hover:opacity-80 text-left"
                    >
                      <div className={`w-12 h-12 ${groupe.color.bg} rounded-lg flex items-center justify-center`}>
                        <Building2 className={`h-6 w-6 ${groupe.color.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{groupe.immeuble.nom}</h3>
                        <p className="text-sm text-gray-600 truncate">
                          {groupe.immeuble.adresse} • {groupe.decomptes.length} décompte(s)
                        </p>
                      </div>
                      <div className="hidden sm:flex gap-2">
                        {groupe.annees.slice(0, 3).map(annee => (
                          <span key={annee} className={`px-3 py-1 ${groupe.color.badge} ${groupe.color.text} rounded-full text-sm font-medium`}>
                            {annee}
                          </span>
                        ))}
                        {groupe.annees.length > 3 && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            +{groupe.annees.length - 3}
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleCreateDecompte(groupe)}
                      className={`inline-flex items-center gap-2 px-4 py-2 ${groupe.color.btn} text-white rounded-lg shadow-sm`}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nouveau décompte</span>
                      <span className="sm:hidden">Nouveau</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 bg-gray-50">
                    {groupe.decomptes.length === 0 ? (
                      <div className="text-center py-8">
                        <Droplets className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">Aucun décompte pour cet immeuble</p>
                        <button
                          onClick={() => handleCreateDecompte(groupe)}
                          className={`inline-flex items-center gap-2 px-4 py-2 ${groupe.color.btn} text-white rounded-lg`}
                        >
                          <Plus className="h-4 w-4" />
                          Créer le premier décompte
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupe.annees.map(annee => {
                          const decomptesAnnee = groupe.parAnnee[annee];
                          return (
                            <div key={annee} className="bg-white rounded-lg border">
                              <div className="px-4 py-3 bg-gray-50 border-b">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-gray-400" />
                                  <h4 className="font-semibold text-gray-900">{annee}</h4>
                                  <span className="text-sm text-gray-500">
                                    ({decomptesAnnee.length} décompte{decomptesAnnee.length > 1 ? 's' : ''})
                                  </span>
                                </div>
                              </div>
                              {viewMode === 'grid' ? (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {decomptesAnnee.map(decompte => {
                                    const badge = getStatutBadge(decompte.statut);
                                    return (
                                      <div key={decompte.id} className="border rounded-lg p-4 hover:shadow-md hover:border-primary-300 transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                          <p className="text-sm text-gray-500">
                                            {new Date(decompte.periode_debut).toLocaleDateString('fr-FR')} - {new Date(decompte.periode_fin).toLocaleDateString('fr-FR')}
                                          </p>
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                                            {decompte.statut}
                                          </span>
                                        </div>
                                        {decompte.notes && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{decompte.notes}</p>}
                                        <button
                                          onClick={() => navigate(`/decomptes/${decompte.id}`)}
                                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                                        >
                                          <Eye className="h-4 w-4" />
                                          Voir détails
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {decomptesAnnee.map(decompte => {
                                    const badge = getStatutBadge(decompte.statut);
                                    return (
                                      <div key={decompte.id} className="px-4 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 flex-wrap">
                                            <p className="text-sm font-medium text-gray-900">
                                              {new Date(decompte.periode_debut).toLocaleDateString('fr-FR')} - {new Date(decompte.periode_fin).toLocaleDateString('fr-FR')}
                                            </p>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                                              {decompte.statut}
                                            </span>
                                          </div>
                                          {decompte.notes && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{decompte.notes}</p>}
                                        </div>
                                        <button
                                          onClick={() => navigate(`/decomptes/${decompte.id}`)}
                                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                                        >
                                          <Eye className="h-4 w-4" />
                                          <span className="hidden sm:inline">Voir détails</span>
                                          <span className="sm:hidden">Détails</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DecomptesDashboard;
