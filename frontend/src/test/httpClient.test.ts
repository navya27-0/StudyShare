import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAccessToken,
  storeTokens,
  clearStoredTokens,
} from '../services/httpClient';

describe('API base URL normalization', () => {
  it('adds HTTPS when deployment providers supply only a hostname', () => {
    expect(normalizeApiBase('studyshare-backend.onrender.com')).toBe(
      'https://studyshare-backend.onrender.com'
    );
  });

  it('preserves explicit HTTP(S) schemes and removes trailing slashes', () => {
    expect(normalizeApiBase('https://api.example.com/')).toBe('https://api.example.com');
    expect(normalizeApiBase('http://localhost:8000/')).toBe('http://localhost:8000');
  });

  it('keeps an empty value for same-origin reverse-proxy deployments', () => {
    expect(normalizeApiBase(undefined)).toBe('');
    expect(normalizeApiBase('  ')).toBe('');
  });
});

describe('httpClient token security storage model', () => {
  beforeEach(() => {
    clearStoredTokens();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('stores and retrieves access token in-memory and sessionStorage', () => {
    storeTokens({
      access_token: 'test-jwt-access-token',
      token_type: 'bearer',
      expires_in: 900,
    });

    expect(getStoredAccessToken()).toBe('test-jwt-access-token');
    expect(sessionStorage.getItem('studyshare_access_token')).toBe('test-jwt-access-token');
    // Long-lived tokens must NEVER be stored in localStorage
    expect(localStorage.getItem('studyshare_refresh_token')).toBeNull();
  });

  it('clears access tokens cleanly upon logout', () => {
    storeTokens({
      access_token: 'active-token',
      token_type: 'bearer',
      expires_in: 900,
    });

    clearStoredTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(sessionStorage.getItem('studyshare_access_token')).toBeNull();
  });

  it('handles tokens when refresh token is delivered via HttpOnly cookie (omitted from body)', () => {
    storeTokens({
      access_token: 'cookie-backed-access-token',
      token_type: 'bearer',
      expires_in: 1800,
    });

    expect(getStoredAccessToken()).toBe('cookie-backed-access-token');
    expect(localStorage.getItem('studyshare_refresh_token')).toBeNull();
    expect(localStorage.getItem('studyshare_access_token')).toBeNull();
  });
});
