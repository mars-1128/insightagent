import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import OpeningSplash from './components/OpeningSplash';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudioPage from './pages/StudioPage';
import DatasetsPage from './pages/DatasetsPage';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="glass-canvas flex items-center justify-center text-sm text-slate-500 dark:text-slate-300">
        Loading InsightAgent workspace...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="glass-canvas flex items-center justify-center text-sm text-slate-500 dark:text-slate-300">
        Loading InsightAgent...
      </div>
    );
  }
  if (user) return <Navigate to="/studio" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OpeningSplash />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <StudioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/datasets"
              element={
                <ProtectedRoute>
                  <DatasetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <AuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
