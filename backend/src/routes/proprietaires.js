// GET /api/immeubles/:immeubleId/proprietaires/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM proprietaires WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Propriétaire non trouvé' });
    }
    
    res.json({ proprietaire: result.rows[0] });
  } catch (error) {
    console.error('Error fetching proprietaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});