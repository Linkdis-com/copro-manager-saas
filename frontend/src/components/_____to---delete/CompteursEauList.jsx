import { useState } from 'react';
import { compteursEauService } from '../../services/api';
import { Droplets, Edit2, Trash2, AlertCircle, CheckCircle, XCircle, User, Home } from 'lucide-react';
import CompteursEauForm from "./CompteursEauForm";
import DeleteConfirmation from '../../components/Common/DeleteConfirmation';

function CompteursEauList({ compteurs, locataires, proprietaires, immeubleId, onUpdate }) {
  const [editingCompteur, setEditingCompteur] = useState(null);
  const [deletingCompteur, setDeletingCompteur] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (compteur) => {
    setEditingCompteur(compteur);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      setError('');
      await compteursEauService.delete(immeubleId, deletingCompteur.id);
      setDeletingCompteur(null);
      onUpdate();
    } catch (err) {
      console.error('Error deleting compteur:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCompteur(null);
    onUpdate();
  };

  // Fonction pour afficher l'occupant (locataire ou propriétaire)
  const renderOccupant = (compteur) => {
    if (compteur.locataire_id) {
      return (
        <div className="flex items-center">
          <Home className="h-4 w-4 text-green-600 mr-2" />
          <div>
            <div className="text-sm text-gray-900">
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
            <div className="text-sm text-gray-900">
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

  if (compteurs.length === 0) {
    return (
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
        <div className="text-center">
          <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun compteur
          </h3>
          <p className="text-gray-600 mb-6">
            Commencez par ajouter les compteurs d'eau de l'immeuble
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="scroll-table">
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
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactif
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(compteur)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCompteur(compteur)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {deletingCompteur && (
        <DeleteConfirmation
          title="Supprimer le compteur"
          message={`Êtes-vous sûr de vouloir supprimer le compteur ${deletingCompteur.numero_compteur} ?`}
          confirmText={deletingCompteur.numero_compteur}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCompteur(null)}
        />
      )}
    </>
  );
}

export default CompteursEauList;