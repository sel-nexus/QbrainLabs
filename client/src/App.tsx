import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { CreateWorkshop } from './pages/CreateWorkshop';
import { JoinWorkshop } from './pages/JoinWorkshop';
import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { IntakePhase } from './pages/IntakePhase';
import { ScoringPhase } from './pages/ScoringPhase';
import { WorkshopDetail } from './pages/WorkshopDetail';
import { FacilitatorLogin } from './pages/FacilitatorLogin';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Organizations } from './pages/Organizations';
import { Marketplace } from './pages/Marketplace';
import { FacilitatorDashboard } from './pages/FacilitatorDashboard';
import { FacilitatorManagement } from './pages/FacilitatorManagement';
import { AdminWorkshops } from './pages/AdminWorkshops';
import { AdminUsers } from './pages/AdminUsers';
import { AdminKnowledgeBase } from './pages/AdminKnowledgeBase';
import { AdminMyWorkshops } from './pages/AdminMyWorkshops';
import { FacilitatorRegister } from './pages/FacilitatorRegister';

import { Toaster } from 'sonner';

import { useEffect } from 'react';
import { socket } from './lib/socket';
import { toast } from 'sonner';

import { SessionProvider } from './context/SessionContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { AdminGuard, FacilitatorGuard } from './components/guards/RoleGuard';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { useAuth } from './context/AuthContext';

function AppContent() {
  const { showChangePasswordDialog, closeChangePasswordDialog } = useAuth();

  useEffect(() => {
    socket.on('connect', () => toast.success('Connected to server'));
    socket.on('disconnect', () => toast.error('Disconnected from server. Trying to reconnect...'));
    socket.on('connect_error', () => toast.error('Connection error'));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  return (
    <div className="theme-text-primary font-body selection:bg-brand-violet selection:text-white">
      <Header />
      <Toaster position="top-center" richColors />
      {showChangePasswordDialog && (
        <ChangePasswordDialog onClose={closeChangePasswordDialog} />
      )}
      <main className="pt-14">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/facilitator-login" element={<FacilitatorLogin />} />
          <Route path="/register" element={<FacilitatorRegister />} />
          <Route path="/join" element={<JoinWorkshop />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminGuard>
              <AdminPanel />
            </AdminGuard>
          } />
          <Route path="/admin/facilitators" element={
            <AdminGuard>
              <FacilitatorManagement />
            </AdminGuard>
          } />
          <Route path="/admin/workshops" element={
            <AdminGuard>
              <AdminWorkshops />
            </AdminGuard>
          } />
          <Route path="/admin/users" element={
            <AdminGuard>
              <AdminUsers />
            </AdminGuard>
          } />
          <Route path="/admin/knowledge-base" element={
            <AdminGuard>
              <AdminKnowledgeBase />
            </AdminGuard>
          } />
          <Route path="/admin/my-workshops" element={
            <AdminGuard>
              <AdminMyWorkshops />
            </AdminGuard>
          } />
          <Route path="/create" element={
            <AdminGuard>
              <CreateWorkshop />
            </AdminGuard>
          } />
          
          {/* Facilitator Routes */}
          <Route path="/facilitator/dashboard" element={
            <FacilitatorGuard>
              <FacilitatorDashboard />
            </FacilitatorGuard>
          } />
          <Route path="/dashboard" element={
            <FacilitatorGuard>
              <AdminDashboard />
            </FacilitatorGuard>
          } />
          <Route path="/workshop/:id" element={
            <FacilitatorGuard>
              <WorkshopDetail />
            </FacilitatorGuard>
          } />
          <Route path="/knowledge-base" element={
            <FacilitatorGuard>
              <KnowledgeBase />
            </FacilitatorGuard>
          } />
          <Route path="/organizations" element={
            <FacilitatorGuard>
              <Organizations />
            </FacilitatorGuard>
          } />
          <Route path="/marketplace" element={
            <FacilitatorGuard>
              <Marketplace />
            </FacilitatorGuard>
          } />
          
          {/* Member/Participant Routes */}
          <Route path="/lobby" element={<ParticipantDashboard />} />
          <Route path="/intake" element={<IntakePhase />} />
          <Route path="/scoring" element={<ScoringPhase />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SessionProvider>
              <AppContent />
            </SessionProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
