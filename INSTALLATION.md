# Installation de l'Architecture Admin Séparée

## 📁 Structure créée

```
src/admin/
├── contexts/
│   └── AdminAuthContext.jsx
├── components/
│   ├── AdminLayout.jsx
│   └── AdminProtectedRoute.jsx
├── pages/
│   ├── AdminLogin.jsx
│   ├── AdminDashboard.jsx
│   ├── AdminClients.jsx
│   ├── AdminInvoices.jsx
│   ├── AdminRevenue.jsx
│   ├── AdminExercices.jsx
│   ├── AdminCampaigns.jsx
│   ├── AdminPromos.jsx
│   └── AdminAnalytics.jsx
└── AdminApp.jsx
```

## 🚀 Étapes d'installation

### 1. Copier les fichiers dans votre projet

```bash
# Depuis le dossier racine de votre projet frontend
cp -r /home/claude/admin-structure/src/admin ./src/
```

### 2. Nettoyer l'application utilisateur

**Supprimer de `src/App.jsx` :**
- Toutes les routes `/admin/*`
- Tous les imports de composants admin
- Les références à `AdminLayout`

**Supprimer de `src/components/Layout/Layout.jsx` :**
- Le lien conditionnel vers l'administration
- L'import de `Shield`
- La variable `isAdmin`

**Supprimer de `src/components/Layout/MobileMenu.jsx` :**
- Le lien conditionnel vers l'administration
- L'import de `Shield`
- La variable `isAdmin`

**Supprimer le dossier :**
```bash
rm -rf src/pages/admin/
```

### 3. Créer admin-index.html

Dans le dossier racine du frontend, créer `admin-index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Copro Manager - Administration</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/admin-main.jsx"></script>
  </body>
</html>
```

### 4. Créer admin-main.jsx

Dans `src/`, créer `admin-main.jsx` :

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AdminApp from './admin/AdminApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminApp />
    </BrowserRouter>
  </React.StrictMode>
);
```

### 5. Mettre à jour vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: mode === 'admin' ? 'dist-admin' : 'dist',
    rollupOptions: {
      input: {
        main: mode === 'admin' 
          ? './admin-index.html' 
          : './index.html'
      }
    }
  },
  server: {
    port: mode === 'admin' ? 5174 : 5173
  }
}));
```

### 6. Mettre à jour package.json

Ajouter les scripts :

```json
{
  "scripts": {
    "dev": "vite",
    "dev:admin": "vite --mode admin",
    "build": "vite build",
    "build:admin": "vite build --mode admin",
    "preview": "vite preview",
    "preview:admin": "vite preview --outDir dist-admin"
  }
}
```

## 🔧 Backend - Routes Admin

Créer un nouveau fichier `routes/admin.routes.js` :

```javascript
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware admin
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await req.db.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [decoded.userId, 'admin']
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    req.admin = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Login admin (séparé du login utilisateur)
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = require('bcrypt');
    
    const result = await req.db.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const token = jwt.sign(
      { userId: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        prenom: admin.prenom,
        nom: admin.nom,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vérifier token admin
router.get('/auth/verify', verifyAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.admin.id,
      email: req.admin.email,
      prenom: req.admin.prenom,
      nom: req.admin.nom,
      role: req.admin.role
    }
  });
});

// Toutes les autres routes nécessitent auth admin
router.use(verifyAdmin);

// Stats overview
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await req.db.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN role = 'user' THEN id END) as total_users,
        COUNT(DISTINCT i.id) as total_immeubles,
        0 as mrr,
        0 as invoices_this_month
      FROM users u
      LEFT JOIN immeubles i ON i.user_id = u.id
    `);
    
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des clients
router.get('/clients', async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT 
        u.id, u.email, u.prenom, u.nom, u.created_at,
        COUNT(i.id) as immeubles_count
      FROM users u
      LEFT JOIN immeubles i ON i.user_id = u.id
      WHERE u.role = 'user'
      GROUP BY u.id, u.email, u.prenom, u.nom, u.created_at
      ORDER BY u.created_at DESC
    `);
    
    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Clients error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
```

Dans `server.js`, ajouter :

```javascript
const adminRoutes = require('./routes/admin.routes');
app.use('/api/v1/admin', adminRoutes);
```

## 🌐 Déploiement

### Configuration Nginx pour avat.copromanager.be

```nginx
server {
    server_name avat.copromanager.be;
    root /var/www/copro-admin/dist-admin;
    
    location / {
        try_files $uri /index.html;
    }
    
    # Optionnel : Restriction IP
    # allow 123.45.67.89;  # Votre IP
    # deny all;
    
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

## 🧪 Tester localement

### Application utilisateur :
```bash
npm run dev
# Ouvrir http://localhost:5173
```

### Application admin :
```bash
npm run dev:admin
# Ouvrir http://localhost:5174
```

## ✅ Checklist

- [ ] Copier les fichiers admin dans `src/admin/`
- [ ] Créer `admin-index.html`
- [ ] Créer `src/admin-main.jsx`
- [ ] Mettre à jour `vite.config.js`
- [ ] Mettre à jour `package.json`
- [ ] Nettoyer `src/App.jsx` (supprimer routes admin)
- [ ] Nettoyer `Layout.jsx` (supprimer lien admin)
- [ ] Nettoyer `MobileMenu.jsx` (supprimer lien admin)
- [ ] Supprimer `src/pages/admin/`
- [ ] Créer routes backend admin
- [ ] Tester login admin
- [ ] Tester les deux apps en local

## 🔒 Sécurité

- ✅ Apps complètement séparées
- ✅ Pas de référence admin dans le code user
- ✅ Tokens séparés (`token` vs `admin_token`)
- ✅ Routes backend protégées
- ✅ Sous-domaine obscurci (avat.copromanager.be)

---

**Prêt à déployer ! 🚀**
