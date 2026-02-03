import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Trash2, 
  Save,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Building2,
  TrendingUp,
  TrendingDown,
  Tag,
  CheckCheck,
  Edit2,
  X,
  Coins,
  User
} from 'lucide-react';
import { transactionsService, fournisseursService, immeublesService, proprietairesService } from '../../services/api';

const TAGS_DISPONIBLES = [
  { value: 'eau', label: 'Eau', icon: '💧', color: 'bg-blue-100 text-blue-700' },
  { value: 'electricite', label: 'Électricité', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'chauffage', label: 'Chauffage', icon: '🔥', color: 'bg-orange-100 text-orange-700' },
  { value: 'ascenseur', label: 'Ascenseur', icon: '🛗', color: 'bg-purple-100 text-purple-700' },
  { value: 'entretien', label: 'Entretien', icon: '🧹', color: 'bg-green-100 text-green-700' },
  { value: 'reparation', label: 'Réparation', icon: '🔧', color: 'bg-red-100 text-red-700' },
  { value: 'assurance', label: 'Assurance', icon: '🛡️', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'provision', label: 'Provision', icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'appel_fonds', label: 'Appel de fonds', icon: '📢', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'frais_bancaires', label: 'Frais bancaires', icon: '🏦', color: 'bg-slate-100 text-slate-700' }
];

function TransactionsImport() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [immeuble, setImmeuble] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [categories, setCategories] = useState([]);
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all');
  
  // État pour édition
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', tags: [], proprietaire_id: null });
  const [saving, setSaving] = useState(false);

  // Charger les données
  useEffect(() => {
    loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger l'immeuble
      const immeubleRes = await immeublesService.getOne(immeubleId);
      setImmeuble(immeubleRes.data.immeuble);
      
      // Charger les propriétaires
      const proprietairesRes = await proprietairesService.getByImmeuble(immeubleId);
      setProprietaires(proprietairesRes.data.proprietaires || []);
      
      // Charger les fournisseurs
      const fournisseursRes = await fournisseursService.getAll(immeubleId);
      setFournisseurs(fournisseursRes.data.fournisseurs || []);
      
      // Charger les catégories
      try {
        const categoriesRes = await fournisseursService.getCategories(immeubleId);
        setCategories(categoriesRes.data.categories || []);
      } catch (e) {
        // Catégories par défaut
        setCategories([
          { value: 'eau', label: 'Eau', icon: '💧' },
          { value: 'electricite', label: 'Électricité', icon: '⚡' },
          { value: 'chauffage', label: 'Chauffage', icon: '🔥' },
          { value: 'ascenseur', label: 'Ascenseur', icon: '🛗' },
          { value: 'frais_bancaires', label: 'Frais bancaires', icon: '🏦' },
          { value: 'autre', label: 'Autre', icon: '📦' }
        ]);
      }
      
      // Charger les transactions existantes
      const transactionsRes = await transactionsService.getAll(immeubleId);
      setTransactions(transactionsRes.data.transactions || []);
      
      // Charger les stats
      try {
        const statsRes = await transactionsService.getStats(immeubleId);
        setStats(statsRes.data.stats);
      } catch (e) {
        console.log('Stats not available');
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ============ PARSING CSV MULTI-BANQUES ============
  
  const parseBelfiusCSV = (rows) => {
    const transactions = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row || row.length < 11) continue;
      
      const compte = row[0]?.toString().trim();
      if (!compte || !compte.startsWith('BE')) continue;
      
      const dateCompta = row[1]?.toString().trim();
      const nomContrepartie = row[5]?.toString().trim() || row[8]?.toString().trim();
      const transaction = row[8]?.toString().trim();
      const montantStr = row[10]?.toString().trim();
      const communication = row[14]?.toString().trim() || transaction;
      const compteContrepartie = row[4]?.toString().trim();
      
      if (!dateCompta || !montantStr) continue;
      
      let montant = montantStr.replace(/\s/g, '').replace(',', '.');
      montant = parseFloat(montant);
      
      if (isNaN(montant)) continue;
      
      transactions.push({
        compte,
        dateComptabilisation: dateCompta,
        nomContrepartie: nomContrepartie || extractNomFromTransaction(transaction),
        compteContrepartie,
        montant: montantStr,
        communication,
        reference: row[2] + '-' + row[3]
      });
    }
    
    return transactions;
  };

  const parseGenericCSV = (rows, headers) => {
    const headerLower = headers.map(h => (h || '').toString().toLowerCase().trim());
    
    const dateIdx = headerLower.findIndex(h => 
      h.includes('date') && (h.includes('compta') || h.includes('opération') || h === 'date')
    );
    const montantIdx = headerLower.findIndex(h => h.includes('montant') || h.includes('amount'));
    const nomIdx = headerLower.findIndex(h => 
      h.includes('contrepartie') || h.includes('nom') || h.includes('beneficiaire') || h.includes('name')
    );
    const commIdx = headerLower.findIndex(h => 
      h.includes('communication') || h.includes('description') || h.includes('libellé') || h.includes('motif')
    );
    const compteIdx = headerLower.findIndex(h => 
      h.includes('compte') && h.includes('contrepartie')
    );
    
    const transactions = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      
      const dateCompta = dateIdx >= 0 ? row[dateIdx]?.toString().trim() : null;
      const montantStr = montantIdx >= 0 ? row[montantIdx]?.toString().trim() : null;
      
      if (!dateCompta || !montantStr) continue;
      
      if (!/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(dateCompta)) continue;
      
      transactions.push({
        dateComptabilisation: dateCompta,
        nomContrepartie: nomIdx >= 0 ? row[nomIdx]?.toString().trim() : '',
        montant: montantStr,
        communication: commIdx >= 0 ? row[commIdx]?.toString().trim() : '',
        compteContrepartie: compteIdx >= 0 ? row[compteIdx]?.toString().trim() : ''
      });
    }
    
    return transactions;
  };

  const extractNomFromTransaction = (transaction) => {
    if (!transaction) return '';
    const words = transaction.split(/\s+/);
    return words.slice(0, 3).join(' ');
  };

  // ============ RECOGNITION AUTOMATIQUE ============
  
  const recognizeFournisseur = (nomContrepartie, communication) => {
    const searchText = `${nomContrepartie} ${communication}`.toLowerCase();
    
    const found = fournisseurs.find(f => {
      const fNom = (f.nom || '').toLowerCase();
      const fNumero = (f.numero_tva || '').toLowerCase();
      const fIban = (f.numero_compte || '').toLowerCase();
      
      return searchText.includes(fNom) || 
             (fNumero && searchText.includes(fNumero)) ||
             (fIban && searchText.includes(fIban));
    });
    
    if (found) {
      return {
        fournisseurId: found.id,
        fournisseurNom: found.nom,
        categorieId: found.categorie_id,
        categorieNom: found.categorie_nom
      };
    }
    
    const autoCategorie = categories.find(c => searchText.includes(c.value));
    if (autoCategorie) {
      return {
        categorieAuto: autoCategorie.label
      };
    }
    
    return {};
  };

  // ============ HANDLERS FILES ============
  
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    setError(null);
    setSuccess(null);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        let workbook;
        
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary', raw: true, codepage: 65001 });
        } else {
          workbook = XLSX.read(data, { type: 'binary' });
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
        
        let parsedTransactions = [];
        
        if (file.name.toLowerCase().includes('belfius') || 
            rows.some(r => r[0]?.toString().startsWith('BE'))) {
          parsedTransactions = parseBelfiusCSV(rows);
        } else {
          const headers = rows[0] || [];
          const dataRows = rows.slice(1);
          parsedTransactions = parseGenericCSV(dataRows, headers);
        }
        
        const enhanced = parsedTransactions.map((t, idx) => {
          const montantClean = t.montant.replace(/\s/g, '').replace(',', '.');
          const montantParsed = parseFloat(montantClean);
          const recognition = recognizeFournisseur(t.nomContrepartie || '', t.communication || '');
          
          // ✅ Convertir la date pour validation
          const dateISO = convertDateToISO(t.dateComptabilisation);
          
          const isDuplicate = transactions.some(existing => 
            existing.montant === montantParsed.toString() &&
            existing.date_comptabilisation === dateISO
          );
          
          // ✅ Validation stricte
          const isValidDate = dateISO !== null;
          const isValidMontant = !isNaN(montantParsed);
          
          return {
            ...t,
            montantParsed,
            ...recognition,
            valid: isValidDate && isValidMontant && !isDuplicate,
            error: isDuplicate ? 'Doublon' : 
                   (!isValidDate ? 'Date invalide' : 
                   (!isValidMontant ? 'Montant invalide' : null)),
            rowNum: idx + 1
          };
        });
        
        setImportData(enhanced);
        setSuccess(`${enhanced.length} lignes détectées`);
        
      } catch (err) {
        console.error('Parse error:', err);
        setError('Erreur lors de la lecture du fichier');
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // ✅ FONCTION CORRIGÉE AVEC VALIDATION STRICTE
  const convertDateToISO = (dateStr) => {
    if (!dateStr) return null;
    
    // Nettoyer la date
    const cleanDate = dateStr.toString().trim();
    if (!cleanDate) return null;
    
    // Essayer de parser avec différents formats
    const parts = cleanDate.split(/[-\/\s.]/);
    if (parts.length < 3) return null;
    
    let day, month, year;
    
    // Format YYYY-MM-DD ou YYYY/MM/DD
    if (parts[0].length === 4) {
      [year, month, day] = parts;
    } 
    // Format DD-MM-YYYY ou DD/MM/YYYY
    else if (parts[2].length === 4) {
      [day, month, year] = parts;
    } 
    // Format DD-MM-YY ou DD/MM/YY
    else {
      [day, month, year] = parts;
      year = year.length === 2 ? '20' + year : year;
    }
    
    // ✅ Valider que ce sont bien des nombres
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
    if (dayNum < 1 || dayNum > 31) return null;
    if (monthNum < 1 || monthNum > 12) return null;
    if (yearNum < 2000 || yearNum > 2100) return null;
    
    return `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
  };

  // ✅ FONCTION CORRIGÉE AVEC DOUBLE FILTRE
  const handleImport = async () => {
    const validRows = importData.filter(r => r.valid);
    if (validRows.length === 0) {
      setError('Aucune transaction valide à importer');
      return;
    }
    
    setImporting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const payload = validRows.map(row => {
        const dateTransaction = convertDateToISO(row.dateComptabilisation);
        
        // ✅ Vérifier que la date est valide
        if (!dateTransaction) {
          console.error('Date invalide pour la ligne:', row);
          return null;
        }
        
        return {
          date_transaction: dateTransaction,
          date_comptabilisation: dateTransaction,
          montant: row.montantParsed,
          type: row.montantParsed < 0 ? 'charge' : 'versement',
          description: row.communication || row.nomContrepartie || '',
          communication: row.communication,
          nom_contrepartie: row.nomContrepartie,
          compte_contrepartie: row.compteContrepartie,
          reference: row.reference,
          fournisseur_id: row.fournisseurId || null,
          categorie: row.categorieId || null
        };
      }).filter(Boolean); // ✅ Filtrer les null
      
      if (payload.length === 0) {
        setError('Aucune transaction avec date valide');
        return;
      }
      
      await transactionsService.importBulk(immeubleId, { transactions: payload });
      
      setSuccess(`${payload.length} transactions importées avec succès`);
      setImportData([]);
      await loadData();
      
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Date', 'Montant', 'Contrepartie', 'Communication', 'Compte contrepartie'],
      ['01/01/2024', '-150.50', 'Fournisseur Eau', 'Facture eau janvier', 'BE12345678901234'],
      ['05/01/2024', '500.00', 'Propriétaire A', 'Provision charges T1', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle');
    XLSX.writeFile(wb, 'modele_import_transactions.xlsx');
  };

  // ============ ÉDITION TRANSACTION ============
  
  const getDisplayType = (transaction) => {
    if (!transaction) return 'autre';
    const type = transaction.type;
    const montant = parseFloat(transaction.montant);
    
    if (type === 'versement' || montant > 0) return 'depot';
    if (type === 'charge' || montant < 0) return 'charge';
    return 'autre';
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      description: transaction.description || transaction.communication || '',
      tags: transaction.tags || [],
      proprietaire_id: transaction.proprietaire_id || null
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    
    setSaving(true);
    try {
      await transactionsService.update(immeubleId, editingTransaction.id, {
        description: editForm.description,
        tags: editForm.tags,
        proprietaire_id: editForm.proprietaire_id
      });
      
      setEditingTransaction(null);
      setSuccess('Transaction mise à jour');
      await loadData();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header avec boutons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Extraits bancaires
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {immeuble?.nom}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Coins className="w-4 h-4" />
            Voir la comptabilité
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Modèle Excel
          </button>
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}/fournisseurs`)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Tag className="w-4 h-4" />
            Fournisseurs
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recettes</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalVersements?.toFixed(2) || '0.00'} €
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Dépenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.totalCharges?.toFixed(2) || '0.00'} €
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trésorerie</p>
                <p className={`text-2xl font-bold ${stats.tresorerie >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {stats.tresorerie?.toFixed(2) || '0.00'} €
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Zone Import */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Import extrait bancaire
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Formats supportés : CSV Belfius, Excel (.xlsx), CSV générique
        </p>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">
            Déposez votre fichier ici ou cliquez pour sélectionner
          </p>
          <p className="text-sm text-gray-500">
            CSV, Excel (.xlsx)
          </p>
          
          <label className="mt-4 inline-block">
            <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer inline-flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Sélectionner un fichier
            </span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
            />
          </label>
        </div>

        {/* Prévisualisation */}
        {importData.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">
                Prévisualisation ({importData.filter(r => r.valid).length}/{importData.length} valides)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportData([])}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || importData.filter(r => r.valid).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Importer {importData.filter(r => r.valid).length} transactions
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contrepartie</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reconnaissance</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importData.map((row, idx) => (
                    <tr key={idx} className={row.valid ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2 text-sm text-gray-500">{row.rowNum}</td>
                      <td className="px-3 py-2 text-sm">{row.dateComptabilisation}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="max-w-xs truncate" title={row.communication}>
                          {row.communication || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <div className="max-w-xs truncate" title={row.nomContrepartie}>
                          {row.nomContrepartie || '-'}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-medium ${
                        row.montantParsed < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {row.montantParsed?.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {row.fournisseurNom || row.categorieAuto ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            <CheckCheck className="w-3 h-3" />
                            {row.fournisseurNom || row.categorieAuto}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {row.valid ? (
                          <span className="text-green-600">✓ OK</span>
                        ) : (
                          <span className="text-red-600" title={row.error}>
                            ✗ {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Liste des transactions existantes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Transactions ({filteredTransactions.length})
          </h2>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Tous</option>
              <option value="charge">Dépenses</option>
              <option value="versement">Recettes</option>
            </select>
          </div>
        </div>
        
        {filteredTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucune transaction enregistrée
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrepartie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(t.date_transaction).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-md truncate" title={t.description}>
                        {t.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-xs truncate" title={t.nom_contrepartie}>
                        {t.nom_contrepartie || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        t.type === 'charge' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {t.type === 'charge' ? 'Dépense' : 'Recette'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      t.type === 'charge' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {t.type === 'charge' ? '-' : '+'}{parseFloat(t.montant).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1 text-orange-500 hover:bg-orange-50 rounded"
                          title="Éditer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Supprimer cette transaction ?')) {
                              try {
                                await transactionsService.delete(immeubleId, t.id);
                                loadData();
                              } catch (e) {
                                setError('Erreur lors de la suppression');
                              }
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredTransactions.length > 50 && (
              <p className="text-center text-gray-500 py-4">
                Affichage limité aux 50 premières transactions
              </p>
            )}
          </div>
        )}
      </div>

      {/* ✅ MODAL ÉDITION COMPLET AVEC PROPRIETAIRE ET TAGS */}
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

              {/* Description (lecture seule) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="px-3 py-2 border rounded bg-gray-50 text-sm text-gray-700">
                  {editForm.description || '-'}
                </div>
              </div>

              {/* ✅ CHAMP PROPRIETAIRE (pour dépôts uniquement) */}
              {getDisplayType(editingTransaction) === 'depot' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="h-4 w-4 inline mr-1" />
                    Attribuer à un propriétaire
                  </label>
                  <select
                    value={editForm.proprietaire_id || ''}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      proprietaire_id: e.target.value ? parseInt(e.target.value) : null 
                    })}
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

              {/* ✅ CHAMP TAGS */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {TAGS_DISPONIBLES.map(tag => (
                    <label
                      key={tag.value}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                        editForm.tags?.includes(tag.value) 
                          ? tag.color 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.tags?.includes(tag.value) || false}
                        onChange={(e) => {
                          const newTags = e.target.checked
                            ? [...(editForm.tags || []), tag.value]
                            : (editForm.tags || []).filter(t => t !== tag.value);
                          setEditForm({ ...editForm, tags: newTags });
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm flex items-center gap-1.5">
                        <span>{tag.icon}</span>
                        <span>{tag.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Sauvegarder
                </button>
                <button 
                  onClick={() => setEditingTransaction(null)} 
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

export default TransactionsImport;
