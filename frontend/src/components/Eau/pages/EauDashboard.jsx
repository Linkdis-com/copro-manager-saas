// =====================================================
// 🌊 PAGE PRINCIPALE - Tableau de bord Eau
// frontend/src/components/Eau/pages/EauDashboard.jsx
// =====================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Droplets, Settings, FileText, TrendingUp, ArrowRight } from 'lucide-react';
import { TYPES_COMPTAGE } from '../constants';

export default function EauDashboard() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [immeubleId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/eau/configuration/${immeubleId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si pas encore configuré → Afficher sélection type
  if (!config) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <Droplets className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Gestion de l'Eau</h1>
          <p className="text-gray-600">
            Commencez par choisir le type de comptage de votre immeuble
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(TYPES_COMPTAGE).map(type => (
            <button
              key={type.code}
              onClick={() => navigate(`/immeubles/${immeubleId}/eau/configuration?type=${type.code}`)}
              className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all group"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{type.emoji}</div>
                <h3 className="text-xl font-bold mb-2">{type.nom}</h3>
                <p className="text-gray-600 text-sm mb-4">{type.description}</p>
                
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-900 font-medium">
                    Répartition : {type.repartition}
                  </p>
                </div>

                <div className="flex items-center justify-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform">
                  Choisir
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Si configuré → Afficher tableau de bord
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-600" />
            Gestion de l'Eau
          </h1>
          <p className="text-gray-600 mt-1">
            {config.region} • {config.type_comptage}
          </p>
        </div>
        
        <button
          onClick={() => navigate(`/immeubles/${immeubleId}/eau/configuration`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <Settings className="h-4 w-4" />
          Configuration
        </button>
      </div>

      {/* Cartes actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <ActionCard
          icon={Settings}
          title="Compteurs"
          description="Gérer les compteurs d'eau"
          color="blue"
          onClick={() => navigate(`/immeubles/${immeubleId}/eau/compteurs`)}
        />
        
        <ActionCard
          icon={FileText}
          title="Relevés"
          description="Saisir les relevés annuels"
          color="green"
          onClick={() => navigate(`/immeubles/${immeubleId}/eau/releves`)}
        />
        
        <ActionCard
          icon={TrendingUp}
          title="Décomptes"
          description="Voir les décomptes et exporter"
          color="purple"
          onClick={() => navigate(`/immeubles/${immeubleId}/eau/decomptes`)}
        />
      </div>

      {/* Résumé configuration */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">Configuration actuelle</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Région :</span>
            <span className="font-medium ml-2">{config.region}</span>
          </div>
          <div>
            <span className="text-gray-600">Distributeur :</span>
            <span className="font-medium ml-2">{config.distributeur}</span>
          </div>
          <div>
            <span className="text-gray-600">Type comptage :</span>
            <span className="font-medium ml-2">{config.type_comptage}</span>
          </div>
          <div>
            <span className="text-gray-600">TVA :</span>
            <span className="font-medium ml-2">{config.tva_pourcent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant carte action
function ActionCard({ icon: Icon, title, description, color, onClick }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
  };

  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${colors[color]} text-white rounded-xl p-6 hover:shadow-lg transition-all group text-left`}
    >
      <Icon className="h-8 w-8 mb-3 opacity-90" />
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm opacity-90">{description}</p>
      <ArrowRight className="h-5 w-5 mt-4 group-hover:translate-x-2 transition-transform" />
    </button>
  );
}
