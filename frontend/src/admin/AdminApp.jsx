import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Pages placeholder (à créer ensuite)
import AdminClients from './pages/AdminClients';
import AdminInvoices from './pages/AdminInvoices';
import AdminRevenue from './pages/AdminRevenue';
import AdminExercices from './pages/AdminExercices';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminPromos from './pages/AdminPromos';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminClientDetail from './pages/AdminClientDetail';
import AdminImmeuble from './pages/AdminImmeuble';
//import SubscriptionsManagement from './pages/SubscriptionsManagement';
import SubscriptionsAdmin from './pages/SubscriptionsAdmin';
import PromoCodesManagement from './pages/PromoCodesManagement';


function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Route par défaut -> Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login */}
        <Route path="/login" element={<AdminLogin />} />
        
        {/* Routes protégées avec AdminLayout */}
        <Route
          path="/"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="exercices" element={<AdminExercices />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="promos" element={<AdminPromos />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="clients/:id" element={<AdminClientDetail />} />
          <Route path="clients/:clientId/immeubles/:id" element={<AdminImmeuble />} />
          <Route path="/codes-promo" element={<PromoCodesManagement />} />
<Route path="subscriptions" element={<SubscriptionsAdmin />} />
<Route path="codes-promo" element={<PromoCodesManagement />} />

        </Route>
        
        {/* Route 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

export default AdminApp; 
