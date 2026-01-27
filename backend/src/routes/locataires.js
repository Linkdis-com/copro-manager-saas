// GET /api/immeubles/:immeubleId/locataires/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM locataires WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Locataire non trouvé' });
    }
    
    res.json({ locataire: result.rows[0] });
  } catch (error) {
    console.error('Error fetching locataire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});