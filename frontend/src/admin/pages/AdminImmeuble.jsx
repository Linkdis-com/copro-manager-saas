import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, MapPin, Users, Home, Calendar, 
  Edit, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function AdminImmeuble() {
  const { id, clientId } = useParams();
  const navigate = useNavigate();
  const [immeuble, setImmeuble] = useState(null);
  const [proprietaires, setProprietaires] = useState([]);
  const [locataires, setLocataires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImmeuble();
  }, [id]);

  const loadImmeuble = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // Charger immeuble
      const immeubleRes = await fetch(`${API_URL}/api/v1/admin/immeubles/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (immeubleRes.ok) {
        const data = await immeubleRes.json();
        setImmeuble(data.immeuble);
        setProprietaires(data.proprietaires || []);
        setLocataires(data.locataires || []);
      }
    } catch (error) {
      console.error('Error loading immeuble:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImmeuble = async () => {
    const confirmText = prompt(
      '⚠️ ATTENTION: Supprimer cet immeuble supprimera également:\n' +
      '- Tous les propriétaires\n' +
      '- Tous les locataires\n' +
      '- Tous les décomptes\n\n' +
      'Tapez "SUPPRIMER" pour confirmer:'
    );

    if (confirmText !== 'SUPPRIMER') {
      alert('❌ Suppression annulée');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/v1/admin/immeubles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('✅ Immeuble supprimé');
        navigate(`/clients/${clientId}`);
      } else {
        const error = await res.json();
        alert('❌ ' + error.error);
      }
    } catch (error) {
      alert('❌ Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!immeuble) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Immeuble non trouvé</p>
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="mt-4 text-red-600 hover:text-red-700"
        >
          ← Retour au client
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-red-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{immeuble.nom}</h2>
              <p className="text-sm text-gray-500">
                {immeuble.adresse}, {immeuble.code_postal} {immeuble.ville}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            <CheckCircle className="h-4 w-4" />
            Actif
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations générales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Nom de l'immeuble</label>
                <div className="mt-1">
                  <span className="text-sm font-medium">{immeuble.nom}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Nombre d'appartements</label>
                <div className="flex items-center gap-2 mt-1">
                  <Home className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">{immeuble.nombre_appartements}</span>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Adresse complète</label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="text-sm font-medium">
                    {immeuble.adresse}<br />
                    {immeuble.code_postal} {immeuble.ville}<br />
                    {immeuble.pays || 'Belgique'}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Créé le</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {new Date(immeuble.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              {immeuble.region && (
                <div>
                  <label className="text-sm text-gray-600">Région</label>
                  <div className="mt-1">
                    <span className="text-sm font-medium capitalize">{immeuble.region}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Propriétaires */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Propriétaires ({proprietaires.length})
              </h3>
            </div>
            
            {proprietaires.length > 0 ? (
              <div className="space-y-2">
                {proprietaires.map((proprio) => (
                <div key={proprio.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {proprio.nom?.charAt(0)}{proprio.prenom?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {proprio.prenom} {proprio.nom}
                      </p>
                      <p className="text-xs text-gray-500">{proprio.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {proprio.numero_appartement ? `Appt ${proprio.numero_appartement}` : 'Copropriétaire'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {proprio.milliemes || 0}/1000 millièmes
                    </p>
                  </div>
                </div>
              ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun propriétaire</p>
              </div>
            )}
          </div>

          {/* Locataires */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Locataires ({locataires.length})
              </h3>
            </div>
            
            {locataires.length > 0 ? (
              <div className="space-y-2">
               {locataires.map((locataire) => (
  <div key={locataire.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
        <span className="text-purple-600 font-semibold text-sm">
          {locataire.nom?.charAt(0)}{locataire.prenom?.charAt(0)}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {locataire.prenom} {locataire.nom}
        </p>
        <p className="text-xs text-gray-500">
          {locataire.email || locataire.telephone || 'Pas de contact'}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium text-gray-900">
        {locataire.loyer_mensuel ? `${locataire.loyer_mensuel}€/mois` : 'Locataire'}
      </p>
      {locataire.date_debut_bail && (
        <p className="text-xs text-gray-500">
          Depuis {new Date(locataire.date_debut_bail).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun locataire</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions admin */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actions administrateur
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => alert('Fonctionnalité en développement')}
                className="w-full flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                <Edit className="h-5 w-5" />
                Modifier l'immeuble
              </button>

              <div className="border-t pt-3 mt-3">
                <button
                  onClick={handleDeleteImmeuble}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  <Trash2 className="h-5 w-5" />
                  Supprimer l'immeuble
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ⚠️ Supprime toutes les données liées
                </p>
              </div>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Statistiques
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Appartements</span>
                <span className="text-sm font-semibold">{immeuble.nombre_appartements}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Propriétaires</span>
                <span className="text-sm font-semibold">{proprietaires.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Locataires</span>
                <span className="text-sm font-semibold">{locataires.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taux occupation</span>
                <span className="text-sm font-semibold">
                  {immeuble.nombre_appartements > 0 
                    ? Math.round((locataires.length / immeuble.nombre_appartements) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminImmeuble;
