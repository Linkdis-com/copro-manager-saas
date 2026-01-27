import { useState } from 'react';
import { Calculator, CheckCircle } from 'lucide-react';

export default function CalculTab({ decompte, onValidate, disabled }) {
  const [loading, setLoading] = useState(false);

  const handleCalculate = () => {
    setLoading(true);
    // Simuler calcul
    setTimeout(() => {
      setLoading(false);
      alert('Calcul effectué avec succès');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          Calcul des répartitions
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 Cette fonctionnalité sera disponible après avoir saisi tous les relevés.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">Étapes de calcul :</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Calcul de la consommation par compteur</li>
              <li>Détection des pertes (compteur principal - total divisionnaires)</li>
              <li>Application des tarifs (CVD + CVA)</li>
              <li>Calcul de la TVA</li>
              <li>Génération des répartitions par propriétaire</li>
            </ol>
          </div>

          {!disabled && (
            <div className="flex gap-3">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Calculator className="h-5 w-5 mr-2" />
                {loading ? 'Calcul en cours...' : 'Calculer les répartitions'}
              </button>

              <button
                onClick={onValidate}
                disabled={loading}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Valider le décompte
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          ⚠️ <strong>Note :</strong> Une fois validé, le décompte ne pourra plus être modifié.
        </p>
      </div>
    </div>
  );
}
