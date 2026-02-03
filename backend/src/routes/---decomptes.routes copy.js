import express from 'express';
import {
  getAllDecomptes,
  getDecompte,
  createDecompte,
  updateDecompte,
  deleteDecompte,
  getCategories,
  calculer
} from '../controllers/decomptes.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Route spéciale pour catégories
router.get('/categories', getCategories);

// Routes CRUD
router.get('/', getAllDecomptes);
router.get('/nouveau', (req, res) => {
  // Retourner un template vide pour création
  res.json({
    decompte: {
      id: null,
      annee: new Date().getFullYear(),
      periode_debut: null,
      periode_fin: null,
      statut: 'brouillon',
      immeuble_id: null
    }
  });
});
router.get('/:id', getDecompte);
router.post('/', createDecompte);
router.patch('/:id', updateDecompte);
router.delete('/:id', deleteDecompte);
router.post('/:id/validate', async (req, res) => {
  try {
    const decompte = await Decompte.findByPk(req.params.id);
    if (!decompte) {
      return res.status(404).json({ error: 'Décompte non trouvé' });
    }
    
    decompte.statut = 'valide';
    await decompte.save();
    
    res.json({ decompte });
  } catch (error) {
    console.error('Erreur validation décompte:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route calcul
router.post('/:id/calculer', calculer);

export default router;