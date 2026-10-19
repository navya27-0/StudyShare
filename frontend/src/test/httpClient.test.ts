import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
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
      refresh_token: 'test-refresh-token',
      token_type: 'bearer',
      expires_in: 900,
    });

    expect(getStoredAccessToken()).toBe('test-jwt-access-token');
    expect(sessionStorage.getItem('studyshare_access_token')).toBe('test-jwt-access-token');
    // Refresh token is held in-memory or httpOnly cookie, NOT in localStorage
    expect(localStorage.getItem('studyshare_refresh_token')).toBeNull();
  });

  it('clears all tokens cleanly upon logout', () => {
    storeTokens({
      access_token: 'active-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      expires_in: 900,
    });

    clearStoredTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
    expect(sessionStorage.getItem('studyshare_access_token')).toBeNull();
  });
});
