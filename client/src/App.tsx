import { type ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

// Actions
import { useAuth } from './context/AuthContext';
import { useSession } from './context/SessionContext';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { Landing } from './pages/Landing';
import { CreateWorkshop } from './pages/CreateWorkshop';
import { JoinWorkshop } from './pages/JoinWorkshop';
import { WorkshopDetail } from './pages/WorkshopDetail';
import { FacilitatorLogin } from './pages/FacilitatorLogin';
import { FacilitatorDashboard } from './pages/FacilitatorDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { AdminSettings } from './pages/AdminSettings';
import { AdminLLMModels } from './pages/AdminLLMModels';
import { AdminWorkshops } from './pages/AdminWorkshops';
import { AdminUsers } from './pages/AdminUsers';
import { AdminKnowledgeBase } from './pages/AdminKnowledgeBase';
import { AdminMyWorkshops } from './pages/AdminMyWorkshops';
import { AdminLLMUsage } from './pages/AdminLLMUsage';
import { AdminUseCases } from './pages/AdminUseCases';
import { FacilitatorManagement } from './pages/FacilitatorManagement';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { AdminLayout } from './components/AdminLayout';
import { AuthenticatedLayout, PublicWithHeaderLayout } from './components/AuthenticatedLayout';
import { FeedbackWidget } from './components/feedback/FeedbackWidget';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { ParticipantMatrix } from './pages/ParticipantMatrix';
import { ScoringPhase } from './pages/ScoringPhase';
import { AllUseCases } from './pages/AllUseCases';
import { FacilitatorRegister } from './pages/FacilitatorRegister';
import { BusinessChallengePlanner } from './pages/BusinessChallengePlanner';
import { AccessDeniedPage, NotFoundPage } from './components/StatusPages';
import { ConnectionBanner } from './components/ConnectionBanner';

// Route Guards
const PrivateRoute = ({ children, requireAdmin = false }: { children: ReactElement, requireAdmin?: boolean }) => {
  const { user, isLoading, hasRole } = useAuth(); // Corrected properties based on AuthContext
  const location = useLocation();

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    // Remember where the user was going so login can return them there.
    return <Navigate to="/facilitator-login" state={{ from: location.pathname + location.search }} />;
  }

  if (requireAdmin && !hasRole('admin')) {
    return <AccessDeniedPage />;
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

// Route guard for participant-only routes (require active SessionContext session)
const ParticipantRoute = ({ children }: { children: ReactElement }) => {
  const { session, isLoading } = useSession();
  if (isLoading) return <div>Loading...</div>;
  if (!session) return <Navigate to="/join" />;
  return children;
};

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
          <Route path="/facilitator-register" element={<PublicWithHeaderLayout showBackButton={true} showHomeButton={true}><FacilitatorRegister /></PublicWithHeaderLayout>} />
          <Route path="/join" element={<PublicWithHeaderLayout><JoinWorkshop /></PublicWithHeaderLayout>} />

          {/* Workshop Routes (Mixed Access) - Shows header for any user */}
          <Route path="/workshop/:id" element={<PublicWithHeaderLayout><WorkshopDetail /></PublicWithHeaderLayout>} />

          {/* Participant Routes - Require active SessionContext session */}
          {/* One participant shell: the old lobby/intake pages redirect to the dashboard */}
          <Route path="/lobby" element={<ParticipantRoute><Navigate to="/participant-dashboard" replace /></ParticipantRoute>} />
          <Route path="/participant-dashboard" element={<ParticipantRoute><ParticipantDashboard /></ParticipantRoute>} />
          <Route path="/participant-matrix" element={<ParticipantRoute><ParticipantMatrix /></ParticipantRoute>} />
          <Route path="/intake" element={<ParticipantRoute><Navigate to="/participant-dashboard" replace /></ParticipantRoute>} />
          <Route path="/scoring" element={<ParticipantRoute><ScoringPhase /></ParticipantRoute>} />

          {/* Facilitator Routes (Protected) - All wrapped with AuthenticatedLayout for consistent header */}
          <Route path="/facilitator/dashboard" element={<AuthenticatedRoute showBackButton={false}><FacilitatorDashboard /></AuthenticatedRoute>} />
          <Route path="/facilitator/create" element={<AuthenticatedRoute title="Create Workshop"><CreateWorkshop /></AuthenticatedRoute>} />
          <Route path="/facilitator/knowledge-base" element={<AuthenticatedRoute title="Knowledge Base"><KnowledgeBase /></AuthenticatedRoute>} />
          <Route path="/facilitator/usecases" element={<AuthenticatedRoute title="All Use Cases"><AllUseCases /></AuthenticatedRoute>} />
          <Route path="/facilitator/challenge-planner" element={<AuthenticatedRoute title="Business Challenge Planner"><BusinessChallengePlanner /></AuthenticatedRoute>} />

          {/* Admin Routes (Admin Only) */}
          <Route path="/admin" element={<PrivateRoute requireAdmin><AdminPanelLayout title="Dashboard"><AdminPanel /></AdminPanelLayout></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute requireAdmin><AdminSettings /></PrivateRoute>} />
          <Route path="/admin/llm-models" element={<PrivateRoute requireAdmin><AdminLLMModels /></PrivateRoute>} />
          <Route path="/admin/workshops" element={<PrivateRoute requireAdmin><AdminWorkshops /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute requireAdmin><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/facilitators" element={<PrivateRoute requireAdmin><FacilitatorManagement /></PrivateRoute>} />
          <Route path="/admin/usecases" element={<PrivateRoute requireAdmin><AdminUseCases /></PrivateRoute>} />
          <Route path="/admin/knowledge-base" element={<PrivateRoute requireAdmin><AdminKnowledgeBase /></PrivateRoute>} />
          <Route path="/admin/llm-usage" element={<PrivateRoute requireAdmin><AdminLLMUsage /></PrivateRoute>} />
          <Route path="/admin/my-workshops" element={<PrivateRoute requireAdmin><AdminMyWorkshops /></PrivateRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<PublicWithHeaderLayout><NotFoundPage /></PublicWithHeaderLayout>} />
        </Routes>

        {/* Live connection status */}
        <ConnectionBanner />

        {/* Global Feedback Widget */}
        <FeedbackWidget />

        {/* Global Dialogs */}
        <GlobalDialogs />
      </div>
    </Router>
  );
}

export default App;
