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
  RefreshCw
} from 'lucide-react';
import { relevesService, decomptesService } from '../../services/api';

function RelevesImport() {
  const { decompteId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [decompte, setDecompte] = useState(null);
  const [releves, setReleves] = useState([]);
  const [template, setTemplate] = useState(null);
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Saisie manuelle
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualReleve, setManualReleve] = useState({
    compteurId: '',
    dateReleve: new Date().toISOString().split('T')[0],
    indexPrecedent: '',
    indexActuel: '',
    notes: ''
  });

  // Charger les données
  useEffect(() => {
    loadData();
  }, [decompteId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger le décompte
      const decompteRes = await decomptesService.getById(decompteId);
      setDecompte(decompteRes.data.decompte);
      
      // Charger les relevés existants
      const relevesRes = await relevesService.getByDecompte(decompteId);
      setReleves(relevesRes.data.releves || []);
      
      // Charger le template
      const templateRes = await relevesService.getTemplate(decompteId);
      setTemplate(templateRes.data.template);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ============ IMPORT EXCEL ============
  
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
  }, []);

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
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Mapper les données
        const mappedData = jsonData.map((row, index) => ({
          rowNum: index + 2, // +2 car ligne 1 = headers
          numeroCompteur: row['Numéro Compteur'] || row['numero_compteur'] || '',
          dateReleve: parseExcelDate(row['Date Relevé'] || row['date_releve']),
          indexPrecedent: parseFloat(row['Index Précédent'] || row['index_precedent']) || 0,
          indexActuel: parseFloat(row['Index Actuel'] || row['index_actuel']) || 0,
          notes: row['Notes'] || row['notes'] || '',
          valid: true,
          error: null
        }));
        
        // Valider les données
        const validatedData = mappedData.map(row => validateRow(row));
        setImportData(validatedData);
        
        const validCount = validatedData.filter(r => r.valid).length;
        setSuccess(`${validCount}/${validatedData.length} lignes valides prêtes à importer`);
        
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setError('Erreur lors de la lecture du fichier Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseExcelDate = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    
    // Si c'est un nombre Excel (jours depuis 1900)
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Si c'est une string
    if (typeof value === 'string') {
      // Format DD/MM/YYYY
      const parts = value.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return value;
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const validateRow = (row) => {
    const errors = [];
    
    if (!row.numeroCompteur) {
      errors.push('Numéro compteur manquant');
    }
    
    if (row.indexActuel < row.indexPrecedent) {
      errors.push('Index actuel < index précédent');
    }
    
    if (row.indexActuel < 0 || row.indexPrecedent < 0) {
      errors.push('Index négatif');
    }
    
    return {
      ...row,
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : null
    };
  };

  const handleImport = async () => {
    const validRows = importData.filter(r => r.valid);
    
    if (validRows.length === 0) {
      setError('Aucune ligne valide à importer');
      return;
    }
    
    try {
      setImporting(true);
      setError(null);
      
      const relevesToImport = validRows.map(row => ({
        numeroCompteur: row.numeroCompteur,
        dateReleve: row.dateReleve,
        indexPrecedent: row.indexPrecedent,
        indexActuel: row.indexActuel,
        notes: row.notes
      }));
      
      const response = await relevesService.bulkImport(decompteId, relevesToImport);
      
      setSuccess(`${response.data.imported} relevés importés avec succès !`);
      setImportData([]);
      
      // Recharger les relevés
      loadData();
      
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  // ============ TÉLÉCHARGER MODÈLE ============
  
  const downloadTemplate = () => {
    if (!template) return;
    
    // Créer les données du template
    const wsData = [
      template.headers,
      ...template.rows.map(row => [
        row.numero_compteur,
        row.occupant,
        row.emplacement,
        new Date().toLocaleDateString('fr-BE'),
        '', // Index précédent
        '', // Index actuel
        ''  // Notes
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Largeur des colonnes
    ws['!cols'] = [
      { wch: 15 }, // Numéro Compteur
      { wch: 25 }, // Occupant
      { wch: 20 }, // Emplacement
      { wch: 12 }, // Date
      { wch: 15 }, // Index Précédent
      { wch: 15 }, // Index Actuel
      { wch: 30 }, // Notes
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relevés');
    
    const fileName = `releves_${decompte?.immeuble_nom || 'compteurs'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ============ SAISIE MANUELLE ============
  
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    if (!manualReleve.compteurId || !manualReleve.indexActuel) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    try {
      setError(null);
      
      await relevesService.create(decompteId, {
        compteurId: manualReleve.compteurId,
        dateReleve: manualReleve.dateReleve,
        indexPrecedent: parseFloat(manualReleve.indexPrecedent) || 0,
        indexActuel: parseFloat(manualReleve.indexActuel),
        notes: manualReleve.notes
      });
      
      setSuccess('Relevé ajouté avec succès !');
      setShowManualForm(false);
      setManualReleve({
        compteurId: '',
        dateReleve: new Date().toISOString().split('T')[0],
        indexPrecedent: '',
        indexActuel: '',
        notes: ''
      });
      
      loadData();
      
    } catch (err) {
      console.error('Error creating releve:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleDeleteReleve = async (releveId) => {
    if (!confirm('Supprimer ce relevé ?')) return;
    
    try {
      await relevesService.delete(decompteId, releveId);
      setSuccess('Relevé supprimé');
      loadData();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

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
              Relevés de compteurs
            </h1>
            <p className="text-gray-600">
              {decompte?.immeuble_nom} - {decompte?.annee}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            disabled={!template}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Modèle Excel
          </button>
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Saisie manuelle
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Zone Import Excel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Import Excel
        </h2>
        
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
            Glissez-déposez votre fichier Excel ici
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

        {/* Prévisualisation des données importées */}
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
                  Importer {importData.filter(r => r.valid).length} relevés
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compteur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Index préc.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Index actuel</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conso.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importData.map((row, idx) => (
                    <tr key={idx} className={row.valid ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.rowNum}</td>
                      <td className="px-4 py-2 text-sm font-mono">{row.numeroCompteur}</td>
                      <td className="px-4 py-2 text-sm">{row.dateReleve}</td>
                      <td className="px-4 py-2 text-sm text-right">{row.indexPrecedent}</td>
                      <td className="px-4 py-2 text-sm text-right">{row.indexActuel}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {(row.indexActuel - row.indexPrecedent).toFixed(2)} m³
                      </td>
                      <td className="px-4 py-2 text-sm">
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

      {/* Liste des relevés existants */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">
          Relevés enregistrés ({releves.length})
        </h2>
        
        {releves.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucun relevé enregistré pour ce décompte
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compteur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Index préc.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Index actuel</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consommation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {releves.map((releve) => (
                  <tr key={releve.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{releve.numero_compteur}</td>
                    <td className="px-4 py-3 text-sm">{releve.occupant || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(releve.date_releve).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{releve.index_precedent}</td>
                    <td className="px-4 py-3 text-sm text-right">{releve.index_actuel}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                      {releve.consommation?.toFixed(2) || (releve.index_actuel - releve.index_precedent).toFixed(2)} m³
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{releve.notes || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteReleve(releve.id)}
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
          </div>
        )}
      </div>

      {/* Modal Saisie Manuelle */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Ajouter un relevé</h2>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compteur *
                </label>
                <select
                  value={manualReleve.compteurId}
                  onChange={(e) => setManualReleve({...manualReleve, compteurId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner un compteur</option>
                  {template?.rows?.map((row) => (
                    <option key={row.compteur_id} value={row.compteur_id}>
                      {row.numero_compteur} - {row.occupant}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date du relevé *
                </label>
                <input
                  type="date"
                  value={manualReleve.dateReleve}
                  onChange={(e) => setManualReleve({...manualReleve, dateReleve: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Index précédent
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={manualReleve.indexPrecedent}
                    onChange={(e) => setManualReleve({...manualReleve, indexPrecedent: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Index actuel *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={manualReleve.indexActuel}
                    onChange={(e) => setManualReleve({...manualReleve, indexActuel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {manualReleve.indexActuel && manualReleve.indexPrecedent && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    Consommation calculée : <strong>
                      {(parseFloat(manualReleve.indexActuel) - parseFloat(manualReleve.indexPrecedent)).toFixed(3)} m³
                    </strong>
                  </span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={manualReleve.notes}
                  onChange={(e) => setManualReleve({...manualReleve, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Observations éventuelles..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RelevesImport;