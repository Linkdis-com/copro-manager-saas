import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Coins, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Search,
  Edit2,
  X,
  Save,
  UserCircle,
  Building2,
  Download,
  ExternalLink,
  Plus,
  ArrowRightLeft,
  Lock,
  Upload,
  User,
  Printer,
  History
} from 'lucide-react';
import { transactionsService, exercicesService } from '../../services/api';
import * as XLSX from 'xlsx';

// Tags disponibles pour les transactions
const TAGS_DISPONIBLES = [
  { value: 'recuperable_locataire', label: 'Récupérable Locataire', icon: '✅', color: 'bg-green-100 text-green-700' },
  { value: 'non_recuperable', label: 'Non Récupérable', icon: '❌', color: 'bg-red-100 text-red-700' },
  { value: 'eau', label: 'Eau', icon: '💧', color: 'bg-blue-100 text-blue-700' },
  { value: 'chauffage', label: 'Chauffage', icon: '🔥', color: 'bg-orange-100 text-orange-700' },
  { value: 'electricite', label: 'Électricité', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'entretien', label: 'Entretien', icon: '🔧', color: 'bg-gray-100 text-gray-700' },
  { value: 'ascenseur', label: 'Ascenseur', icon: '🛗', color: 'bg-purple-100 text-purple-700' },
  { value: 'assurance', label: 'Assurance', icon: '🛡️', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'frais_bancaires', label: 'Frais bancaires', icon: '🏦', color: 'bg-slate-100 text-slate-700' }
];

// Couleurs pour les propriétaires
const PROPRIETAIRE_COLORS = [
  { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' },
  { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
];

function ComptabiliteImmeuble({ immeubleId, proprietaires, immeubleNom = '', onNavigateToImport }) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  
  // ✅ CORRECTION: Années dynamiques au lieu de fixes
  const [availableYears, setAvailableYears] = useState([]);
  
  // State général
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  
  // State transactions
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionsByYear, setTransactionsByYear] = useState({});
  
  // State exercices et RAN
  const [exercices, setExercices] = useState([]);
  const [soldesRAN, setSoldesRAN] = useState({});
  
  // State Historique (bloc séparé)
  const [expandedRows, setExpandedRows] = useState({});
  const [showAllRepartitions, setShowAllRepartitions] = useState(false);
  
  // Filtres Historique
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // State Modal édition avec attribution propriétaire
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({ 
    description: '', 
    tags: [],
    proprietaire_id: null
  });
  const [saving, setSaving] = useState(false);

  // State détail propriétaire
  const [selectedProprietaire, setSelectedProprietaire] = useState(null);
  
  // State Modal clôture
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [clotureConfirmText, setClotureConfirmText] = useState('');

  // ✅ NOUVEAUX STATES pour création exercice
  const [showCreateExerciceModal, setShowCreateExerciceModal] = useState(false);
  const [newExerciceYear, setNewExerciceYear] = useState(currentYear);

  // ✅ NOUVEAUX STATES pour ajout transaction manuelle
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'charge',
    montant: '',
    proprietaire_id: null
  });

  useEffect(() => {
    loadData();
  }, [immeubleId]);

  useEffect(() => {
    loadExerciceForYear(selectedYear);
  }, [selectedYear, exercices]);

  // ✅ CORRECTION: Calculer les années disponibles dynamiquement
  useEffect(() => {
    const yearsSet = new Set();
    
    // Ajouter les années des transactions
    allTransactions.forEach(t => {
      const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
      if (dateField) {
        yearsSet.add(new Date(dateField).getFullYear());
      }
    });
    
    // Ajouter les années des exercices
    exercices.forEach(ex => {
      yearsSet.add(parseInt(ex.annee));
    });
    
// ✅ CORRIGÉ : Inclure aussi les 5 dernières années pour import historique
for (let y = currentYear - 5; y <= currentYear + 2; y++) {
  yearsSet.add(y);
}
    
    // Convertir en tableau trié (plus récent en premier)
    const yearsArray = Array.from(yearsSet).sort((a, b) => b - a);
    setAvailableYears(yearsArray);
    
    // Sélectionner l'année courante si pas encore sélectionnée
    if (!yearsArray.includes(selectedYear) && yearsArray.length > 0) {
      setSelectedYear(currentYear);
    }
  }, [allTransactions, exercices, currentYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [transRes, exercicesRes] = await Promise.all([
        transactionsService.getAll(immeubleId, { limit: 1000 }),
        exercicesService.getAll(immeubleId).catch(() => ({ data: { exercices: [] } }))
      ]);
      
      const transactions = transRes.data.transactions || [];
      setAllTransactions(transactions);
      setExercices(exercicesRes.data.exercices || []);
      
      // ✅ CORRECTION: Grouper par année dynamiquement
      const byYear = {};
      const tempYears = Array.from(new Set([
        ...transactions.map(t => {
          const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
          return dateField ? new Date(dateField).getFullYear() : null;
        }).filter(Boolean),
        currentYear,
        currentYear + 1,
        currentYear + 2
      ]));

      tempYears.forEach(year => {
        byYear[year] = transactions.filter(t => {
          const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
          if (!dateField) return false;
          return new Date(dateField).getFullYear() === year;
        });
      });
      setTransactionsByYear(byYear);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setAllTransactions([]);
      setTransactionsByYear({});
      setExercices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExerciceForYear = async (year) => {
    const exercice = exercices.find(e => e.annee === year);
    
    if (exercice) {
      try {
        const res = await exercicesService.getOne(immeubleId, exercice.id);
        const soldes = res.data.exercice?.soldes || [];
        const ranMap = {};
        soldes.forEach(s => {
          ranMap[s.proprietaire_id] = parseFloat(s.solde_debut || 0);
        });
        setSoldesRAN(ranMap);
      } catch (err) {
        console.error('Error loading exercice details:', err);
        setSoldesRAN({});
      }
    } else {
      setSoldesRAN({});
    }
  };

  const hasExerciceForYear = (year) => exercices.some(e => e.annee === year);
  const getExerciceForYear = (year) => exercices.find(e => e.annee === year);
  const isFutureYear = (year) => year > currentYear;

  // ✅ NOUVELLE FONCTION : Créer exercice (remplace confirm())
  const handleCreateExercice = async (year) => {
    try {
      setSaving(true);
      await exercicesService.create(immeubleId, {
        annee: year,
        dateDebut: `${year}-01-01`,
        dateFin: `${year}-12-31`,
        budgetPrevisionnel: 0
      });
      
      const exercicesRes = await exercicesService.getAll(immeubleId);
      setExercices(exercicesRes.data.exercices || []);
      setSelectedYear(year);
      setShowCreateExerciceModal(false);
      
    } catch (err) {
      console.error('Error creating exercice:', err);
      alert(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleCloturerExercice = async () => {
    const exercice = getExerciceForYear(selectedYear);
    if (!exercice) return;
    
    const expectedText = `CLOTURER ${selectedYear}`;
    if (clotureConfirmText !== expectedText) return;
    
    try {
      setSaving(true);
      await exercicesService.cloturer(immeubleId, exercice.id);
      setShowClotureModal(false);
      setClotureConfirmText('');
      
      const exercicesRes = await exercicesService.getAll(immeubleId);
      setExercices(exercicesRes.data.exercices || []);
    } catch (err) {
      console.error('Error closing exercice:', err);
      alert(err.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setSaving(false);
    }
  };

  // Transactions de l'année sélectionnée
  const transactionsForYear = useMemo(() => {
    return transactionsByYear[selectedYear] || [];
  }, [transactionsByYear, selectedYear]);

  // Vérifier si une transaction est des frais bancaires
  const isFrais = (transaction) => {
    const description = (transaction.description || transaction.communication || '').toLowerCase();
    return description.includes('frais') || 
           description.includes('non-execute') || 
           description.includes('non execute') ||
           description.includes('participation aux frais');
  };

  const getDisplayType = (transaction) => {
    if (transaction.type === 'charge') {
      if (isFrais(transaction)) return 'frais';
      return 'charge';
    }
    return 'depot';
  };

  // Trouver le propriétaire pour une transaction
  const findProprietaireForTransaction = (transaction) => {
    if (transaction.proprietaire_id) {
      return proprietaires.find(p => p.id === transaction.proprietaire_id);
    }
    
    const displayType = getDisplayType(transaction);
    if (displayType !== 'depot') return null;
    
    const contrepartie = (transaction.nom_contrepartie || '').toLowerCase();
    const communication = (transaction.communication || transaction.description || '').toLowerCase();
    
    for (const prop of proprietaires) {
      const nomLower = prop.nom.toLowerCase();
      const prenomLower = (prop.prenom || '').toLowerCase();
      const fullName = `${prenomLower} ${nomLower}`.trim();
      
      if (contrepartie.includes(nomLower) || 
          communication.includes(nomLower) ||
          contrepartie.includes(fullName) ||
          communication.includes(fullName)) {
        return prop;
      }
    }
    return null;
  };

  // Calculer les situations avec RAN
  const situations = useMemo(() => {
    const totalParts = proprietaires.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
    
    const totalCharges = transactionsForYear
      .filter(t => t.type === 'charge' && !isFrais(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
    
    const totalFrais = transactionsForYear
      .filter(t => t.type === 'charge' && isFrais(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
    
    return proprietaires.map((prop, index) => {
      const parts = prop.nombre_parts || prop.milliemes || 0;
      const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;
      
      const chargesProprietaire = totalCharges * pourcentage;
      const fraisProprietaire = totalFrais * pourcentage;
      
      const depotsProprietaire = transactionsForYear
        .filter(t => {
          if (t.type === 'charge') return false;
          const foundProp = findProprietaireForTransaction(t);
          return foundProp && foundProp.id === prop.id;
        })
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
      
      const soldeDebut = soldesRAN[prop.id] || 0;
      const soldeFinal = soldeDebut + depotsProprietaire - chargesProprietaire - fraisProprietaire;
      
      return {
        id: prop.id,
        nom: `${prop.prenom || ''} ${prop.nom}`.trim(),
        email: prop.email,
        telephone: prop.telephone,
        milliemes: parts,
        totalMilliemes: totalParts,
        pourcentage: (pourcentage * 100).toFixed(2),
        soldeDebut: soldeDebut,
        charges: chargesProprietaire,
        depots: depotsProprietaire,
        frais: fraisProprietaire,
        soldeFinal: soldeFinal,
        statut: soldeFinal >= 0 ? 'a_jour' : 'attention',
        color: PROPRIETAIRE_COLORS[index % PROPRIETAIRE_COLORS.length]
      };
    });
  }, [transactionsForYear, proprietaires, soldesRAN]);

  // Totaux
  const totaux = useMemo(() => {
    return situations.reduce((acc, s) => ({
      soldeDebut: acc.soldeDebut + s.soldeDebut,
      charges: acc.charges + s.charges,
      depots: acc.depots + s.depots,
      frais: acc.frais + s.frais,
      soldeFinal: acc.soldeFinal + s.soldeFinal
    }), { soldeDebut: 0, charges: 0, depots: 0, frais: 0, soldeFinal: 0 });
  }, [situations]);

  // Transactions filtrées pour un propriétaire spécifique
  const getTransactionsForProprietaire = (propId) => {
    return transactionsForYear.filter(t => {
      const displayType = getDisplayType(t);
      if (displayType === 'charge' || displayType === 'frais') return true;
      const foundProp = findProprietaireForTransaction(t);
      return foundProp && foundProp.id === propId;
    });
  };

  // Calculer la répartition
  const calculateRepartition = (transaction) => {
    const totalParts = proprietaires.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
    const montant = Math.abs(parseFloat(transaction.montant || 0));
    
    return proprietaires.map((prop, index) => {
      const parts = prop.nombre_parts || prop.milliemes || 0;
      const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;
      return {
        id: prop.id,
        nom: `${prop.prenom || ''} ${prop.nom}`.trim(),
        montant: montant * pourcentage,
        color: PROPRIETAIRE_COLORS[index % PROPRIETAIRE_COLORS.length]
      };
    });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant || 0) + ' €';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-BE');
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtrer les transactions pour l'historique
  const filteredTransactions = useMemo(() => {
    let filtered = transactionsForYear;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(t => getDisplayType(t) === filterType);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const description = (t.description || t.communication || '').toLowerCase();
        const contrepartie = (t.nom_contrepartie || '').toLowerCase();
        return description.includes(search) || contrepartie.includes(search);
      });
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date_transaction || a.date_comptabilisation || a.created_at);
      const dateB = new Date(b.date_transaction || b.date_comptabilisation || b.created_at);
      return dateB - dateA;
    });
  }, [transactionsForYear, filterType, searchTerm]);

  // Export Excel
  const exportExcel = () => {
    const data = filteredTransactions.map(t => {
      const displayType = getDisplayType(t);
      const montant = Math.abs(parseFloat(t.montant || 0));
      const dateField = t.date_transaction || t.date_comptabilisation;
      const prop = findProprietaireForTransaction(t);
      return {
        'Date': formatDate(dateField),
        'Description': t.description || t.communication || '',
        'Type': displayType === 'depot' ? 'Dépôt' : displayType === 'frais' ? 'Frais' : 'Charge',
        'Contrepartie': t.nom_contrepartie || '',
        'Propriétaire': prop ? `${prop.prenom || ''} ${prop.nom}`.trim() : '-',
        'Montant': displayType === 'depot' ? montant : -montant
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Historique_${selectedYear}`.substring(0, 31));
    XLSX.writeFile(wb, `Historique_${selectedYear}.xlsx`);
  };

  // Handlers édition
  const handleEdit = (transaction, e) => {
    e.stopPropagation();
    const prop = findProprietaireForTransaction(transaction);
    setEditingTransaction(transaction);
    setEditForm({
      description: transaction.description || transaction.communication || '',
      tags: transaction.tags || [],
      proprietaire_id: transaction.proprietaire_id || (prop ? prop.id : null)
    });
  };

  const toggleTag = (tagValue) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagValue)
        ? prev.tags.filter(t => t !== tagValue)
        : [...prev.tags, tagValue]
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    
    try {
      setSaving(true);
      await transactionsService.update(immeubleId, editingTransaction.id, {
        tags: editForm.tags,
        proprietaire_id: editForm.proprietaire_id
      });
      
      await loadData();
      setEditingTransaction(null);
    } catch (err) {
      console.error('Error saving:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getTypeBadge = (transaction) => {
    const displayType = getDisplayType(transaction);
    if (displayType === 'depot') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Dépôt</span>;
    } else if (displayType === 'frais') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Frais</span>;
    } else {
      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Charge</span>;
    }
  };

  const renderTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {tags.map(tag => {
          const tagInfo = TAGS_DISPONIBLES.find(t => t.value === tag);
          if (!tagInfo) return null;
          return (
            <span key={tag} className={`text-xs px-1 py-0.5 rounded ${tagInfo.color}`}>
              {tagInfo.icon}
            </span>
          );
        })}
      </div>
    );
  };

  // Navigation vers page détail propriétaire
  const navigateToProprietaireDetail = (propId) => {
    navigate(`/immeubles/${immeubleId}/proprietaires/${propId}`);
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

  const nbAJour = situations.filter(s => s.statut === 'a_jour').length;
  const nbAttention = situations.filter(s => s.statut === 'attention').length;
  const currentExercice = getExerciceForYear(selectedYear);
  const hasRAN = Object.keys(soldesRAN).length > 0;

  return (
    <div className="space-y-4">
      {/* ==================== BLOC COMPTABILITÉ (Situation) ==================== */}
      <div className="bg-white rounded-lg shadow">
        {/* Header compact */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-900">Comptabilité</h3>
            </div>
          
          </div>
        </div>

        {/* ✅ NOUVEAU : Années avec navigation ←→ */}
        <div className="border-b bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Navigation gauche */}
            <button
              onClick={() => {
                const minYear = Math.min(...availableYears);
                if (!availableYears.includes(minYear - 1)) {
                  setAvailableYears(prev => [minYear - 1, ...prev].sort((a, b) => b - a));
                }
              }}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600"
              title="Années antérieures"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Années visibles (max 6) */}
            <div className="flex items-center gap-1 overflow-hidden flex-1 justify-center">
              {availableYears.slice(0, 6).map(year => {
                const hasExercice = hasExerciceForYear(year);
                const exercice = getExerciceForYear(year);
                const isCloture = exercice?.statut === 'cloture';
                const isFuture = isFutureYear(year);
                const yearTransactions = transactionsByYear[year] || [];
                
                return (
                  <button
                    key={year}
                    onClick={() => {
                        setSelectedYear(year);
                        setSelectedProprietaire(null);
                      }}
                    className={`relative px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                      selectedYear === year
                        ? 'bg-primary-600 text-white shadow-sm'
                        : hasExercice
                          ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300 hover:border-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {year}
                    {hasExercice && (
                      <span className={`ml-1.5 text-xs ${selectedYear === year ? 'text-white/70' : 'text-gray-400'}`}>
                        {yearTransactions.length}
                      </span>
                    )}
                    {isCloture && (
                      <Lock className={`inline ml-1 h-3 w-3 ${selectedYear === year ? 'text-white/70' : 'text-green-500'}`} />
                    )}
                    {!hasExercice && (
                      <Plus className="inline ml-1 h-3 w-3" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation droite */}
            <button
              onClick={() => {
                const maxYear = Math.max(...availableYears);
                if (!availableYears.includes(maxYear + 1)) {
                  setAvailableYears(prev => [...prev, maxYear + 1].sort((a, b) => b - a));
                }
              }}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600"
              title="Années futures"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* ✅ NOUVEAU : Bouton créer exercice */}
            <button
              onClick={() => {
                setNewExerciceYear(currentYear);
                setShowCreateExerciceModal(true);
              }}
              className="flex items-center gap-1 px-2 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              title="Créer un nouvel exercice"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Exercice</span>
            </button>

            {/* Bouton clôturer (si exercice ouvert) */}
            {currentExercice && currentExercice.statut === 'ouvert' && (
              <button
                onClick={() => setShowClotureModal(true)}
                className="ml-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                Clôturer
              </button>
            )}
          </div>
        </div>

        {/* Vue Situation ou Détail Propriétaire */}
        {!selectedProprietaire ? (
          <div>
            {/* Bannière exercice clôturé */}
            {currentExercice?.statut === 'cloture' && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-amber-800">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Exercice {selectedYear} clôturé - Les transactions ne peuvent plus être modifiées
                </span>
              </div>
            )}
            
            {/* Stats compactes */}
            <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 border-b text-center">
              {hasRAN && (
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-xs text-gray-500">RAN</p>
                  <p className={`text-sm font-bold ${totaux.soldeDebut >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatMontant(totaux.soldeDebut)}
                  </p>
                </div>
              )}
              <div className="p-2 bg-red-50 rounded">
                <p className="text-xs text-gray-500">Charges</p>
                <p className="text-sm font-bold text-red-600">{formatMontant(totaux.charges)}</p>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <p className="text-xs text-gray-500">Dépôts</p>
                <p className="text-sm font-bold text-green-600">{formatMontant(totaux.depots)}</p>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <p className="text-xs text-gray-500">À jour</p>
                <p className="text-sm font-bold text-green-600">{nbAJour}</p>
              </div>
              <div className="p-2 bg-amber-50 rounded">
                <p className="text-xs text-gray-500">Attention</p>
                <p className="text-sm font-bold text-amber-600">{nbAttention}</p>
              </div>
            </div>

            {/* Tableau propriétaires */}
            {proprietaires.length === 0 ? (
              <div className="p-6 text-center">
                <UserCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Aucun propriétaire configuré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Propriétaire</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">Millièmes</th>
                      {hasRAN && (
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">
                          <ArrowRightLeft className="h-3 w-3 inline mr-1" />RAN
                        </th>
                      )}
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Charges</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Dépôts</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Solde</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {situations.map((s) => (
                      <tr 
                        key={s.id} 
                        onClick={() => setSelectedProprietaire(s)}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          s.soldeFinal < -100 ? 'bg-red-50/50' : s.soldeFinal < 0 ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-1 h-6 rounded-full ${s.color.border.replace('border-l-', 'bg-')}`}></div>
                            <span className="font-medium text-gray-900">{s.nom}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {s.milliemes}/{s.totalMilliemes} ({s.pourcentage}%)
                        </td>
                        {hasRAN && (
                          <td className={`px-3 py-2 text-right font-medium ${s.soldeDebut >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatMontant(s.soldeDebut)}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right text-red-600">{formatMontant(s.charges)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatMontant(s.depots)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${s.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMontant(s.soldeFinal)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {s.statut === 'a_jour' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-0.5" />OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                              <AlertTriangle className="h-3 w-3 mr-0.5" />!
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Détail propriétaire */
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setSelectedProprietaire(null)}
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Retour
              </button>
              <button
                onClick={() => navigateToProprietaireDetail(selectedProprietaire.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 border border-primary-200 rounded hover:bg-primary-50"
              >
                <ExternalLink className="h-3 w-3" />
                Voir fiche complète
              </button>
            </div>
            
            <div className={`p-3 rounded-lg border-l-4 ${selectedProprietaire.color.border} ${selectedProprietaire.color.bg} mb-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedProprietaire.nom}</h4>
                  <p className="text-xs text-gray-600">
                    {selectedProprietaire.milliemes}/{selectedProprietaire.totalMilliemes} millièmes ({selectedProprietaire.pourcentage}%)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Solde {selectedYear}</p>
                  <p className={`text-lg font-bold ${selectedProprietaire.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMontant(selectedProprietaire.soldeFinal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Calcul détaillé */}
            <div className="bg-gray-50 rounded p-3 mb-3 text-sm font-mono">
              <div className="grid grid-cols-2 gap-1">
                {hasRAN && (
                  <>
                    <span className="text-gray-600">Report (RAN)</span>
                    <span className={`text-right ${selectedProprietaire.soldeDebut >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatMontant(selectedProprietaire.soldeDebut)}
                    </span>
                  </>
                )}
                <span className="text-gray-600">+ Dépôts</span>
                <span className="text-right text-green-600">+{formatMontant(selectedProprietaire.depots)}</span>
                <span className="text-gray-600">- Charges</span>
                <span className="text-right text-red-600">-{formatMontant(selectedProprietaire.charges)}</span>
                <span className="text-gray-600">- Frais</span>
                <span className="text-right text-amber-600">-{formatMontant(selectedProprietaire.frais)}</span>
                <span className="font-bold border-t pt-1">= SOLDE</span>
                <span className={`text-right font-bold border-t pt-1 ${selectedProprietaire.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMontant(selectedProprietaire.soldeFinal)}
                </span>
              </div>
            </div>

            {/* Aperçu mouvements avec lien cliquable */}
            {(() => {
              const propTransactions = getTransactionsForProprietaire(selectedProprietaire.id)
                .sort((a, b) => new Date(b.date_transaction || b.date_comptabilisation) - new Date(a.date_transaction || a.date_comptabilisation));
              const displayCount = 5;
              const hasMore = propTransactions.length > displayCount;
              
              return (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Derniers mouvements ({propTransactions.length})
                  </h5>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500">Date</th>
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500">Description</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-500">Type</th>
                          <th className="px-2 py-1.5 text-right font-medium text-gray-500">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {propTransactions.slice(0, displayCount).map(t => {
                          const displayType = getDisplayType(t);
                          const montant = Math.abs(parseFloat(t.montant || 0));
                          const dateField = t.date_transaction || t.date_comptabilisation;
                          const isChargeOrFrais = displayType === 'charge' || displayType === 'frais';
                          const partMontant = isChargeOrFrais 
                            ? montant * (selectedProprietaire.milliemes / selectedProprietaire.totalMilliemes)
                            : montant;
                          
                          return (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{formatDate(dateField)}</td>
                              <td className="px-2 py-1.5">
                                <div className="truncate max-w-[200px]" title={t.description || t.communication}>
                                  {t.description || t.communication || '-'}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center">{getTypeBadge(t)}</td>
                              <td className={`px-2 py-1.5 text-right font-medium whitespace-nowrap ${
                                displayType === 'depot' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {displayType === 'depot' ? '+' : '-'}{formatMontant(partMontant)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hasMore && (
                      <button
                        onClick={() => navigateToProprietaireDetail(selectedProprietaire.id)}
                        className="w-full p-2 text-center text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                      >
                        + {propTransactions.length - displayCount} autres mouvements →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ==================== BLOC HISTORIQUE (séparé) ==================== */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-gray-900">Historique {selectedYear}</h3>
              <span className="text-sm text-gray-500">({filteredTransactions.length} mouvements)</span>
            </div>
            
            <button onClick={exportExcel} className="flex items-center gap-1 px-2 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Excel
            </button>
          </div>
        </div>

        {/* Filtres + ✅ NOUVEAU Bouton Ajouter */}
        <div className="p-3 border-b flex flex-wrap gap-2 items-center bg-gray-50">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-lg"
          >
            <option value="all">Tout</option>
            <option value="charge">Charges</option>
            <option value="frais">Frais</option>
            <option value="depot">Dépôts</option>
          </select>
          
          {/* ✅ NOUVEAU : Bouton ajouter transaction */}
          {currentExercice?.statut !== 'cloture' && (
  <button
    onClick={() => setShowAddTransactionModal(true)}
    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
  >
    <Plus className="h-4 w-4" />
    <span className="hidden sm:inline">Ajouter</span>
  </button>
)}
{onNavigateToImport && (
  <button
    onClick={onNavigateToImport}
    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
  >
    <Upload className="h-4 w-4" />
    <span className="hidden sm:inline">Importer</span>
  </button>
)}
        </div>

        {/* Tableau transactions */}
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs sticky top-0">
              <tr>
                <th className="w-6 px-1"></th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Date</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Description</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500">Type</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Contrepartie</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Montant</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    Aucune transaction pour {selectedYear}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const montant = Math.abs(parseFloat(t.montant || 0));
                  const displayType = getDisplayType(t);
                  const isExpandable = displayType === 'charge' || displayType === 'frais';
                  const dateField = t.date_transaction || t.date_comptabilisation;
                  const prop = findProprietaireForTransaction(t);
                  const contrepartie = displayType === 'depot' && prop 
                    ? `${prop.prenom || ''} ${prop.nom}`.trim()
                    : (t.nom_contrepartie || '-');
                  
                  return (
                    <React.Fragment key={t.id}>
                      <tr className={`hover:bg-gray-50 ${
                        displayType === 'charge' ? 'bg-red-50/30' : 
                        displayType === 'frais' ? 'bg-amber-50/30' : 'bg-green-50/30'
                      }`}>
                        <td className="px-1 py-2">
                          {isExpandable && (
                            <button onClick={() => toggleRow(t.id)} className="p-0.5 rounded hover:bg-gray-200">
                              {expandedRows[t.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{formatDate(dateField)}</td>
                        <td className="px-2 py-2">
                          <div className="truncate max-w-[250px]" title={t.description || t.communication}>
                            {t.description || t.communication || '-'}
                          </div>
                          {renderTags(t.tags)}
                        </td>
                        <td className="px-2 py-2 text-center">{getTypeBadge(t)}</td>
                        <td className="px-2 py-2 text-gray-600 truncate max-w-[120px]">{contrepartie}</td>
                        <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${
                          displayType === 'depot' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {displayType === 'depot' ? '+' : '-'}{formatMontant(montant)}
                        </td>
                        <td className="px-2 py-2">
                          {currentExercice?.statut !== 'cloture' ? (
                            <button onClick={(e) => handleEdit(t, e)} className="p-1 text-orange-500 hover:bg-orange-50 rounded">
                              <Edit2 className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="p-1 text-gray-300" title="Exercice clôturé">
                              <Lock className="h-3 w-3" />
                            </span>
                          )}
                        </td>
                      </tr>
                      
                      {expandedRows[t.id] && isExpandable && (
                        <tr className="bg-gray-50">
                          <td colSpan="7" className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {calculateRepartition(t).map(rep => (
                                <div key={rep.id} className={`px-2 py-1 rounded border-l-2 ${rep.color.border} ${rep.color.bg} text-xs`}>
                                  <span className="text-gray-600">{rep.nom}:</span>
                                  <span className={`ml-1 font-medium ${rep.color.text}`}>{formatMontant(rep.montant)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL CRÉATION EXERCICE ==================== */}
      {showCreateExerciceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Créer l'exercice {newExerciceYear}
                </h2>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Créer un nouvel exercice comptable pour l'année {newExerciceYear}. 
                Les soldes de {newExerciceYear - 1} seront automatiquement reportés (RAN).
              </p>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Période : 01/01/{newExerciceYear} - 31/12/{newExerciceYear}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleCreateExercice(newExerciceYear);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Création...' : 'Créer l\'exercice'}
                </button>
                <button
                  onClick={() => setShowCreateExerciceModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL AJOUTER TRANSACTION ==================== */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary-600" />
                  Ajouter une transaction
                </h2>
                <button
                  onClick={() => setShowAddTransactionModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={newTransaction.type}
                    onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="charge">Charge</option>
                    <option value="depot">Dépôt</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="Ex: Réparation ascenseur, Provision trimestrielle..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Montant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.montant}
                    onChange={(e) => setNewTransaction({ ...newTransaction, montant: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Propriétaire (si dépôt) */}
                {newTransaction.type === 'depot' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Propriétaire
                    </label>
                    <select
                      value={newTransaction.proprietaire_id || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, proprietaire_id: e.target.value || null })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Non attribué --</option>
                      {proprietaires.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.prenom} {p.nom}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Optionnel - Permet d'identifier le propriétaire qui a effectué le dépôt
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await transactionsService.create(immeubleId, {
                        dateTransaction: newTransaction.date,
                        description: newTransaction.description,
                        type: newTransaction.type === 'depot' ? 'versement' : newTransaction.type,
                        montant: newTransaction.type === 'depot' 
                          ? Math.abs(parseFloat(newTransaction.montant))
                          : -Math.abs(parseFloat(newTransaction.montant)),
                        proprietaire_id: newTransaction.proprietaire_id
                      });
                      
                      setShowAddTransactionModal(false);
                      setNewTransaction({
                        date: new Date().toISOString().split('T')[0],
                        description: '',
                        type: 'charge',
                        montant: '',
                        proprietaire_id: null
                      });
                      await loadData();
                    } catch (err) {
                      console.error('Error creating transaction:', err);
                      alert('Erreur lors de la création');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving || !newTransaction.description || !newTransaction.montant}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                <button
                  onClick={() => setShowAddTransactionModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL ÉDITION ==================== */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-orange-500" />
                  Éditer transaction
                </h2>
                <button onClick={() => setEditingTransaction(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="px-3 py-2 border rounded bg-gray-50 text-sm text-gray-700">
                  {editForm.description || '-'}
                </div>
              </div>

              {getDisplayType(editingTransaction) === 'depot' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="h-4 w-4 inline mr-1" />
                    Attribuer à un propriétaire
                  </label>
                  <select
                    value={editForm.proprietaire_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, proprietaire_id: e.target.value || null })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Non attribué --</option>
                    {proprietaires.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.prenom || ''} {p.nom} ({p.nombre_parts || p.milliemes} millièmes)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Permet d'identifier correctement le dépôt si le nom n'est pas reconnu automatiquement.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {TAGS_DISPONIBLES.map(tag => (
                    <label
                      key={tag.value}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                        editForm.tags.includes(tag.value) ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.tags.includes(tag.value)}
                        onChange={() => toggleTag(tag.value)}
                        className="rounded border-gray-300 text-primary-600 h-4 w-4"
                      />
                      <span className="text-base">{tag.icon}</span>
                      <span className="text-sm">{tag.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Sauvegarder
                </button>
                <button onClick={() => setEditingTransaction(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CLÔTURE ==================== */}
      {showClotureModal && currentExercice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold">Clôturer {selectedYear}</h2>
              </div>
              
              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-600">Cette action va :</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Finaliser les soldes propriétaires</li>
                  <li>Empêcher les modifications</li>
                  <li>Reporter automatiquement les soldes vers {selectedYear + 1}</li>
                </ul>
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    <strong>Irréversible</strong> - Tapez <code className="bg-red-100 px-1 rounded">CLOTURER {selectedYear}</code>
                  </p>
                </div>
                
                <input
                  type="text"
                  value={clotureConfirmText}
                  onChange={(e) => setClotureConfirmText(e.target.value.toUpperCase())}
                  placeholder={`CLOTURER ${selectedYear}`}
                  className={`w-full px-3 py-2 border rounded-lg font-mono ${
                    clotureConfirmText === `CLOTURER ${selectedYear}` 
                      ? 'border-green-300 bg-green-50' 
                      : clotureConfirmText 
                        ? 'border-red-300 bg-red-50'
                        : ''
                  }`}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleCloturerExercice}
                  disabled={saving || clotureConfirmText !== `CLOTURER ${selectedYear}`}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Clôture...' : 'Confirmer'}
                </button>
                <button 
                  onClick={() => { setShowClotureModal(false); setClotureConfirmText(''); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComptabiliteImmeuble;
