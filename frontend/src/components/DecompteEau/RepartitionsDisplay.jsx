import { Grid3x3, List, Users, Droplets, TrendingUp } from 'lucide-react';

function RepartitionsDisplay({ repartitions, viewMode, setViewMode }) {
  
  const getTotalAmount = () => {
    return repartitions.reduce((sum, r) => sum + parseFloat(r.montant_total_ttc || 0), 0);
  };

  const getTotalConsommation = () => {
    return repartitions.reduce((sum, r) => sum + parseFloat(r.m3_consommes || 0), 0);
  };

  if (repartitions.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header avec toggle et stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{repartitions.length}</span> répartition(s)
          </div>
          <div className="text-sm text-gray-600">
            <Droplets className="inline h-4 w-4 mr-1 text-cyan-600" />
            <span className="font-semibold text-gray-900">{getTotalConsommation()}</span> m³
          </div>
          <div className="text-sm text-gray-600">
            <TrendingUp className="inline h-4 w-4 mr-1 text-green-600" />
            <span className="font-semibold text-gray-900">{getTotalAmount().toFixed(2)}</span> €
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
          {repartitions.map((rep) => (
            <div 
              key={rep.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {rep.locataire_nom 
                        ? `${rep.locataire_prenom} ${rep.locataire_nom}`
                        : rep.proprietaire_nom
                        ? `${rep.proprietaire_prenom} ${rep.proprietaire_nom}`
                        : 'Non assigné'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {rep.habitants} habitant{rep.habitants > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary-600">
                    {parseFloat(rep.montant_total_ttc || 0).toFixed(2)} €
                  </div>
                  <div className="text-xs text-gray-500">TTC</div>
                </div>
              </div>

              {/* Consommation */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Consommation</span>
                  <span className="font-semibold text-cyan-600">
                    {rep.m3_consommes} m³
                  </span>
                </div>
                {rep.m3_gratuits > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">M³ gratuits</span>
                    <span className="font-semibold text-green-600">
                      -{rep.m3_gratuits} m³
                    </span>
                  </div>
                )}
                {rep.m3_factures && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">M³ facturés</span>
                    <span className="font-semibold text-gray-900">
                      {rep.m3_factures} m³
                    </span>
                  </div>
                )}
              </div>

              {/* Détails montants */}
              <div className="pt-3 border-t space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Eau</span>
                  <span className="font-medium">{parseFloat(rep.montant_eau || 0).toFixed(2)} €</span>
                </div>
                {parseFloat(rep.montant_assainissement || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Assainissement</span>
                    <span className="font-medium">{parseFloat(rep.montant_assainissement || 0).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Redevance</span>
                  <span className="font-medium">{parseFloat(rep.montant_redevance_fixe || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA</span>
                  <span className="font-medium">{parseFloat(rep.montant_tva || 0).toFixed(2)} €</span>
                </div>
              </div>
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
                  Occupant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hab.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conso. (m³)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gratuits
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eau
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Redevance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TVA
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total TTC
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {repartitions.map((rep) => (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-purple-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {rep.locataire_nom 
                          ? `${rep.locataire_prenom} ${rep.locataire_nom}`
                          : rep.proprietaire_nom
                          ? `${rep.proprietaire_prenom} ${rep.proprietaire_nom}`
                          : 'Non assigné'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {rep.habitants}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-cyan-600">
                      {rep.m3_consommes} m³
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rep.m3_gratuits > 0 ? (
                      <span className="text-sm font-semibold text-green-600">
                        -{rep.m3_gratuits} m³
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {parseFloat(rep.montant_eau || 0).toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {parseFloat(rep.montant_redevance_fixe || 0).toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {parseFloat(rep.montant_tva || 0).toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-primary-600">
                      {parseFloat(rep.montant_total_ttc || 0).toFixed(2)} €
                    </span>
                  </td>
                </tr>
              ))}
              {/* Ligne Total */}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan="2" className="px-6 py-4 text-sm text-gray-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-600">
                  {getTotalConsommation()} m³
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-primary-600">
                  {getTotalAmount().toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RepartitionsDisplay;
