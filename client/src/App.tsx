import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { CreateWorkshop } from './pages/CreateWorkshop';
import { JoinWorkshop } from './pages/JoinWorkshop';
import { WaitingRoom } from './pages/WaitingRoom';
import { IntakePhase } from './pages/IntakePhase';
import { ScoringPhase } from './pages/ScoringPhase';
import { WorkshopDetail } from './pages/WorkshopDetail';
import { FacilitatorLogin } from './pages/FacilitatorLogin';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Organizations } from './pages/Organizations';
import { Marketplace } from './pages/Marketplace';

import { Toaster } from 'sonner';

import { useEffect } from 'react';
import { socket } from './lib/socket';
import { toast } from 'sonner';

import { SessionProvider } from './context/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';

function AppContent() {
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
      <main className="pt-14">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/facilitator-login" element={<FacilitatorLogin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/create" element={<CreateWorkshop />} />
          <Route path="/join" element={<JoinWorkshop />} />
          <Route path="/lobby" element={<WaitingRoom />} />
          <Route path="/intake" element={<IntakePhase />} />
          <Route path="/scoring" element={<ScoringPhase />} />
          <Route path="/workshop/:id" element={<WorkshopDetail />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/marketplace" element={<Marketplace />} />
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
          <SessionProvider>
            <AppContent />
          </SessionProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
