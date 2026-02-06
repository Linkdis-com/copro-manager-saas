import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import EauDashboard from './components/Eau/pages/EauDashboard';
import ConfigurationImmeuble from './components/Eau/pages/ConfigurationImmeuble';
import GestionCompteurs from './components/Eau/pages/GestionCompteurs';
import SaisieReleves from './components/Eau/pages/SaisieReleves';
import ResultatsDecompte from './components/Eau/pages/ResultatsDecompte';

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const ImmeublesList = lazy(() => import('./pages/Immeubles/ImmeublesList'));
const ImmeublesDetail = lazy(() => import('./pages/Immeubles/ImmeublesDetail'));
const ProprietairesList = lazy(() => import('./pages/Proprietaires/ProprietairesList'));
const ProprietaireDetail = lazy(() => import('./pages/Proprietaires/ProprietaireDetail'));
const ProprietairesForm = lazy(() => import('./pages/Proprietaires/ProprietairesForm'));
const LocatairesList = lazy(() => import('./pages/Locataires/LocatairesList'));
const LocataireDetail = lazy(() => import('./pages/Locataires/LocataireDetail'));
const LocatairesForm = lazy(() => import('./pages/Locataires/LocatairesForm'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Comptabilité
const DecomptesAnnuels = lazy(() => import('./pages/Comptabilite/DecomptesAnnuels'));
const ExercicesComptables = lazy(() => import('./pages/Comptabilite/ExercicesComptables'));
const DecompteAnnuelRAN = lazy(() => import('./pages/Comptabilite/DecompteAnnuelRAN'));
const TransactionsImport = lazy(() => import('./pages/Comptabilite/TransactionsImport'));
const FournisseursPage = lazy(() => import('./pages/Fournisseurs/FournisseursPage'));
const ExercicesClotures = lazy(() => import('./pages/Exercices/ExercicesClotures'));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            
            <Route path="immeubles" element={<ImmeublesList />} />
            <Route path="immeubles/:id" element={<ImmeublesDetail />} />
            <Route path="immeubles/:immeubleId/transactions" element={<TransactionsImport />} />
            <Route path="immeubles/:immeubleId/fournisseurs" element={<FournisseursPage />} />
            
            {/* COMPTABILITÉ */}
            <Route path="immeubles/:immeubleId/decomptes" element={<DecomptesAnnuels />} />
            <Route path="immeubles/:immeubleId/exercices" element={<ExercicesComptables />} />
            <Route path="immeubles/:immeubleId/exercices/:exerciceId/decomptes" element={<ExercicesComptables />} />
            <Route path="immeubles/:immeubleId/exercices/:exerciceId/proprietaires/:proprietaireId/decompte" element={<DecompteAnnuelRAN />} />
            
            <Route path="proprietaires" element={<ProprietairesList />} />
            <Route path="immeubles/:id/proprietaires/:propId" element={<ProprietaireDetail />} />
            <Route path="immeubles/:id/proprietaires/:propId/edit" element={<ProprietairesForm />} />
            
            <Route path="locataires" element={<LocatairesList />} />
            <Route path="immeubles/:id/locataires/:locId" element={<LocataireDetail />} />
            <Route path="immeubles/:id/locataires/:locId/edit" element={<LocatairesForm />} />
            
            {/* DÉCOMPTES EAU */}
            <Route path="/immeubles/:immeubleId/eau" element={<EauDashboard />} />
            <Route path="/immeubles/:immeubleId/eau/configuration" element={<ConfigurationImmeuble />} />
            <Route path="/immeubles/:immeubleId/eau/compteurs" element={<GestionCompteurs />} />
            <Route path="/immeubles/:immeubleId/eau/releves" element={<SaisieReleves />} />
            <Route path="/immeubles/:immeubleId/eau/decomptes" element={<ResultatsDecompte />} />
            
            <Route path="exercices-clotures" element={<ExercicesClotures />} />
          </Route>
          
          {/* 404 - Route catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
