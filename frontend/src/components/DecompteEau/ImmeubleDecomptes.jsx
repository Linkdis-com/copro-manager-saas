import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { immeublesService, decomptesEauService } from '../../services/api';
import { ArrowLeft, Plus, Building2, Droplets, Calendar, Search, Settings } from 'lucide-react';

export default function ImmeubleDecomptes() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  const [immeuble, setImmeuble] = useState(null);
  const [decomptes, setDecomptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('actifs');

  useEffect(() => { loadData(); }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const immeubleRes = await immeublesService.getOne(immeubleId);
      setImmeuble(immeubleRes.data.immeuble);
      const decomptesRes = await decomptesEauService.getAll();
      const allDecomptes = decomptesRes.data.decomptes || [];
      setDecomptes(allDecomptes.filter(d => d.immeuble_id === immeubleId));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut) => {
    const configs = { 
      brouillon: { bg: 'bg-gray-100', text: 'text-gray-800', label: '📝 Brouillon' }, 
      calcule: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Calculé' }, 
      valide: { bg: 'bg-blue-100', text: 'text-blue-800', label: '✓ Validé' }, 
      cloture: { bg: 'bg-red-100', text: 'text-red-800', label: '🔒 Clôturé' } 
    };
    const config = configs[statut] || configs.brouillon;
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  const filteredDecomptes = decomptes.filter(d => {
    const matchSearch = !searchQuery || d.nom?.toLowerCase().includes(searchQuery.toLowerCase()) || d.annee?.toString().includes(searchQuery);
    let matchStatus = true;
    if (filterStatus === 'actifs') matchStatus = d.statut !== 'valide' && d.statut !== 'cloture';
    else if (filterStatus === 'valides') matchStatus = d.statut === 'valide' || d.statut === 'cloture';
    return matchSearch && matchStatus;
  });

  const decomptesByYear = filteredDecomptes.reduce((acc, d) => { if (!acc[d.annee]) acc[d.annee] = []; acc[d.annee].push(d); return acc; }, {});
  const years = Object.keys(decomptesByYear).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!immeuble) return <div className="text-center py-12"><Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium">Immeuble introuvable</h3></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/decomptes')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2"><Building2 className="h-7 w-7 text-blue-600" />{immeuble.nom}</h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1">{decomptes.length} décompte{decomptes.length > 1 ? 's' : ''} d'eau{immeuble.adresse && ` • ${immeuble.adresse}`}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate(`/immeubles/${immeubleId}/compteurs`)} className="flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm">
            <Settings className="h-5 w-5 mr-2" />Modifier les compteurs
          </button>
          <button onClick={() => navigate(`/decomptes/nouveau?immeubleId=${immeubleId}`)} className="flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            <Plus className="h-5 w-5 mr-2" />Nouveau décompte
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
            <button onClick={() => setFilterStatus('actifs')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'actifs' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Actifs</button>
            <button onClick={() => setFilterStatus('tous')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'tous' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Tous</button>
            <button onClick={() => setFilterStatus('valides')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'valides' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Validés</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {years.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{decomptes.length === 0 ? 'Aucun décompte créé' : 'Aucun décompte trouvé'}</h3>
            {decomptes.length === 0 ? <><p className="text-gray-600 mb-6">Créez votre premier décompte d'eau</p><button onClick={() => navigate(`/decomptes/nouveau?immeubleId=${immeubleId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5 mr-2" />Créer</button></> : <p className="text-gray-600">Modifiez les filtres</p>}
          </div>
        ) : (
          years.map(year => {
            const yearDecomptes = decomptesByYear[year];
            const isCurrentYear = parseInt(year) === currentYear;
            return (
              <div key={year} className={`bg-white rounded-lg border-2 transition-all ${isCurrentYear ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-gray-600" />{year}
                      {isCurrentYear && <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full">Actuelle</span>}
                    </h2>
                    <span className="text-sm text-gray-600">{yearDecomptes.length} décompte{yearDecomptes.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {yearDecomptes.map(d => (
                      <button key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)} className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{d.nom || `Décompte ${d.annee}`}</h3>
                          {getStatusBadge(d.statut)}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(d.periode_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → {new Date(d.periode_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                          {d.type_comptage && <p className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{d.type_comptage}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
