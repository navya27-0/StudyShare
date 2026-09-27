import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { BrowsePlaceholder } from './pages/BrowsePlaceholder';
import { ResourceDetailPlaceholder } from './pages/ResourceDetailPlaceholder';
import { UploadPlaceholder } from './pages/UploadPlaceholder';
import { ProfilePlaceholder } from './pages/ProfilePlaceholder';
import { BookmarksPlaceholder } from './pages/BookmarksPlaceholder';
import { AdminPlaceholder } from './pages/AdminPlaceholder';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
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
              <Route path="/" element={<BrowsePlaceholder />} />
              <Route path="/resources/:id" element={<ResourceDetailPlaceholder />} />
              <Route path="/upload" element={<UploadPlaceholder />} />
              <Route path="/profile" element={<ProfilePlaceholder />} />
              <Route path="/bookmarks" element={<BookmarksPlaceholder />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPlaceholder />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
