import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, UserPlus, Mail, Building2, Calendar, Eye, 
  ChevronDown, ChevronRight, MapPin, Home
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function AdminClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClientsWithDetails();
  }, []);

  const loadClientsWithDetails = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // 1. Charger la liste des clients
      const clientsRes = await fetch(`${API_URL}/api/v1/admin/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!clientsRes.ok) return;
      
      const clientsData = await clientsRes.json();
      const clientsList = clientsData.clients || [];
      setClients(clientsList);

      // 2. Charger les détails de TOUS les clients en parallèle (cache)
      const detailsPromises = clientsList.map(async (client) => {
        try {
          const detailRes = await fetch(`${API_URL}/api/v1/admin/clients/${client.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            return {
              id: client.id,
              immeubles: detailData.immeubles || [],
              subscription: detailData.subscription
            };
          }
        } catch (err) {
          console.error(`Error loading details for client ${client.id}:`, err);
        }
        return null;
      });

      const allDetails = await Promise.all(detailsPromises);
      
      // 3. Construire le cache
      const detailsMap = {};
      allDetails.forEach(detail => {
        if (detail) {
          detailsMap[detail.id] = {
            immeubles: detail.immeubles,
            subscription: detail.subscription
          };
        }
      });
      
      setClientDetails(detailsMap);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (clientId) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  const filteredClients = clients.filter(client => 
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${client.prenom} ${client.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-600 mt-1">{clients.length} clients au total</p>
        </div>
        <button 
          onClick={() => alert('Fonctionnalité à venir : Créer un nouveau client')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Clients List avec expansion */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Immeubles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <React.Fragment key={client.id}>
                    {/* Ligne principale */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleExpand(client.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {expandedClient === client.id ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                        </button>
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => toggleExpand(client.id)}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold">
                              {client.prenom?.[0]}{client.nom?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.prenom} {client.nom}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {client.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          {client.immeubles_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(client.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/clients/${client.id}`);
                          }}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          Détails
                        </button>
                      </td>
                    </tr>

                    {/* Ligne expansible avec immeubles */}
                    {expandedClient === client.id && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* Header section */}
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-900">
                                Immeubles de {client.prenom} {client.nom}
                              </h4>
                              {clientDetails[client.id]?.subscription && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600">Abonnement:</span>
                                  <span className="font-medium text-green-600">
                                    {clientDetails[client.id].subscription.plan_name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Immeubles */}
                            {clientDetails[client.id]?.immeubles ? (
                              clientDetails[client.id].immeubles.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  {clientDetails[client.id].immeubles.map((immeuble) => (
                                    <div 
                                      key={immeuble.id} 
                                      className="bg-white p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all"
                                    >
                                      <div className="flex flex-col h-full">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Building2 className="h-5 w-5 text-red-600" />
                                            <h5 className="font-semibold text-gray-900">{immeuble.nom}</h5>
                                          </div>
                                          
                                          <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex items-start gap-2">
                                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                              <span className="text-xs leading-relaxed">
                                                {immeuble.adresse}<br />
                                                {immeuble.code_postal} {immeuble.ville}
                                              </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 pt-2 text-xs text-gray-500">
                                              <div className="flex items-center gap-1">
                                                <Home className="h-3 w-3" />
                                                <span>{immeuble.nombre_appartements} appts</span>
                                              </div>
                                              <span>•</span>
                                              <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(immeuble.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Actions rapides immeuble */}
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/clients/${client.id}/immeubles/${immeuble.id}`);
                                              }}
                                              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                            >
                                              <Eye className="h-3 w-3" />
                                              Gérer l'immeuble
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <Building2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                  <p className="text-sm">Aucun immeuble</p>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center justify-center py-6">
                                <div className="animate-spin h-6 w-6 border-4 border-red-600 border-t-transparent rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminClients;
