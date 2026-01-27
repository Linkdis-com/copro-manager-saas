import { Grid3x3, List, Droplets, Users, TrendingUp } from 'lucide-react';

function RelevesDisplay({ releves, viewMode, setViewMode }) {
  
  const getTotalConsommation = () => {
    return releves.reduce((sum, r) => sum + parseFloat(r.consommation || 0), 0);
  };

  const getTotalHabitants = () => {
    return releves.reduce((sum, r) => sum + parseInt(r.nombre_habitants || 0), 0);
  };

  if (releves.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header avec toggle et stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{releves.length}</span> relevé(s)
          </div>
          <div className="text-sm text-gray-600">
            <Droplets className="inline h-4 w-4 mr-1 text-cyan-600" />
            <span className="font-semibold text-gray-900">{getTotalConsommation()}</span> m³
          </div>
          <div className="text-sm text-gray-600">
            <Users className="inline h-4 w-4 mr-1 text-purple-600" />
            <span className="font-semibold text-gray-900">{getTotalHabitants()}</span> habitants
          </div>
        </div>

        {/* Toggle vue */}
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
      </div>

      {/* Vue Grille */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {releves.map((releve) => (
            <div 
              key={releve.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {releve.locataire_prenom} {releve.locataire_nom}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Compteur: {releve.numero_compteur}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-cyan-600">
                    {releve.consommation} m³
                  </div>
                  <div className="text-xs text-gray-500">Consommation</div>
                </div>
              </div>

              {/* Index */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Index précédent</span>
                  <span className="font-semibold text-gray-900">
                    {releve.index_precedent} m³
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Index actuel</span>
                  <span className="font-semibold text-gray-900">
                    {releve.index_actuel} m³
                  </span>
                </div>
              </div>

              {/* Habitants */}
              <div className="pt-3 border-t flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Habitants</span>
                </div>
                <span className="font-semibold text-purple-600">
                  {releve.nombre_habitants}
                </span>
              </div>

              {/* Notes si présentes */}
              {releve.notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 italic">{releve.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vue Liste */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Index Préc.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Index Actuel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consommation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Habitants
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {releves.map((releve) => (
                <tr key={releve.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-purple-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {releve.locataire_prenom} {releve.locataire_nom}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {releve.numero_compteur}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {releve.index_precedent} m³
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {releve.index_actuel} m³
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-cyan-600">
                      {releve.consommation} m³
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-purple-600 mr-1" />
                      <span className="text-sm font-semibold text-purple-600">
                        {releve.nombre_habitants}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Ligne Total */}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan="4" className="px-6 py-4 text-sm text-gray-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-600">
                  {getTotalConsommation()} m³
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                  {getTotalHabitants()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RelevesDisplay;
