import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  UserCircle,
  Calendar,
  Droplets,
  Home,
  Edit2,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';
import {
  locatairesService,
  immeublesService,
  proprietairesService,
  compteursEauService
} from '../../services/api';

function LocataireDetail() {
  const { id: immeubleId, locId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [immeuble, setImmeuble] = useState(null);
  const [locataire, setLocataire] = useState(null);
  const [proprietaire, setProprietaire] = useState(null);
  const [compteurs, setCompteurs] = useState([]);

  useEffect(() => {
    loadData();
  }, [immeubleId, locId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [immeubleRes, locataireRes, compteursRes] = await Promise.all([
        immeublesService.getOne(immeubleId),
        locatairesService.getOne(immeubleId, locId),
        compteursEauService.getByImmeuble(immeubleId)
      ]);

      setImmeuble(immeubleRes.data.immeuble);
      setLocataire(locataireRes.data.locataire);
      
      // Compteurs assignés au locataire
      const allCompteurs = compteursRes.data.compteurs || [];
      setCompteurs(allCompteurs.filter(c => c.locataire_id === locId));

      // Charger le propriétaire si lié
      if (locataireRes.data.locataire?.proprietaire_id) {
        try {
          const propRes = await proprietairesService.getOne(immeubleId, locataireRes.data.locataire.proprietaire_id);
          setProprietaire(propRes.data.proprietaire);
        } catch (e) {
          console.log('Propriétaire not found');
        }
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-BE');
  };

  const formatMontant = (montant) => {
    if (!montant || montant === 0) return null;
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant) + ' €';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !locataire) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">{error || 'Locataire introuvable'}</h3>
        <button
          onClick={() => navigate(`/immeubles/${immeubleId}`)}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Retour à l'immeuble
        </button>
      </div>
    );
  }

  const nomComplet = `${locataire.prenom || ''} ${locataire.nom}`.trim();
  const isActive = !locataire.date_fin_bail || new Date(locataire.date_fin_bail) > new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate(`/immeubles/${immeubleId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className={`w-2 h-16 rounded ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{nomComplet}</h1>
              <div className="flex flex-wrap items-center gap-2 text-gray-600 mt-1">
                <button
                  onClick={() => navigate(`/immeubles/${immeubleId}`)}
                  className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{immeuble?.nom}</span>
                </button>
                {locataire.appartement && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm">{locataire.appartement}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full ${
                  isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  {isActive ? 'Locataire actif' : 'Locataire inactif'}
                </span>
                {locataire.nombre_habitants > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                    <Home className="h-3.5 w-3.5 mr-1.5" />
                    {locataire.nombre_habitants} habitant{locataire.nombre_habitants > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}/locataires/${locId}/edit`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Coordonnées */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locataire.email && (
            <a
              href={`mailto:${locataire.email}`}
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:underline"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{locataire.email}</span>
            </a>
          )}
          {locataire.telephone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{locataire.telephone}</span>
            </div>
          )}
          {locataire.date_debut_bail && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Entrée: {formatDate(locataire.date_debut_bail)}</span>
            </div>
          )}
          {locataire.date_fin_bail && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Sortie: {formatDate(locataire.date_fin_bail)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Propriétaire lié */}
      {proprietaire && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-purple-600" />
            Propriétaire
          </h2>
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}/proprietaires/${proprietaire.id}`)}
            className="w-full border rounded-lg p-4 hover:shadow-md transition-shadow hover:border-purple-300 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">
                  {proprietaire.prenom} {proprietaire.nom}
                </h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                  {proprietaire.email && (
                    <a
                      href={`mailto:${proprietaire.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-primary-600 hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{proprietaire.email}</span>
                    </a>
                  )}
                  {proprietaire.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {proprietaire.telephone}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm text-primary-600 flex-shrink-0 ml-4">Voir le décompte →</span>
            </div>
          </button>
        </div>
      )}

      {/* Informations financières */}
      {(locataire.loyer_mensuel > 0 || locataire.charges_mensuelles > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Informations financières</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {locataire.loyer_mensuel > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Loyer mensuel</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatMontant(locataire.loyer_mensuel)}
                </p>
              </div>
            )}
            {locataire.charges_mensuelles > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Charges mensuelles</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatMontant(locataire.charges_mensuelles)}
                </p>
              </div>
            )}
            {locataire.loyer_mensuel > 0 && locataire.charges_mensuelles > 0 && (
              <div className="p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-600">Total mensuel</p>
                <p className="text-xl font-bold text-primary-900 mt-1">
                  {formatMontant(locataire.loyer_mensuel + locataire.charges_mensuelles)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compteurs d'eau */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Droplets className="h-5 w-5 text-cyan-600" />
          Compteurs d'eau
        </h2>

        {compteurs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Droplets className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun compteur assigné</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compteurs.map(compteur => (
              <div key={compteur.id} className="border rounded-lg p-4 bg-cyan-50 border-cyan-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-cyan-800">
                    {compteur.numero_compteur || `Compteur #${compteur.id}`}
                  </span>
                  <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs">
                    {compteur.type_compteur || 'Individuel'}
                  </span>
                </div>
                {compteur.emplacement && (
                  <p className="text-sm text-gray-600 mb-2">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {compteur.emplacement}
                  </p>
                )}
                {compteur.dernier_releve !== undefined && (
                  <div className="mt-2 pt-2 border-t border-cyan-200">
                    <p className="text-xs text-gray-500">Dernier relevé</p>
                    <p className="font-semibold text-cyan-700">{compteur.dernier_releve} m³</p>
                    {compteur.date_dernier_releve && (
                      <p className="text-xs text-gray-400">{formatDate(compteur.date_dernier_releve)}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes / Informations complémentaires */}
      {locataire.notes && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Notes
          </h2>
          <p className="text-gray-600 whitespace-pre-wrap">{locataire.notes}</p>
        </div>
      )}
    </div>
  );
}

export default LocataireDetail;
