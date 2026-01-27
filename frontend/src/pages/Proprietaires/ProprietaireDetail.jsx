import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Building2,
  Coins,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Printer,
  FileSpreadsheet,
  Home,
  Edit2,
  Users,
  ArrowRightLeft,
  X,
  Save
} from 'lucide-react';
import {
  proprietairesService,
  immeublesService,
  transactionsService,
  locatairesService,
  exercicesService
} from '../../services/api';
import * as XLSX from 'xlsx';

// Couleurs pour les propriétaires
const PROPRIETAIRE_COLORS = [
  { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', accent: 'cyan' },
  { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', accent: 'purple' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', accent: 'amber' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'emerald' },
  { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', accent: 'rose' },
  { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', accent: 'blue' },
  { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', accent: 'orange' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', accent: 'indigo' },
];

// ✅ FONCTIONS UTILITAIRES DÉFINIES EN PREMIER (hors du composant pour éviter les problèmes de hoisting)
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

function ProprietaireDetail() {
  const { id: immeubleId, propId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [immeuble, setImmeuble] = useState(null);
  const [proprietaire, setProprietaire] = useState(null);
  const [allProprietaires, setAllProprietaires] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [locataires, setLocataires] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [soldesRAN, setSoldesRAN] = useState({});
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedYears, setExpandedYears] = useState({});
  const [activeTab, setActiveTab] = useState('decompte');
  
  // Modal édition profil
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  const printRef = useRef(null);
  
  const [availableYears, setAvailableYears] = useState([]);

useEffect(() => {
  if (transactions.length > 0 || exercices.length > 0) {
    const yearsSet = new Set();
    
    // Extraire années des transactions
    transactions.forEach(t => {
      const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
      if (dateField) {
        yearsSet.add(new Date(dateField).getFullYear());
      }
    });
    
    // Extraire années des exercices
    exercices.forEach(ex => {
      yearsSet.add(parseInt(ex.annee));
    });
    
    // Trier: plus récent en premier
    const yearsArray = Array.from(yearsSet).sort((a, b) => b - a);
    setAvailableYears(yearsArray);
    
    // Sélectionner l'année la plus récente
    if (yearsArray.length > 0 && !yearsArray.includes(selectedYear)) {
      setSelectedYear(yearsArray[0]);
    }
  }
}, [transactions, exercices]);

  useEffect(() => {
    loadData();
  }, [immeubleId, propId]);

  useEffect(() => {
    loadRAN(selectedYear);
  }, [selectedYear, exercices]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [immeubleRes, proprietaireRes, allPropsRes, transRes, locatairesRes, exercicesRes] = await Promise.all([
        immeublesService.getOne(immeubleId),
        proprietairesService.getOne(immeubleId, propId),
        proprietairesService.getByImmeuble(immeubleId),
        transactionsService.getAll(immeubleId, { limit: 1000 }),
        locatairesService.getByImmeuble(immeubleId),
        exercicesService.getAll(immeubleId).catch(() => ({ data: { exercices: [] } }))
      ]);

      setImmeuble(immeubleRes.data.immeuble);
      setProprietaire(proprietaireRes.data.proprietaire);
      setAllProprietaires(allPropsRes.data.proprietaires || []);
      setTransactions(transRes.data.transactions || []);
      setLocataires(locatairesRes.data.locataires || []);
      setExercices(exercicesRes.data.exercices || []);
      
      // Initialiser le formulaire d'édition
      setEditForm(proprietaireRes.data.proprietaire || {});

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadRAN = async (year) => {
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
        setSoldesRAN({});
      }
    } else {
      setSoldesRAN({});
    }
  };

  // Sauvegarder les modifications du profil
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await proprietairesService.update(immeubleId, propId, editForm);
      setProprietaire(editForm);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Trouver l'index du propriétaire pour la couleur
  const proprietaireIndex = useMemo(() => {
    if (!proprietaire || !allProprietaires.length) return 0;
    const idx = allProprietaires.findIndex(p => p.id === proprietaire.id);
    return idx >= 0 ? idx : 0;
  }, [proprietaire, allProprietaires]);

  const color = PROPRIETAIRE_COLORS[proprietaireIndex % PROPRIETAIRE_COLORS.length];

  // Vérifier si une transaction est des frais
  const isFrais = (transaction) => {
    const description = (transaction.description || transaction.communication || '').toLowerCase();
    return description.includes('frais') ||
      description.includes('non-execute') ||
      description.includes('non execute') ||
      description.includes('participation aux frais');
  };

  // Vérifier si un dépôt appartient à ce propriétaire
  const isDepotForProprietaire = (transaction) => {
    if (!proprietaire) return false;
    if (transaction.type === 'charge') return false;
    
    // Vérifier proprietaire_id assigné
    if (transaction.proprietaire_id === proprietaire.id) return true;
    
    // Sinon vérifier par nom
    const contrepartie = (transaction.nom_contrepartie || '').toLowerCase();
    const communication = (transaction.communication || transaction.description || '').toLowerCase();
    const nomLower = proprietaire.nom.toLowerCase();
    const prenomLower = (proprietaire.prenom || '').toLowerCase();
    
    return contrepartie.includes(nomLower) || 
           communication.includes(nomLower) ||
           contrepartie.includes(`${prenomLower} ${nomLower}`) ||
           communication.includes(`${prenomLower} ${nomLower}`);
  };

  // Transactions FILTRÉES pour ce propriétaire uniquement
  const getFilteredTransactionsForYear = (year) => {
    return transactions.filter(t => {
      const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
      if (!dateField) return false;
      if (new Date(dateField).getFullYear() !== year) return false;
      
      // Charges/frais = concerné (part au prorata)
      if (t.type === 'charge') return true;
      
      // Dépôts = seulement si c'est le sien
      return isDepotForProprietaire(t);
    });
  };

  const transactionsForYear = useMemo(() => {
    return getFilteredTransactionsForYear(selectedYear);
  }, [transactions, selectedYear, proprietaire]);

  // Calculer la situation du propriétaire
  const calculateSituation = (year) => {
    if (!proprietaire || !allProprietaires.length) {
      return { charges: 0, depots: 0, frais: 0, soldeFinal: 0, ran: 0 };
    }

    const yearTransactions = getFilteredTransactionsForYear(year);
    const totalParts = allProprietaires.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
    const parts = proprietaire.nombre_parts || proprietaire.milliemes || 0;
    const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;

    // Charges communes (réparties au prorata)
    const totalCharges = yearTransactions
      .filter(t => t.type === 'charge' && !isFrais(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);

    // Frais bancaires (répartis au prorata)
    const totalFrais = yearTransactions
      .filter(t => t.type === 'charge' && isFrais(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);

    const chargesProprietaire = totalCharges * pourcentage;
    const fraisProprietaire = totalFrais * pourcentage;

    // Dépôts du propriétaire uniquement
    const depotsProprietaire = yearTransactions
      .filter(t => t.type !== 'charge' && isDepotForProprietaire(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);

    // RAN pour l'année courante
    const ran = year === selectedYear ? (soldesRAN[proprietaire.id] || 0) : 0;
    const soldeFinal = ran + depotsProprietaire - chargesProprietaire - fraisProprietaire;

    return {
      charges: chargesProprietaire,
      depots: depotsProprietaire,
      frais: fraisProprietaire,
      soldeFinal,
      ran,
      pourcentage: (pourcentage * 100).toFixed(2),
      parts,
      totalParts
    };
  };

  const situation = useMemo(() => calculateSituation(selectedYear), [selectedYear, transactionsForYear, soldesRAN, proprietaire, allProprietaires]);

  // Locataires du propriétaire
  const proprietaireLocataires = useMemo(() => {
    if (!proprietaire) return [];
    return locataires.filter(l => l.proprietaire_id === proprietaire.id);
  }, [locataires, proprietaire]);

  // Transactions détaillées pour affichage
  const proprietaireTransactions = useMemo(() => {
    if (!proprietaire) return [];

    const totalParts = allProprietaires.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
    const parts = proprietaire.nombre_parts || proprietaire.milliemes || 0;
    const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;

    return transactionsForYear.map(t => {
      const isCharge = t.type === 'charge';
      const montantTotal = Math.abs(parseFloat(t.montant || 0));
      const montantProprietaire = isCharge ? montantTotal * pourcentage : montantTotal;
      const displayType = isCharge ? (isFrais(t) ? 'Frais' : 'Charge') : 'Dépôt';

      return {
        ...t,
        type: isCharge ? (isFrais(t) ? 'frais' : 'charge') : 'depot',
        displayType,
        montantTotal: isCharge ? montantTotal : null,
        montantProprietaire,
        dateFormatted: formatDate(t.date_transaction || t.date_comptabilisation)
      };
    }).sort((a, b) => {
      const dateA = new Date(a.date_transaction || a.date_comptabilisation);
      const dateB = new Date(b.date_transaction || b.date_comptabilisation);
      return dateB - dateA;
    });
  }, [proprietaire, allProprietaires, transactionsForYear]);

  // Export Excel
  const exportExcel = () => {
    const data = proprietaireTransactions.map(t => ({
      'Date': t.dateFormatted,
      'Description': t.description || t.communication || '',
      'Type': t.displayType,
      'Montant total': t.montantTotal ? formatMontant(t.montantTotal) : '-',
      'Ma part': formatMontant(t.montantProprietaire)
    }));

    // Ajouter ligne récapitulative
    data.push({});
    data.push({
      'Date': '',
      'Description': 'RÉCAPITULATIF',
      'Type': '',
      'Montant total': '',
      'Ma part': ''
    });
    if (situation.ran !== 0) {
      data.push({ 'Date': '', 'Description': 'Report À Nouveau', 'Type': '', 'Montant total': '', 'Ma part': formatMontant(situation.ran) });
    }
    data.push({ 'Date': '', 'Description': 'Total Dépôts', 'Type': '', 'Montant total': '', 'Ma part': formatMontant(situation.depots) });
    data.push({ 'Date': '', 'Description': 'Total Charges', 'Type': '', 'Montant total': '', 'Ma part': formatMontant(-situation.charges) });
    data.push({ 'Date': '', 'Description': 'Total Frais', 'Type': '', 'Montant total': '', 'Ma part': formatMontant(-situation.frais) });
    data.push({ 'Date': '', 'Description': 'SOLDE FINAL', 'Type': '', 'Montant total': '', 'Ma part': formatMontant(situation.soldeFinal) });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Décompte ${selectedYear}`);
    XLSX.writeFile(wb, `decompte_${proprietaire.nom}_${selectedYear}.xlsx`);
  };

  // Export PDF (via impression)
  const exportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !proprietaire) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">{error || 'Propriétaire introuvable'}</h3>
        <button
          onClick={() => navigate(`/immeubles/${immeubleId}`)}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Retour à l'immeuble
        </button>
      </div>
    );
  }

  const hasRAN = situation.ran !== 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Style d'impression */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 no-print">
        <button
          onClick={() => navigate(`/immeubles/${immeubleId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Retour à l'immeuble</span>
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Edit2 className="h-4 w-4" />
            Modifier
          </button>
        </div>
      </div>

      {/* Carte profil */}
      <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color.border} p-4 sm:p-6 mb-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 ${color.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <UserCircle className={`h-8 w-8 ${color.text}`} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {proprietaire.prenom} {proprietaire.nom}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                {proprietaire.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {proprietaire.email}
                  </span>
                )}
                {proprietaire.telephone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {proprietaire.telephone}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color.bg} ${color.text}`}>
                  {situation.parts}/{situation.totalParts} millièmes ({situation.pourcentage}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Solde {selectedYear}</p>
            <p className={`text-2xl font-bold ${situation.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMontant(situation.soldeFinal)}
            </p>
            {situation.soldeFinal >= 0 ? (
              <span className="text-sm text-green-600 flex items-center justify-end gap-1">
                <CheckCircle className="h-4 w-4" /> À jour
              </span>
            ) : (
              <span className="text-sm text-red-600 flex items-center justify-end gap-1">
                <AlertTriangle className="h-4 w-4" /> À régulariser
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b flex no-print">
          <button
            onClick={() => setActiveTab('decompte')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'decompte'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Coins className="h-4 w-4 inline mr-2" />
            Décompte {selectedYear}
          </button>
          <button
            onClick={() => setActiveTab('historique')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'historique'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Historique
          </button>
          <button
            onClick={() => setActiveTab('locataires')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'locataires'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Locataires ({proprietaireLocataires.length})
          </button>
        </div>

        {/* Tab Décompte */}
        {activeTab === 'decompte' && (
          <div className="print-area" ref={printRef}>
            {/* Sélecteur année + Export */}
            <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Année :</span>
                <div className="flex gap-1">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        selectedYear === year
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border hover:bg-gray-100'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100">
                  <Printer className="h-4 w-4" />
                  PDF
                </button>
              </div>
            </div>

            {/* En-tête impression */}
            <div className="hidden print:block p-6 border-b">
              <h1 className="text-xl font-bold">Décompte Annuel {selectedYear}</h1>
              <p className="text-gray-600">{proprietaire.prenom} {proprietaire.nom} - {immeuble?.nom}</p>
              <p className="text-sm text-gray-500">{situation.parts}/{situation.totalParts} millièmes ({situation.pourcentage}%)</p>
            </div>

            {/* Récapitulatif */}
            <div className="p-4 sm:p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Récapitulatif {selectedYear}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {hasRAN && (
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500">Report (RAN)</p>
                      <p className={`font-bold ${situation.ran >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatMontant(situation.ran)}
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Dépôts</p>
                    <p className="font-bold text-green-600">+{formatMontant(situation.depots)}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Charges</p>
                    <p className="font-bold text-red-600">-{formatMontant(situation.charges)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Frais</p>
                    <p className="font-bold text-amber-600">-{formatMontant(situation.frais)}</p>
                  </div>
                </div>
                
                {/* Calcul visible */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-mono">
                    {hasRAN && (
                      <>
                        <span className={situation.ran >= 0 ? 'text-blue-600' : 'text-orange-600'}>{formatMontant(situation.ran)}</span>
                        <span>+</span>
                      </>
                    )}
                    <span className="text-green-600">{formatMontant(situation.depots)}</span>
                    <span>-</span>
                    <span className="text-red-600">{formatMontant(situation.charges + situation.frais)}</span>
                    <span>=</span>
                    <span className={`font-bold text-lg ${situation.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMontant(situation.soldeFinal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tableau des mouvements */}
              <h3 className="font-medium text-gray-700 mb-3">Détail des mouvements ({proprietaireTransactions.length})</h3>
              
              {proprietaireTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Aucun mouvement pour {selectedYear}</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500">Type</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Ma part</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {proprietaireTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{t.dateFormatted}</td>
                          <td className="px-3 py-2">
                            <div className="truncate max-w-[250px]" title={t.description || t.communication}>
                              {t.description || t.communication || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              t.type === 'depot' ? 'bg-green-100 text-green-700' :
                              t.type === 'frais' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {t.displayType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {t.montantTotal ? formatMontant(t.montantTotal) : '-'}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${
                            t.type === 'depot' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {t.type === 'depot' ? '+' : '-'}{formatMontant(t.montantProprietaire)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr className="font-semibold">
                        <td colSpan="4" className="px-3 py-2 text-right">SOLDE FINAL</td>
                        <td className={`px-3 py-2 text-right ${situation.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMontant(situation.soldeFinal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Pied de page impression */}
              <div className="hidden print:block mt-8 pt-4 border-t text-sm text-gray-500">
                <p>Document généré le {new Date().toLocaleDateString('fr-BE')} - Copro Manager</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Historique */}
        {activeTab === 'historique' && (
          <div className="p-4 sm:p-6">
            <h3 className="font-medium text-gray-700 mb-4">Historique complet</h3>
            
            {availableYears.map(year => {
              const yearSituation = calculateSituation(year);
              const yearTransactions = getFilteredTransactionsForYear(year);
              
              if (yearTransactions.length === 0) return null;
              
              const isExpanded = expandedYears[year];
              
              return (
                <div key={year} className="mb-3 border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))}
                    className="w-full p-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">{year}</span>
                      <span className="text-sm text-gray-500">({yearTransactions.length} mouvements)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${yearSituation.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMontant(yearSituation.soldeFinal)}
                      </span>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 border-t">
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-2 bg-red-50 rounded text-center">
                          <p className="text-xs text-gray-500">Charges</p>
                          <p className="font-bold text-red-600">{formatMontant(yearSituation.charges)}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded text-center">
                          <p className="text-xs text-gray-500">Dépôts</p>
                          <p className="font-bold text-green-600">{formatMontant(yearSituation.depots)}</p>
                        </div>
                        <div className={`p-2 rounded text-center ${yearSituation.soldeFinal >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                          <p className="text-xs text-gray-500">Solde</p>
                          <p className={`font-bold ${yearSituation.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMontant(yearSituation.soldeFinal)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedYear(year); setActiveTab('decompte'); }}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2"
                      >
                        Voir le détail complet →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Locataires */}
        {activeTab === 'locataires' && (
          <div className="p-4 sm:p-6">
            <h3 className="font-medium text-gray-700 mb-4">Locataires du propriétaire</h3>
            
            {proprietaireLocataires.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Aucun locataire enregistré</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proprietaireLocataires.map(loc => (
                  <div
                    key={loc.id}
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
                    onClick={() => navigate(`/immeubles/${immeubleId}/locataires/${loc.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{loc.prenom} {loc.nom}</h4>
                        {loc.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />{loc.email}
                          </p>
                        )}
                        {loc.telephone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />{loc.telephone}
                          </p>
                        )}
                      </div>
                      {loc.nombre_habitants && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {loc.nombre_habitants} hab.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal édition profil */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Modifier le profil</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editForm.prenom || ''}
                    onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editForm.nom || ''}
                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={editForm.telephone || ''}
                  onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={editForm.adresse || ''}
                  onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Millièmes / Parts</label>
                <input
                  type="number"
                  value={editForm.nombre_parts || editForm.milliemes || ''}
                  onChange={(e) => setEditForm({ ...editForm, nombre_parts: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </button>
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProprietaireDetail;
