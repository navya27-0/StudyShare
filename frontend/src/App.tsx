import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { BrowseView } from './pages/BrowseView';
import { ResourceDetailView } from './pages/ResourceDetailView';
import { UploadView } from './pages/UploadView';
import { ProfileView } from './pages/ProfileView';
import { BookmarksView } from './pages/BookmarksView';
import { AdminDashboardView } from './pages/AdminDashboardView';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Authentication Pages */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Authenticated Application Shell */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
              <Route path="/" element={<BrowseView />} />
              <Route path="/resources/:id" element={<ResourceDetailView />} />
              <Route path="/upload" element={<UploadView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/profile/:id" element={<ProfileView />} />
              <Route path="/bookmarks" element={<BookmarksView />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardView />
                  </AdminRoute>
                }
              />
            </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
};

export default App;
