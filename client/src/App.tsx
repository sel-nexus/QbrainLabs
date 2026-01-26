import { type ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Actions
import { useAuth } from './context/AuthContext';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { Landing } from './pages/Landing';
import { CreateWorkshop } from './pages/CreateWorkshop';
import { JoinWorkshop } from './pages/JoinWorkshop';
import { WorkshopDetail } from './pages/WorkshopDetail';
import { FacilitatorLogin } from './pages/FacilitatorLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { AdminSettings } from './pages/AdminSettings';
import { AdminWorkshops } from './pages/AdminWorkshops';
import { AdminUsers } from './pages/AdminUsers';
import { AdminKnowledgeBase } from './pages/AdminKnowledgeBase';
import { AdminMyWorkshops } from './pages/AdminMyWorkshops';
import { FacilitatorManagement } from './pages/FacilitatorManagement';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { AdminLayout } from './components/AdminLayout';
import { AuthenticatedLayout, PublicWithHeaderLayout } from './components/AuthenticatedLayout';
import { FeedbackWidget } from './components/feedback/FeedbackWidget';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { WaitingRoom } from './pages/WaitingRoom';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { ParticipantMatrix } from './pages/ParticipantMatrix';
import { IntakePhase } from './pages/IntakePhase';
import { ScoringPhase } from './pages/ScoringPhase';

// Route Guards
const PrivateRoute = ({ children, requireAdmin = false }: { children: ReactElement, requireAdmin?: boolean }) => {
  const { user, isLoading, hasRole } = useAuth(); // Corrected properties based on AuthContext

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/facilitator-login" />;
  }

  if (requireAdmin && !hasRole('admin')) {
    return <Navigate to="/facilitator/dashboard" />;
  }

  return children;
};

// Layout wrapper for authenticated routes with header
const AuthenticatedRoute = ({ 
  children, 
  requireAdmin = false,
  showBackButton = true,
  title
}: { 
  children: ReactElement, 
  requireAdmin?: boolean,
  showBackButton?: boolean,
  title?: string
}) => (
  <PrivateRoute requireAdmin={requireAdmin}>
    <AuthenticatedLayout showBackButton={showBackButton} title={title}>
      {children}
    </AuthenticatedLayout>
  </PrivateRoute>
);

// Layout Wrappers
const AdminPanelLayout = ({ children, title }: { children: ReactElement, title: string }) => (
  <AdminLayout title={title}>{children}</AdminLayout>
);

// Global dialogs that need auth context
const GlobalDialogs = () => {
  const { showChangePasswordDialog, closeChangePasswordDialog } = useAuth();
  
  return (
    <>
      {showChangePasswordDialog && (
        <ChangePasswordDialog onClose={closeChangePasswordDialog} />
      )}
    </>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Toaster position="top-right" />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/facilitator-login" element={<PublicWithHeaderLayout showBackButton={true} showHomeButton={true}><FacilitatorLogin /></PublicWithHeaderLayout>} />
          <Route path="/join" element={<PublicWithHeaderLayout><JoinWorkshop /></PublicWithHeaderLayout>} />

          {/* Workshop Routes (Mixed Access) - Shows header for any user */}
          <Route path="/workshop/:id" element={<PublicWithHeaderLayout><WorkshopDetail /></PublicWithHeaderLayout>} />

          {/* Participant Routes - Accessible to participants with session */}
          <Route path="/lobby" element={<WaitingRoom />} />
          <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
          <Route path="/participant-matrix" element={<ParticipantMatrix />} />
          <Route path="/intake" element={<IntakePhase />} />
          <Route path="/scoring" element={<ScoringPhase />} />

          {/* Facilitator Routes (Protected) - All wrapped with AuthenticatedLayout for consistent header */}
          <Route path="/facilitator" element={<AuthenticatedRoute showBackButton={false}><AdminDashboard /></AuthenticatedRoute>} />
          <Route path="/facilitator/dashboard" element={<AuthenticatedRoute showBackButton={false}><AdminDashboard /></AuthenticatedRoute>} />
          <Route path="/facilitator/create" element={<AuthenticatedRoute requireAdmin title="Create Workshop"><CreateWorkshop /></AuthenticatedRoute>} />
          <Route path="/facilitator/analytics" element={<AuthenticatedRoute title="Analytics"><AnalyticsDashboard /></AuthenticatedRoute>} />
          <Route path="/facilitator/knowledge-base" element={<AuthenticatedRoute title="Knowledge Base"><KnowledgeBase /></AuthenticatedRoute>} />

          {/* Admin Routes (Admin Only) */}
          <Route path="/admin" element={<PrivateRoute requireAdmin><AdminPanelLayout title="Dashboard"><AdminPanel /></AdminPanelLayout></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute requireAdmin><AdminSettings /></PrivateRoute>} />
          <Route path="/admin/workshops" element={<PrivateRoute requireAdmin><AdminWorkshops /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute requireAdmin><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/facilitators" element={<PrivateRoute requireAdmin><FacilitatorManagement /></PrivateRoute>} />
          <Route path="/admin/knowledge-base" element={<PrivateRoute requireAdmin><AdminKnowledgeBase /></PrivateRoute>} />
          <Route path="/admin/my-workshops" element={<PrivateRoute requireAdmin><AdminMyWorkshops /></PrivateRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* Global Feedback Widget */}
        <FeedbackWidget />
        
        {/* Global Dialogs */}
        <GlobalDialogs />
      </div>
    </Router>
  );
}

export default App;
