import { useState, useEffect } from 'react';
import { compteursEauService, locatairesService, proprietairesService } from '../../services/api';
import { Droplets, Plus, Edit2, Trash2, AlertCircle, Grid3x3, List, Home, User } from 'lucide-react';
import CompteursEauForm from './CompteursEauForm';
import DeleteConfirmation from '../Common/DeleteConfirmation';

function GestionCompteursEau({ immeubleId, decompteId, onUpdate }) {
  const [compteurs, setCompteurs] = useState([]);
  const [locataires, setLocataires] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  
  const [showForm, setShowForm] = useState(false);
  const [editingCompteur, setEditingCompteur] = useState(null);
  const [deletingCompteur, setDeletingCompteur] = useState(null);

  useEffect(() => {
    loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [compteursRes, locatairesRes, proprietairesRes] = await Promise.all([
        compteursEauService.getByImmeuble(immeubleId),
        locatairesService.getByImmeuble(immeubleId),
        proprietairesService.getByImmeuble(immeubleId)
      ]);

      setCompteurs(compteursRes.data.compteurs || []);
      setLocataires(locatairesRes.data.locataires || []);
      setProprietaires(proprietairesRes.data.proprietaires || []);
    } catch (err) {
      console.error('Error loading compteurs:', err);
      setError('Erreur lors du chargement des compteurs');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (compteur) => {
    setEditingCompteur(compteur);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      setError('');
      await compteursEauService.delete(immeubleId, deletingCompteur.id);
      setDeletingCompteur(null);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error deleting compteur:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingCompteur(null);
    await loadData();
    if (onUpdate) onUpdate();
  };

  const renderOccupant = (compteur) => {
    if (compteur.locataire_id) {
      return (
        <div className="flex items-center">
          <Home className="h-4 w-4 text-green-600 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {compteur.locataire_prenom} {compteur.locataire_nom}
            </div>
            <div className="text-xs text-gray-500">Locataire</div>
          </div>
        </div>
      );
    } else if (compteur.proprietaire_id) {
      return (
        <div className="flex items-center">
          <User className="h-4 w-4 text-purple-600 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {compteur.proprietaire_prenom} {compteur.proprietaire_nom}
            </div>
            <div className="text-xs text-gray-500">Propriétaire occupant</div>
          </div>
        </div>
      );
    } else {
      return <span className="text-sm text-gray-400">Non assigné</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Droplets className="h-6 w-6 text-cyan-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Compteurs d'eau</h3>
            <p className="text-sm text-gray-500">{compteurs.length} compteur(s)</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Toggle liste/grille */}
          <div className="flex bg-gray-100 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Vue grille"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingCompteur(null);
              setShowForm(true);
            }}
            className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter un compteur
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {compteurs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun compteur
          </h3>
          <p className="text-gray-600 mb-6">
            Commencez par ajouter les compteurs d'eau pour pouvoir saisir les relevés
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter le premier compteur
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        // Vue Grille
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {compteurs.map((compteur) => (
            <div 
              key={compteur.id} 
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-cyan-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <Droplets className="h-5 w-5 text-cyan-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {compteur.numero_compteur}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(compteur)}
                    className="text-cyan-600 hover:text-cyan-900"
                    title="Modifier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCompteur(compteur)}
                    className="text-red-600 hover:text-red-900"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {renderOccupant(compteur)}
                
                {compteur.emplacement && (
                  <div className="text-xs text-gray-500">
                    📍 {compteur.emplacement}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-gray-600 capitalize">
                    {compteur.type_compteur}
                  </span>
                  {compteur.actif ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactif
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vue Liste (Tableau)
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numéro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emplacement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compteurs.map((compteur) => (
                <tr key={compteur.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Droplets className="h-5 w-5 text-cyan-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {compteur.numero_compteur}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderOccupant(compteur)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {compteur.emplacement || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {compteur.type_compteur}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {compteur.actif ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(compteur)}
                      className="text-cyan-600 hover:text-cyan-900 mr-4"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCompteur(compteur)}
                      className="text-red-600 hover:text-red-900"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulaire */}
      {showForm && (
        <CompteursEauForm
          compteur={editingCompteur}
          locataires={locataires}
          proprietaires={proprietaires}
          immeubleId={immeubleId}
          onClose={() => {
            setShowForm(false);
            setEditingCompteur(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal Suppression */}
      {deletingCompteur && (
        <DeleteConfirmation
          title="Supprimer le compteur"
          message={`Êtes-vous sûr de vouloir supprimer le compteur ${deletingCompteur.numero_compteur} ?`}
          confirmText={deletingCompteur.numero_compteur}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCompteur(null)}
        />
      )}
    </div>
  );
}

export default GestionCompteursEau;
