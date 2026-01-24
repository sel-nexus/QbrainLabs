import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

import { Toaster } from 'sonner';

import { useEffect } from 'react';
import { socket } from './lib/socket';
import { toast } from 'sonner';

import { SessionProvider } from './context/SessionContext';

function App() {
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
    <BrowserRouter>
      <SessionProvider>
        <div className="text-white font-body selection:bg-brand-violet selection:text-white">
          <Toaster position="top-center" theme="dark" richColors />
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
          </Routes>
        </div>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
