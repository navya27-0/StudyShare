import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { clearStoredTokens } from '../services/httpClient';

const TestConsumer: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div>Loading Auth...</div>;
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      <div data-testid="user-name">{user?.display_name || 'No User'}</div>
    </div>
  );
};

describe('AuthContext Session Restoration', () => {
  beforeEach(() => {
    clearStoredTokens();
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores session in a fresh tab when refresh token cookie is valid', async () => {
    // Fresh tab: sessionStorage is empty
    expect(sessionStorage.getItem('studyshare_access_token')).toBeNull();

    // Mock refreshToken returning new tokens via cookie
    vi.spyOn(authApi, 'refreshToken').mockResolvedValue({
      access_token: 'fresh-tab-access-token',
      token_type: 'bearer',
      expires_in: 1800,
    });

    // Mock getMe returning the authenticated user profile
    vi.spyOn(authApi, 'getMe').mockResolvedValue({
      id: 42,
      email: 'student@example.edu',
      display_name: 'Alex Rivera',
      role: 'student',
      is_active: true,
      avatar_url: null,
      created_at: '2026-10-21T00:00:00Z',
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Alex Rivera');
    expect(authApi.refreshToken).toHaveBeenCalledTimes(1);
    expect(authApi.getMe).toHaveBeenCalledTimes(1);
  });

  it('remains logged out in a fresh tab if refresh cookie is invalid or absent', async () => {
    expect(sessionStorage.getItem('studyshare_access_token')).toBeNull();

    vi.spyOn(authApi, 'refreshToken').mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ANONYMOUS');
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
  });
});
