import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './hooks/useSupabase';
import { FilecoinProvider } from './contexts/FilecoinContext';
import Footer from './components/layout/Footer';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import StoragePage from './pages/StoragePage';
import PaymentsPage from './pages/PaymentsPage';
import ForecastPage from './pages/ForecastPage';
import AgentActivityPage from './pages/AgentActivityPage';
import ProtectedFilesPage from './pages/ProtectedFilesPage';
import FileDetailsPage from './pages/FileDetailsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

const App = () => {
  return (
      <SupabaseProvider>
        <FilecoinProvider>
          <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-shamrock-darkest">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
               <Route path="*" element={<div>Page not found</div>} />


              {/* Protected routes */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="/dashboard/overview" element={<DashboardPage />} />
                <Route path="/dashboard/upload" element={<UploadPage />} />
                <Route path="/dashboard/storage" element={<StoragePage />} />
                <Route path="/dashboard/payments" element={<PaymentsPage />} />
                <Route path="/dashboard/forecast" element={<ForecastPage />} />
                <Route path="/dashboard/agent" element={<AgentActivityPage />} />
                <Route path="/dashboard/protected" element={<ProtectedFilesPage />} />
                <Route path="/file/:id" element={<FileDetailsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
            <Footer />
          </div>
        </FilecoinProvider>
      </SupabaseProvider>
  );
};

export default App;