import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Coins, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import { transactionsService, decomptesService } from '../../services/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function SituationProprietaires({ immeubleId, proprietaires, annee: initialAnnee }) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(initialAnnee || currentYear);
  const [loading, setLoading] = useState(true);
  const [situations, setSituations] = useState([]);
  const [stats, setStats] = useState(null);
  const [decompte, setDecompte] = useState(null);
  const [exercices, setExercices] = useState([]);
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

  useEffect(() => {
    loadExercices();
  }, [immeubleId]);

  useEffect(() => {
    loadSituation();
  }, [immeubleId, annee, proprietaires]);

  // ✅ CORRECTION: Charger les exercices disponibles pour cet immeuble
  const loadExercices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/immeubles/${immeubleId}/exercices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const exercicesData = response.data.exercices || [];
      setExercices(exercicesData);
      
      // Extraire les années disponibles et les trier (plus récent en premier)
      const annees = exercicesData.map(ex => parseInt(ex.annee)).sort((a, b) => b - a);
      setAnneesDisponibles(annees);
      
      // Si l'année initiale n'est pas dans les exercices, prendre la plus récente
      if (annees.length > 0 && !annees.includes(annee)) {
        setAnnee(annees[0]);
      }
    } catch (err) {
      console.error('Error loading exercices:', err);
      // En cas d'erreur, garder l'année courante
      setAnneesDisponibles([currentYear]);
    }
  };

  const loadSituation = async () => {
    try {
      setLoading(true);
      
      // Charger les stats de transactions pour l'immeuble
      let transactionsStats = null;
      try {
        const statsRes = await transactionsService.getStats(immeubleId);
        transactionsStats = statsRes.data.stats;
        setStats(transactionsStats);
      } catch (e) {
        console.log('Stats not available');
      }

      // Pour le moment, calculer une situation basique basée sur les millièmes
      // Dans une version complète, cela viendrait du backend avec les vraies données
      const totalCharges = transactionsStats?.totalCharges || 0;
      const totalVersements = transactionsStats?.totalVersements || 0;

      // Calculer la situation de chaque propriétaire
      const totalParts = proprietaires.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
      
      const situationsCalculees = proprietaires.map(prop => {
        const parts = prop.nombre_parts || prop.milliemes || 0;
        const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;
        
        // Répartir les charges selon les millièmes
        const chargesProprietaire = totalCharges * pourcentage;
        
        // Pour les versements, on devrait avoir les versements réels par propriétaire
        // Ici on simule avec une répartition égale (à remplacer par les vraies données)
        const versementsProprietaire = 0; // À calculer depuis les vraies transactions
        
        const soldeFinal = versementsProprietaire - chargesProprietaire;
        
        return {
          id: prop.id,
          nom: `${prop.prenom || ''} ${prop.nom}`.trim(),
          milliemes: parts,
          totalMilliemes: totalParts,
          pourcentage: (pourcentage * 100).toFixed(2),
          soldeDebut: 0, // À implémenter : solde de l'année précédente
          charges: chargesProprietaire,
          versements: versementsProprietaire,
          frais: 0, // Frais de retard, etc.
          soldeFinal: soldeFinal,
          statut: soldeFinal >= 0 ? 'a_jour' : 'attention'
        };
      });

      setSituations(situationsCalculees);
      
    } catch (err) {
      console.error('Error loading situation:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant || 0);
  };

  // ✅ CORRECTION: Navigation entre années basée sur les exercices disponibles
  const navigateYear = (direction) => {
    const currentIndex = anneesDisponibles.indexOf(annee);
    
    if (direction === 'prev') {
      // Année précédente = index suivant (car trié décroissant)
      if (currentIndex < anneesDisponibles.length - 1) {
        setAnnee(anneesDisponibles[currentIndex + 1]);
      }
    } else {
      // Année suivante = index précédent
      if (currentIndex > 0) {
        setAnnee(anneesDisponibles[currentIndex - 1]);
      }
    }
  };

  // ✅ CORRECTION: Vérifier si la navigation est possible
  const canNavigatePrev = () => {
    const currentIndex = anneesDisponibles.indexOf(annee);
    return currentIndex < anneesDisponibles.length - 1;
  };

  const canNavigateNext = () => {
    const currentIndex = anneesDisponibles.indexOf(annee);
    return currentIndex > 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (proprietaires.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <Coins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun propriétaire configuré</p>
        </div>
      </div>
    );
  }

  // Calculs totaux
  const totaux = situations.reduce((acc, s) => ({
    soldeDebut: acc.soldeDebut + s.soldeDebut,
    charges: acc.charges + s.charges,
    versements: acc.versements + s.versements,
    frais: acc.frais + s.frais,
    soldeFinal: acc.soldeFinal + s.soldeFinal
  }), { soldeDebut: 0, charges: 0, versements: 0, frais: 0, soldeFinal: 0 });

  const nbAJour = situations.filter(s => s.statut === 'a_jour').length;
  const nbAttention = situations.filter(s => s.statut === 'attention').length;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coins className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Situation des Propriétaires - {annee}
            </h3>
          </div>
          
          {/* ✅ CORRECTION: Navigation basée sur les exercices disponibles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateYear('prev')}
              disabled={!canNavigatePrev()}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title={canNavigatePrev() ? 'Année précédente' : 'Pas d\'exercice précédent'}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full font-medium">
              {annee}
            </span>
            <button
              onClick={() => navigateYear('next')}
              disabled={!canNavigateNext()}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title={canNavigateNext() ? 'Année suivante' : 'Pas d\'exercice suivant'}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Indicateur des années disponibles */}
        {anneesDisponibles.length > 1 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>
              Exercices disponibles : {anneesDisponibles.join(', ')}
            </span>
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total charges</p>
            <p className="text-lg font-bold text-red-600">{formatMontant(totaux.charges)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total versements</p>
            <p className="text-lg font-bold text-green-600">{formatMontant(totaux.versements)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">À jour</p>
            <p className="text-lg font-bold text-green-600">{nbAJour}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Attention</p>
            <p className="text-lg font-bold text-amber-600">{nbAttention}</p>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propriétaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Millièmes
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Solde début
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charges
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Versements
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frais
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Solde final
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {situations.map((situation) => (
              <tr 
                key={situation.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/proprietaires/${situation.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{situation.nom}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {situation.milliemes}/{situation.totalMilliemes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {formatMontant(situation.soldeDebut)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                  {formatMontant(situation.charges)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                  {formatMontant(situation.versements)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600">
                  {formatMontant(situation.frais)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                  situation.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatMontant(situation.soldeFinal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {situation.statut === 'a_jour' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      À jour
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Attention
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Footer totaux */}
          <tfoot className="bg-gray-50">
            <tr className="font-semibold">
              <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                TOTAL
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                -
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                {formatMontant(totaux.soldeDebut)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                {formatMontant(totaux.charges)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                {formatMontant(totaux.versements)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600">
                {formatMontant(totaux.frais)}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                totaux.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatMontant(totaux.soldeFinal)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                -
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer avec lien vers décomptes */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Données basées sur les transactions importées
          </p>
          <button
            onClick={() => navigate('/decomptes')}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700"
          >
            <FileText className="h-4 w-4 mr-1" />
            Voir les décomptes
          </button>
        </div>
      </div>
    </div>
  );
}

export default SituationProprietaires;
