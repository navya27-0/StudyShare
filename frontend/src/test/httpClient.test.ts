import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAccessToken,
  storeTokens,
  clearStoredTokens,
} from '../services/httpClient';

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
