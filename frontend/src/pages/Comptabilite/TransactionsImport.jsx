import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Building2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Tag,
  CheckCheck
} from 'lucide-react';
import { transactionsService, fournisseursService, immeublesService } from '../../services/api';

function TransactionsImport() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [immeuble, setImmeuble] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all');

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
    // Format Belfius: lignes 1-12 = métadonnées, ligne 13 = headers, lignes 14+ = data
    // Colonnes: Compte;Date de comptabilisation;Numéro d'extrait;Numéro de transaction;
    // Compte contrepartie;Nom contrepartie contient;Rue et numéro;Code postal et localité;
    // Transaction;Date valeur;Montant;Devise;BIC;Code pays;Communications
    
    const transactions = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip les lignes vides ou métadonnées
      if (!row || row.length < 11) continue;
      
      // Détecter si c'est une ligne de données (commence par un IBAN)
      const compte = row[0]?.toString().trim();
      if (!compte || !compte.startsWith('BE')) continue;
      
      const dateCompta = row[1]?.toString().trim();
      const nomContrepartie = row[5]?.toString().trim() || row[8]?.toString().trim();
      const transaction = row[8]?.toString().trim();
      const montantStr = row[10]?.toString().trim();
      const communication = row[14]?.toString().trim() || transaction;
      const compteContrepartie = row[4]?.toString().trim();
      
      // Skip si pas de date ou montant
      if (!dateCompta || !montantStr) continue;
      
      // Parser le montant
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
        reference: row[2] + '-' + row[3] // Numéro extrait + transaction
      });
    }
    
    return transactions;
  };

  const parseGenericCSV = (rows, headers) => {
    // Détection automatique des colonnes par nom
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
      
      // Vérifier que c'est une vraie date
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
    // Extraire le nom de la contrepartie depuis la description de transaction
    const patterns = [
      /VERS\s+[\w\d\s]+\s+(.+?)\s+(?:REF|VAL|\+\+\+)/i,
      /DE\s+[\w\d\s]+\s+(.+?)\s+(?:REF|VAL)/i,
      /VIREMENT.*VERS\s+[\w\d\s]+\s+(.+?)\s+/i
    ];
    
    for (const pattern of patterns) {
      const match = transaction.match(pattern);
      if (match) return match[1].trim();
    }
    
    return '';
  };

  // ============ GESTION FICHIERS ============
  
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [fournisseurs]);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setError(null);
    setSuccess(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let rows = [];
        
        if (file.name.endsWith('.csv')) {
          // Parser CSV
          const text = e.target.result;
          const lines = text.split(/\r?\n/);
          rows = lines.map(line => {
            // Gérer le séparateur (point-virgule ou virgule)
            if (line.includes(';')) {
              return line.split(';');
            }
            return line.split(',');
          });
        } else {
          // Parser Excel
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }
        
        // Détecter le format et parser
        let parsedTransactions = [];
        
        // Vérifier si c'est un format Belfius (commence par "Date de comptabilisation")
        const firstCells = rows.slice(0, 15).map(r => (r[0] || '').toString().toLowerCase());
        const isBelfius = firstCells.some(c => c.includes('date de comptabilisation'));
        
        if (isBelfius) {
          parsedTransactions = parseBelfiusCSV(rows);
        } else {
          // Format générique - trouver la ligne d'en-tête
          let headerIdx = rows.findIndex(row => {
            const rowStr = (row || []).join(' ').toLowerCase();
            return rowStr.includes('date') && (rowStr.includes('montant') || rowStr.includes('amount'));
          });
          
          if (headerIdx >= 0) {
            parsedTransactions = parseGenericCSV(rows.slice(headerIdx + 1), rows[headerIdx]);
          } else {
            // Essayer de parser directement
            parsedTransactions = parseGenericCSV(rows.slice(1), rows[0]);
          }
        }
        
        if (parsedTransactions.length === 0) {
          setError('Aucune transaction trouvée dans le fichier. Vérifiez le format.');
          return;
        }
        
        // Valider et enrichir les données
        const validatedData = parsedTransactions.map((t, idx) => {
          const validation = validateTransaction(t);
          const recognition = recognizeFournisseur(t.nomContrepartie, t.communication);
          
          return {
            ...t,
            rowNum: idx + 1,
            ...validation,
            ...recognition,
            montantParsed: parseFloat((t.montant || '0').toString().replace(/\s/g, '').replace(',', '.'))
          };
        });
        
        setImportData(validatedData);
        
        const validCount = validatedData.filter(r => r.valid).length;
        const recognizedCount = validatedData.filter(r => r.fournisseurId || r.categorieAuto).length;
        setSuccess(`${validCount} transactions valides (${recognizedCount} reconnues automatiquement)`);
        
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Erreur lors de la lecture du fichier: ' + err.message);
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const validateTransaction = (t) => {
    const errors = [];
    
    if (!t.dateComptabilisation) {
      errors.push('Date manquante');
    }
    
    const montant = parseFloat((t.montant || '0').toString().replace(/\s/g, '').replace(',', '.'));
    if (isNaN(montant) || montant === 0) {
      errors.push('Montant invalide');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.join(', ')
    };
  };

  const recognizeFournisseur = (nomContrepartie, communication) => {
    if (!nomContrepartie && !communication) {
      return { fournisseurId: null, fournisseurNom: null, categorieAuto: null };
    }
    
    const searchText = ((nomContrepartie || '') + ' ' + (communication || '')).toUpperCase();
    
    // Chercher dans les fournisseurs
    for (const f of fournisseurs) {
      // Par nom
      if (f.nom && searchText.includes(f.nom.toUpperCase())) {
        return { 
          fournisseurId: f.id, 
          fournisseurNom: f.nom, 
          categorieAuto: f.type 
        };
      }
      
      // Par tags
      if (f.tags && Array.isArray(f.tags)) {
        for (const tag of f.tags) {
          if (tag && searchText.includes(tag.toUpperCase())) {
            return { 
              fournisseurId: f.id, 
              fournisseurNom: f.nom, 
              categorieAuto: f.type 
            };
          }
        }
      }
    }
    
    // Reconnaissance automatique des frais bancaires
    if (searchText.includes('FRAIS DE GESTION') || 
        searchText.includes('FRAIS SUR ORDRE') ||
        searchText.includes('FRAIS DE TENUE') ||
        searchText.includes('DROIT DE TIMBRE') ||
        searchText.includes('PARTICIPATION AUX FRAIS')) {
      return { 
        fournisseurId: null, 
        fournisseurNom: 'Frais bancaires', 
        categorieAuto: 'frais_bancaires' 
      };
    }
    
    // Reconnaissance intérêts
    if (searchText.includes('INTERETS') || searchText.includes('INTÉRÊTS')) {
      return { 
        fournisseurId: null, 
        fournisseurNom: 'Intérêts', 
        categorieAuto: 'frais_bancaires' 
      };
    }
    
    return { fournisseurId: null, fournisseurNom: null, categorieAuto: null };
  };

  // ============ IMPORT ============
  
  const handleImport = async () => {
    const validRows = importData.filter(r => r.valid);
    
    if (validRows.length === 0) {
      setError('Aucune transaction valide à importer');
      return;
    }
    
    try {
      setImporting(true);
      setError(null);
      
      const transactionsToImport = validRows.map(row => ({
        dateComptabilisation: row.dateComptabilisation,
        montant: row.montant,
        nomContrepartie: row.nomContrepartie || '',
        compteContrepartie: row.compteContrepartie || '',
        communication: row.communication || '',
        reference: row.reference || ''
      }));
      
      const response = await transactionsService.import(immeubleId, transactionsToImport);
      
      setSuccess(`${response.data.imported} transactions importées (${response.data.autoRecognized} reconnues automatiquement)`);
      setImportData([]);
      
      // Recharger les données
      loadData();
      
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  // ============ TEMPLATE DEMO ============
  
  const downloadTemplate = () => {
    const templateData = [
      ['Date de comptabilisation', 'Montant', 'Nom contrepartie', 'Communication'],
      ['01/01/2025', '-150.00', 'VIVAQUA', 'Facture eau T1'],
      ['05/01/2025', '500.00', 'DUPONT Jean', 'Charges janvier'],
      ['10/01/2025', '-200.00', 'CHAUFFAGE SA', 'Acompte chauffage'],
      ['15/01/2025', '-50.00', '', 'FRAIS DE GESTION ADMINISTRATIVE']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 25 },
      { wch: 40 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    
    XLSX.writeFile(wb, `modele_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ============ FILTRAGE ============
  
  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    if (filterType === 'charge') return t.type === 'charge';
    if (filterType === 'versement') return t.type === 'versement';
    return true;
  });

  // ============ RENDER ============
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
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
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            Glissez-déposez votre extrait bancaire ici
          </p>
          <p className="text-gray-400 text-sm mb-4">ou</p>
          <label className="cursor-pointer">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Parcourir...
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
                        <div className="max-w-xs truncate" title={row.nomContrepartie || row.communication}>
                          {row.nomContrepartie || row.communication || '-'}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(t.date_transaction).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-md truncate" title={t.description}>
                        {t.description || '-'}
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
    </div>
  );
}

export default TransactionsImport;