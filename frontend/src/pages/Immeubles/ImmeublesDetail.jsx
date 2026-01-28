import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  immeublesService, 
  proprietairesService, 
  locatairesService,
  compteursEauService,
  fournisseursService
} from '../../services/api';
import { 
  ArrowLeft, Building2, Users, UserCircle, AlertCircle,
  Edit2, Plus, Droplets, Grid3x3, List,
  Tag, Wallet, ChevronRight, MapPin, AlertTriangle
} from 'lucide-react';
import ProprietairesForm from '../Proprietaires/ProprietairesForm';
import LocatairesForm from '../Locataires/LocatairesForm';
import ComptabiliteImmeuble from '../Comptabilite/ComptabiliteImmeuble';
import ImmeubleNavigationCards from '../../components/ImmeubleNavigationCards';


function ImmeublesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [immeuble, setImmeuble] = useState(null);
  const [proprietaires, setProprietaires] = useState([]);
  const [locataires, setLocataires] = useState([]);
  const [compteurs, setCompteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('proprietaires');
  const [fournisseurs, setFournisseurs] = useState([]);
  
  // View modes
  const [proprietairesViewMode, setProprietairesViewMode] = useState('grid');
  const [locatairesViewMode, setLocatairesViewMode] = useState('grid');
  
  const [showProprietaireForm, setShowProprietaireForm] = useState(false);
  const [showLocataireForm, setShowLocataireForm] = useState(false);
  const [showCompteurForm, setShowCompteurForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [immeubleRes, proprietairesRes, locatairesRes, compteursRes, fournisseursRes] = await Promise.all([
        immeublesService.getOne(id),
        proprietairesService.getByImmeuble(id),
        locatairesService.getByImmeuble(id),
        compteursEauService.getByImmeuble(id),
        fournisseursService.getAll(id).catch(() => ({ data: { fournisseurs: [] } }))
      ]);

      setImmeuble(immeubleRes.data.immeuble);
      setProprietaires(proprietairesRes.data.proprietaires || []);
      setLocataires(locatairesRes.data.locataires || []);
      setCompteurs(compteursRes.data.compteurs || []);
      setFournisseurs(fournisseursRes.data.fournisseurs || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Calcul du pourcentage de parts
  const calculatePartsPercentage = (nombreParts) => {
    const total = immeuble?.nombre_total_parts || immeuble?.total_milliemes || 1000;
    if (!total || total === 0 || !nombreParts) return '0.00';
    return ((nombreParts / total) * 100).toFixed(2);
  };

  // Trouver le propriétaire d'un locataire
  const getProprietaireForLocataire = (locataire) => {
    if (locataire.proprietaire_id) {
      return proprietaires.find(p => p.id === locataire.proprietaire_id);
    }
    return null;
  };

  // Vérifier si le maximum de propriétaires est atteint
  const getMaxProprietaires = () => {
    return immeuble?.nombre_appartements || immeuble?.nombre_lots || null;
  };

  const isMaxProprietairesAtteint = () => {
    const max = getMaxProprietaires();
    if (!max) return false;
    return proprietaires.length >= max;
  };

  // Navigation vers propriétaire
  const goToProprietaire = (propId) => {
    navigate(`/immeubles/${id}/proprietaires/${propId}`);
  };

  // Navigation vers locataire
  const goToLocataire = (locId) => {
    navigate(`/immeubles/${id}/locataires/${locId}`);
  };

  // Navigation vers import transactions
  const goToImport = () => {
    navigate(`/immeubles/${id}/transactions`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!immeuble) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Immeuble introuvable</h3>
        <button
          onClick={() => navigate('/immeubles')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const maxProprietaires = getMaxProprietaires();
  const maxAtteint = isMaxProprietairesAtteint();

  return (
    <div className="space-y-6">
      {/* Header avec infos immeuble */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate('/immeubles')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{immeuble.nom}</h1>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <MapPin className="h-4 w-4" />
                <span>{immeuble.adresse}</span>
              </div>
              {/* Infos compactes */}
              <div className="flex flex-wrap gap-2 mt-3 text-sm">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  {immeuble.nombre_total_parts || immeuble.total_milliemes || 1000} millièmes
                </span>
                {maxProprietaires && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full ${
                    maxAtteint ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {proprietaires.length}/{maxProprietaires} lots
                    {maxAtteint && <AlertTriangle className="h-3 w-3 ml-1" />}
                  </span>
                )}
                {immeuble.mode_comptage_eau && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800">
                    <Droplets className="h-3.5 w-3.5 mr-1.5" />
                    {immeuble.mode_comptage_eau}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/immeubles/${id}/edit`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Stats rapides - Cards cliquables (sans Exercices) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Propriétaires */}
        <button
          onClick={() => setActiveTab('proprietaires')}
          className={`bg-white rounded-xl shadow-sm border-2 p-4 hover:shadow-md transition-all text-left group ${
            activeTab === 'proprietaires' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${
              activeTab === 'proprietaires' ? 'bg-blue-200' : 'bg-blue-100 group-hover:bg-blue-200'
            }`}>
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Propriétaires</p>
              <p className="text-xl font-bold text-gray-900">
                {proprietaires.length}
                {maxProprietaires && <span className="text-sm font-normal text-gray-500">/{maxProprietaires}</span>}
              </p>
            </div>
          </div>
        </button>
        
        {/* Locataires */}
        <button
          onClick={() => setActiveTab('locataires')}
          className={`bg-white rounded-xl shadow-sm border-2 p-4 hover:shadow-md transition-all text-left group ${
            activeTab === 'locataires' ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-green-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${
              activeTab === 'locataires' ? 'bg-green-200' : 'bg-green-100 group-hover:bg-green-200'
            }`}>
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Locataires</p>
              <p className="text-xl font-bold text-gray-900">{locataires.length}</p>
            </div>
          </div>
        </button>

        {/* Compteurs eau */}
        <button
          onClick={() => setActiveTab('compteurs')}
          className={`bg-white rounded-xl shadow-sm border-2 p-4 hover:shadow-md transition-all text-left group ${
            activeTab === 'compteurs' ? 'border-cyan-500 bg-cyan-50' : 'border-transparent hover:border-cyan-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${
              activeTab === 'compteurs' ? 'bg-cyan-200' : 'bg-cyan-100 group-hover:bg-cyan-200'
            }`}>
              <Droplets className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Compteurs</p>
              <p className="text-xl font-bold text-gray-900">{compteurs.length}</p>
            </div>
          </div>
        </button>

        {/* Fournisseurs */}
        <button
          onClick={() => navigate(`/immeubles/${id}/fournisseurs`)}
          className="bg-white rounded-xl shadow-sm border-2 border-transparent p-4 hover:shadow-md hover:border-purple-200 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Tag className="h-6 w-6 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Fournisseurs</p>
              <p className="text-xl font-bold text-gray-900">{fournisseurs.length}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>
        </button>

        {/* Extraits - Import */}
        <button
          onClick={goToImport}
          className="bg-white rounded-xl shadow-sm border-2 border-transparent p-4 hover:shadow-md hover:border-amber-200 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
              <Wallet className="h-6 w-6 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Extraits</p>
              <p className="text-sm font-semibold text-amber-600">Importer →</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
          </div>
        </button>
      </div>

      {/* Tabs - Propriétaires / Locataires / Compteurs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('proprietaires')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                activeTab === 'proprietaires'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Propriétaires ({proprietaires.length}{maxProprietaires ? `/${maxProprietaires}` : ''})
            </button>
            <button
              onClick={() => setActiveTab('locataires')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                activeTab === 'locataires'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Locataires ({locataires.length})
            </button>
            <button
              onClick={() => setActiveTab('compteurs')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                activeTab === 'compteurs'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Droplets className="inline h-4 w-4 mr-1" />
              Compteurs ({compteurs.length})
            </button>
          </nav>
        </div>

        {/* Tab Propriétaires */}
        {activeTab === 'proprietaires' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Propriétaires</h3>
                {/* Message max compact dans le titre */}
                {maxAtteint && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Complet
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {/* Toggle vue */}
                <div className="flex bg-gray-100 border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setProprietairesViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      proprietairesViewMode === 'grid'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Vue grille"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setProprietairesViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      proprietairesViewMode === 'list'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Vue liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Bouton Ajouter */}
                {maxAtteint ? (
                  <button
                    className="flex items-center px-2 sm:px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                    disabled
                    title={`Maximum de ${maxProprietaires} propriétaires atteint`}
                  >
                    <AlertTriangle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Complet</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowProprietaireForm(true)}
                    className="flex items-center px-2 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline">Ajouter</span>
                  </button>
                )}
              </div>
            </div>
            
            {proprietaires.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <UserCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun propriétaire</p>
              </div>
            ) : proprietairesViewMode === 'grid' ? (
              // Vue Grille
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proprietaires.map((prop) => (
                  <div 
                    key={prop.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer"
                    onClick={() => goToProprietaire(prop.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {prop.prenom} {prop.nom}
                        </h4>
                        <p className="text-sm text-gray-600">{prop.email}</p>
                        <p className="text-sm text-gray-600">{prop.telephone}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-primary-600 mt-2 font-medium">
                      {prop.nombre_parts || prop.milliemes || 0} parts ({calculatePartsPercentage(prop.nombre_parts || prop.milliemes)}%)
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              // Vue Liste (Tableau)
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parts</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proprietaires.map((prop) => (
                      <tr 
                        key={prop.id} 
                        className="hover:bg-gray-50 cursor-pointer" 
                        onClick={() => goToProprietaire(prop.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{prop.prenom} {prop.nom}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prop.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{prop.telephone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-primary-600">
                            {prop.nombre_parts || prop.milliemes || 0} ({calculatePartsPercentage(prop.nombre_parts || prop.milliemes)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Locataires */}
        {activeTab === 'locataires' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Locataires</h3>
              <div className="flex items-center space-x-3">
                {/* Toggle vue */}
                <div className="flex bg-gray-100 border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setLocatairesViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      locatairesViewMode === 'grid'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Vue grille"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setLocatairesViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      locatairesViewMode === 'list'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Vue liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                
                <button
                  onClick={() => setShowLocataireForm(true)}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter
                </button>
              </div>
            </div>
            
            {locataires.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun locataire</p>
              </div>
            ) : locatairesViewMode === 'grid' ? (
              // Vue Grille
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locataires.map((loc) => {
                  const proprietaire = getProprietaireForLocataire(loc);
                  return (
                    <div 
                      key={loc.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
                      onClick={() => goToLocataire(loc.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {loc.prenom} {loc.nom}
                          </h4>
                          <p className="text-sm text-gray-600">{loc.email}</p>
                          <p className="text-sm text-gray-600">{loc.telephone}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {loc.nombre_habitants || 0} habitant(s)
                        </span>
                        {proprietaire && (
                          <span className="text-xs text-purple-600">
                            {proprietaire.prenom} {proprietaire.nom}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Vue Liste (Tableau)
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitants</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriétaire</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locataires.map((loc) => {
                      const proprietaire = getProprietaireForLocataire(loc);
                      return (
                        <tr 
                          key={loc.id} 
                          className="hover:bg-gray-50 cursor-pointer" 
                          onClick={() => goToLocataire(loc.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{loc.prenom} {loc.nom}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{loc.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{loc.telephone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{loc.nombre_habitants || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {proprietaire ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToProprietaire(proprietaire.id);
                                }}
                                className="text-sm text-purple-600 hover:text-purple-800"
                              >
                                {proprietaire.prenom} {proprietaire.nom}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Compteurs */}
{activeTab === 'compteurs' && (
  <div className="p-6">
    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
      <Droplets className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Nouveau Système de Gestion de l'Eau
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Accédez au système complet avec configuration régionale, 
        compteurs, relevés et décomptes automatiques.
      </p>
      <button
        onClick={() => navigate(`/immeubles/${id}/eau`)}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg transition-all font-medium"
      >
        <Droplets className="h-5 w-5 mr-2" />
        Accéder au système Eau
        <ChevronRight className="h-5 w-5 ml-2" />
      </button>
    </div>
  </div>
)}
      </div>

      {/* Bloc Comptabilité avec bouton Import intégré */}
      <ComptabiliteImmeuble
        immeubleId={id}
        proprietaires={proprietaires}
        immeubleNom={immeuble.nom}
        onNavigateToImport={goToImport}
      />

      {/* Modals */}
      {showProprietaireForm && (
        <ProprietairesForm
          immeubleId={id}
          onClose={() => setShowProprietaireForm(false)}
          onSuccess={() => {
            setShowProprietaireForm(false);
            loadData();
          }}
        />
      )}

      {showLocataireForm && (
        <LocatairesForm
          immeubleId={id}
          proprietaires={proprietaires}
          onClose={() => setShowLocataireForm(false)}
          onSuccess={() => {
            setShowLocataireForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default ImmeublesDetail;
