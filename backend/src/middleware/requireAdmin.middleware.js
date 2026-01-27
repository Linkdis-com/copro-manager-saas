/**
 * Middleware pour vérifier si l'utilisateur est admin
 * À utiliser APRÈS authenticate middleware
 */
export function requireAdmin(req, res, next) {
  // Vérifier si l'utilisateur est connecté
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Non authentifié',
      message: 'Veuillez vous connecter'
    });
  }

  // Vérifier le rôle admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Accès refusé',
      message: 'Cette action nécessite les droits administrateur'
    });
  }

  next();
}

/**
 * Middleware optionnel : vérifie si admin mais ne bloque pas
 * Utile pour adapter le contenu selon le rôle
 */
export function checkAdmin(req, res, next) {
  req.isAdmin = req.user?.role === 'admin';
  next();
}

export default { requireAdmin, checkAdmin };
