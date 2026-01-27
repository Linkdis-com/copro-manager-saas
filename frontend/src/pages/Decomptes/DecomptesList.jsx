import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decomptesService } from '../../services/api';
import { 
  Plus, Grid3x3, List, Calendar, Building2, Droplets,
  FileEdit, CheckCircle, Lock, Filter, Search
} from 'lucide-react';

function DecomptesList() {
  const navigate = useNavigate();
  const [decomptes, setDecomptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filters, setFilters] = useState({
    annee: '',
    immeuble: '',
    statut: ''
  });

  useEffect(() => {
    loadDecomptes();
  }, []);

  const loadDecomptes = async () => {
    try {
      setLoading(true);
      const res = await decomptesService.getAll();
      setDecomptes(res.data.decomptes || []);
    } catch (err) {
      console.error('Error loading decomptes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statut) => {
    switch(statut) {
      case 'brouillon':
        return <FileEdit className="h-5 w-5 text-gray-500" />;
      case 'calcule':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'valide':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'cloture':
        return <Lock className="h-5 w-5 text-red-500" />;
      default:
        return <FileEdit className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (statut) => {
    switch(statut) {
      case 'brouillon': return 'Brouillon';
      case 'calcule': return 'Calculé';
      case 'valide': return 'Validé';
      case 'cloture': return 'Clôturé';
      default: return statut;
    }
  };

  const getStatusColor = (statut) => {
    switch(statut) {
      case 'brouillon': return 'bg-gray-100 text-gray-800';
      case 'calcule': return 'bg-green-100 text-green-800';
      case 'valide': return 'bg-blue-100 text-blue-800';
      case 'cloture': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDecomptes = decomptes.filter(d => {
    if (filters.annee && !d.annee.toString().includes(filters.annee)) return false;
    if (filters.immeuble && !d.immeuble_nom.toLowerCase().includes(filters.immeuble.toLowerCase())) return false;
    if (filters.statut && d.statut !== filters.statut) return false;
    return true;
  });

  // Grouper par année
  const groupedByYear = filteredDecomptes.reduce((acc, d) => {
    const year = d.annee;
    if (!acc[year]) acc[year] = [];
    acc[year].push(d);
    return acc;
  }, {});

  const years = Object.keys(groupedByYear).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Décomptes d'eau</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez vos décomptes d'eau annuels et répartitions par locataire
          </p>
        </div>
        <button
          onClick={() => navigate('/decomptes/nouveau')}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau décompte
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="font-medium text-gray-900">Filtres</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Filtres dropdown */}
          <select
            value={filters.annee}
            onChange={(e) => setFilters({...filters, annee: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Toutes les années</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={filters.immeuble}
            onChange={(e) => setFilters({...filters, immeuble: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les immeubles</option>
            {[...new Set(decomptes.map(d => d.immeuble_nom))].map(nom => (
              <option key={nom} value={nom}>{nom}</option>
            ))}
          </select>

          <select
            value={filters.statut}
            onChange={(e) => setFilters({...filters, statut: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="calcule">Calculé</option>
            <option value="valide">Validé</option>
            <option value="cloture">Clôturé</option>
          </select>

          {/* Toggle vue */}
          <div className="flex bg-gray-100 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Vue grille"
            >
              <Grid3x3 className="h-4 w-4 mx-auto" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Vue liste"
            >
              <List className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <FileEdit className="h-8 w-8 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total décomptes</p>
              <p className="text-2xl font-bold text-gray-900">{decomptes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <FileEdit className="h-8 w-8 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Brouillons</p>
              <p className="text-2xl font-bold text-gray-900">
                {decomptes.filter(d => d.statut === 'brouillon').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Calculés</p>
              <p className="text-2xl font-bold text-gray-900">
                {decomptes.filter(d => d.statut === 'calcule').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <Lock className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Validés/Clôturés</p>
              <p className="text-2xl font-bold text-gray-900">
                {decomptes.filter(d => d.statut === 'valide' || d.statut === 'cloture').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste par année */}
      {years.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun décompte
          </h3>
          <p className="text-gray-600 mb-6">
            Créez votre premier décompte d'eau
          </p>
          <button
            onClick={() => navigate('/decomptes/nouveau')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau décompte
          </button>
        </div>
      ) : (
        years.map(year => (
          <div key={year} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-primary-50 px-6 py-3 border-b border-primary-100">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-primary-600 mr-2" />
                <h2 className="text-lg font-semibold text-primary-900">{year}</h2>
                <span className="ml-3 text-sm text-primary-600">
                  {groupedByYear[year].length} décompte(s)
                </span>
              </div>
            </div>

            {/* Vue Grille */}
            {viewMode === 'grid' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByYear[year].map(decompte => (
                  <button
                    key={decompte.id}
                    onClick={() => navigate(`/decomptes/${decompte.id}`)}
                    className="text-left border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-primary-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-600 mr-2" />
                        <h3 className="font-semibold text-gray-900">
                          {decompte.immeuble_nom}
                        </h3>
                      </div>
                      {getStatusIcon(decompte.statut)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(decompte.periode_debut).toLocaleDateString('fr-FR')} 
                        {' → '}
                        {new Date(decompte.periode_fin).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Droplets className="h-4 w-4 mr-2" />
                        {decompte.type_comptage || 'Divisionnaire'}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(decompte.statut)}`}>
                          {getStatusLabel(decompte.statut)}
                        </span>
                        {decompte.tarif_nom && (
                          <span className="text-xs text-gray-500">
                            {decompte.tarif_nom}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Vue Liste */}
            {viewMode === 'list' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Année
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Immeuble
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Période
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tarif
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedByYear[year].map(decompte => (
                      <tr 
                        key={decompte.id}
                        onClick={() => navigate(`/decomptes/${decompte.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-primary-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {decompte.annee}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-900">
                              {decompte.immeuble_nom}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(decompte.periode_debut).toLocaleDateString('fr-FR')} 
                          {' → '}
                          {new Date(decompte.periode_fin).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {decompte.type_comptage || 'Divisionnaire'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(decompte.statut)}`}>
                            {getStatusIcon(decompte.statut)}
                            <span className="ml-1">{getStatusLabel(decompte.statut)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {decompte.tarif_nom || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/decomptes/${decompte.id}`);
                            }}
                            className="text-primary-600 hover:text-primary-900 font-medium"
                          >
                            Gérer →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default DecomptesList;
