import { AlertCircle, ArrowUpRight, ShoppingCart, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Composant pour afficher les erreurs de limites d'abonnement
 * Affiche un message détaillé + bouton pour upgrade
 */
export function SubscriptionLimitError({ error, onDismiss }) {
  const navigate = useNavigate();

  // Si pas d'erreur de limite, afficher erreur générique
  if (!error || (!error.error?.includes('limit') && !error.error?.includes('units'))) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <p className="mt-2 text-sm text-red-700">
              {error?.message || "Une erreur est survenue"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Déterminer le type d'erreur
  const isUnitsError = error.error === 'units_limit_reached';
  const isImmeublesError = error.error === 'immeuble_limit_reached';

  const handleUpgrade = () => {
    navigate('/parametres', { state: { tab: 'abonnement' } });
    onDismiss?.();
  };

  // ===================================
  // ERREUR : PAS ASSEZ D'UNITÉS
  // ===================================
  if (isUnitsError && error.details) {
    const d = error.details;
    const isPro = d.isProfessional;

    return (
      <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="p-2 bg-amber-100 rounded-full">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-semibold text-amber-900 mb-2">
              ⚠️ Unités insuffisantes
            </h3>
            
            {/* Message principal */}
            <p className="text-sm text-amber-800 mb-3">
              {error.message}
            </p>

            {/* Détails des unités */}
            <div className="bg-white rounded-lg p-3 mb-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unités achetées :</span>
                <span className="font-semibold text-gray-900">{d.purchased}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unités utilisées :</span>
                <span className="font-semibold text-gray-900">{d.used}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Unités disponibles :</span>
                <span className="font-bold text-gray-900">{d.available}</span>
              </div>
            </div>

            {/* Coût additionnel */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                💡 Pour créer cet immeuble, vous devez acheter :
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-600">
                  {d.missing}
                </span>
                <span className="text-sm text-gray-600">
                  unité{d.missing > 1 ? 's' : ''} supplémentaire{d.missing > 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Prix : {d.missing} × {d.pricePerUnit}€ {isPro ? 'HTVA' : 'TTC'} = 
                  <span className="font-semibold text-gray-900 ml-1">
                    {d.additionalCostMonthly.toFixed(2)}€/mois
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  Soit {d.additionalCostYearly.toFixed(2)}€ par an
                  {isPro && ' + TVA 21%'}
                </p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUpgrade}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                Acheter {d.missing} unité{d.missing > 1 ? 's' : ''}
                <ArrowUpRight className="h-4 w-4" />
              </button>
              
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================================
  // ERREUR : LIMITE D'IMMEUBLES
  // ===================================
  if (isImmeublesError) {
    return (
      <div className="rounded-lg bg-purple-50 border-2 border-purple-300 p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="p-2 bg-purple-100 rounded-full">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-semibold text-purple-900 mb-2">
              🏢 Limite d'immeubles atteinte
            </h3>
            
            <p className="text-sm text-purple-800 mb-3">
              {error.message}
            </p>

            {error.currentCount !== undefined && error.limit !== undefined && (
              <div className="bg-white rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Immeubles actifs :</span>
                  <span className="text-lg font-bold text-purple-600">
                    {error.currentCount} / {error.limit}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-1">
                💼 Passez au plan Professionnel pour :
              </p>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Gérer un nombre illimité d'immeubles</li>
                <li>• Récupérer la TVA (4€ HTVA/unité)</li>
                <li>• Support prioritaire</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUpgrade}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                <TrendingUp className="h-4 w-4" />
                Passer en Pro
                <ArrowUpRight className="h-4 w-4" />
              </button>
              
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback : erreur de limite générique
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Limite atteinte
          </h3>
          <p className="mt-2 text-sm text-amber-700">{error.message}</p>
          
          <div className="mt-4">
            <button
              type="button"
              onClick={handleUpgrade}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Gérer mon abonnement
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionLimitError;
