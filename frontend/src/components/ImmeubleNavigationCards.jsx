// =====================================================
// 🏢 NAVIGATION CARDS - PAGE DÉTAIL IMMEUBLE
// frontend/src/components/ImmeubleNavigationCards.jsx
// =====================================================
import { Droplets, Users, Calculator, FileText, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

function ImmeubleNavigationCards() {
  const navigate = useNavigate();
  const { id: immeubleId } = useParams();

  const quickActions = [
    {
      title: 'Gestion Eau',
      description: 'Compteurs, relevés, décomptes',
      icon: Droplets,
      color: 'blue',
      path: `/immeubles/${immeubleId}/eau`,
      available: true
    },
    {
      title: 'Propriétaires',
      description: 'Liste des propriétaires',
      icon: Users,
      color: 'green',
      path: `/proprietaires`, // Route globale (à adapter si route spécifique existe)
      available: true
    },
    {
      title: 'Charges',
      description: 'Gestion des charges',
      icon: Calculator,
      color: 'purple',
      path: `/immeubles/${immeubleId}/charges`,
      available: false, // Pas encore implémenté
      comingSoon: true
    },
    {
      title: 'Documents',
      description: 'PV, contrats, factures',
      icon: FileText,
      color: 'orange',
      path: `/immeubles/${immeubleId}/documents`,
      available: false, // Pas encore implémenté
      comingSoon: true
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      hover: 'hover:from-blue-600 hover:to-blue-700',
      disabled: 'from-blue-300 to-blue-400'
    },
    green: {
      bg: 'from-green-500 to-green-600',
      hover: 'hover:from-green-600 hover:to-green-700',
      disabled: 'from-green-300 to-green-400'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      hover: 'hover:from-purple-600 hover:to-purple-700',
      disabled: 'from-purple-300 to-purple-400'
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      hover: 'hover:from-orange-600 hover:to-orange-700',
      disabled: 'from-orange-300 to-orange-400'
    }
  };

  const handleActionClick = (action) => {
    if (!action.available) return;
    navigate(action.path);
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
      {quickActions.map((action) => (
        <button
          key={action.title}
          onClick={() => handleActionClick(action)}
          disabled={!action.available}
          className={`
            bg-gradient-to-br 
            ${action.available ? colorClasses[action.color].bg : colorClasses[action.color].disabled}
            ${action.available ? colorClasses[action.color].hover : 'cursor-not-allowed'}
            text-white rounded-xl p-6 
            ${action.available ? 'hover:shadow-lg' : 'opacity-60'}
            transition-all group text-left
            relative overflow-hidden
          `}
        >
          {/* Badge "Bientôt disponible" */}
          {action.comingSoon && (
            <div className="absolute top-2 right-2">
              <span className="text-xs px-2 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                Bientôt
              </span>
            </div>
          )}

          <action.icon className="h-8 w-8 mb-3 opacity-90" />
          <h3 className="text-lg font-bold mb-1">{action.title}</h3>
          <p className="text-sm opacity-90">{action.description}</p>
          
          {action.available && (
            <div className="mt-4 flex items-center text-sm font-medium">
              <span>Accéder</span>
              <svg 
                className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          {action.comingSoon && (
            <div className="mt-4 flex items-center text-sm opacity-75">
              <Lock className="h-4 w-4 mr-2" />
              <span>En développement</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default ImmeubleNavigationCards;
