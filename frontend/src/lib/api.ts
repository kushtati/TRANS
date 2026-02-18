// src/lib/api.ts

// URL de l'API Backend (Railway)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Warning if using localhost in production
if (typeof window !== 'undefined' && !import.meta.env.DEV && API_BASE.includes('localhost')) {
  console.error('⚠️ Configure VITE_API_URL on Vercel with your Railway URL.');
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isNetworkError = () => this.status === 0;
  isAuthError = () => this.status === 401;
  isValidationError = () => this.status === 400;
  getFieldError = (field: string) => this.errors?.find(e => e.field === field)?.message;
}

// Token storage — persisted in localStorage so sessions survive page refresh
// (critical for mobile Safari which blocks cross-origin cookies)
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

// Restore tokens from localStorage on load
try {
  _accessToken = localStorage.getItem('_at');
  _refreshToken = localStorage.getItem('_rt');
} catch {
  // localStorage unavailable (private browsing, etc.)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  try {
    localStorage.setItem('_at', accessToken);
    localStorage.setItem('_rt', refreshToken);
  } catch {
    // localStorage unavailable
  }
}

export function clearTokens(): void {
  _accessToken = null;
  _refreshToken = null;
  try {
    localStorage.removeItem('_at');
    localStorage.removeItem('_rt');
  } catch {
    // localStorage unavailable
  }
}

export function hasToken(): boolean {
  return _accessToken !== null;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

class ApiClient {
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];

  // Retry config: retry on network errors and 502/503/504
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // ms

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryable(status: number): boolean {
    return status === 0 || status === 502 || status === 503 || status === 504;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    isRetry = false
  ): Promise<{ data?: T; success: boolean }> {
    const url = `${API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Bearer token for mobile browsers that block third-party cookies
    if (_accessToken) {
      headers['Authorization'] = `Bearer ${_accessToken}`;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include', // Still send cookies when available (desktop)
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Wait before retrying (not on first attempt)
        if (attempt > 0) {
          await this.sleep(this.RETRY_DELAYS[attempt - 1] || 4000);
        }

        const response = await fetch(url, options);
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Retry on 502/503/504 (server temporarily unavailable)
          if (this.isRetryable(response.status) && attempt < this.MAX_RETRIES) {
            lastError = new ApiError(json.message || 'Serveur indisponible', response.status);
            continue;
          }

          // Handle token expiration or missing token — try refresh
          if (response.status === 401 && (json.code === 'TOKEN_EXPIRED' || json.code === 'NO_TOKEN') && !isRetry && _refreshToken) {
            return this.handleTokenRefresh<T>(method, endpoint, data);
          }

          throw new ApiError(
            json.message || 'Une erreur est survenue',
            response.status,
            json.code,
            json.errors
          );
        }

        // Store tokens if returned in response (login, refresh, verify-email)
        if (json.data?.accessToken) {
          setTokens(json.data.accessToken, json.data.refreshToken);
        } else if (json.accessToken) {
          setTokens(json.accessToken, json.refreshToken);
        }

        return { data: json.data || json, success: true };
      } catch (error) {
        if (error instanceof ApiError && !this.isRetryable(error.status)) throw error;

        // Network error (fetch failed) — retry
        if (attempt < this.MAX_RETRIES) {
          lastError = error instanceof ApiError ? error : new ApiError('Erreur réseau', 0);
          continue;
        }

        if (error instanceof ApiError) throw error;

        // Enhanced error message for network errors
        const isLocalhost = API_BASE.includes('localhost');
        const errorMessage = isLocalhost && !import.meta.env.DEV
          ? '❌ API non accessible. Configurez VITE_API_URL sur Vercel avec votre URL Railway.'
          : 'Erreur de connexion au serveur';

        console.error('API Request Failed:', { url, error, isLocalhost });
        throw new ApiError(errorMessage, 0);
      }
    }

    throw lastError || new ApiError('Erreur de connexion au serveur', 0);
  }

  private async handleTokenRefresh<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<{ data?: T; success: boolean }> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push(() => {
          this.request<T>(method, endpoint, data, true).then(resolve).catch(reject);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (_accessToken) {
        headers['Authorization'] = `Bearer ${_accessToken}`;
      }

      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
        // Send refresh token in body for mobile browsers that block cookies
        body: _refreshToken ? JSON.stringify({ refreshToken: _refreshToken }) : undefined,
      });

      if (!refreshResponse.ok) {
        clearTokens();
        window.location.href = '/';
        throw new ApiError('Session expirée', 401);
      }

      const refreshJson = await refreshResponse.json().catch(() => ({}));

      // Store new tokens
      if (refreshJson.accessToken) {
        setTokens(refreshJson.accessToken, refreshJson.refreshToken);
      } else if (refreshJson.data?.accessToken) {
        setTokens(refreshJson.data.accessToken, refreshJson.data.refreshToken);
      }

      // Retry original request
      const result = await this.request<T>(method, endpoint, data, true);

      // Process queue
      this.refreshQueue.forEach(callback => callback());
      this.refreshQueue = [];

      return result;
    } finally {
      this.isRefreshing = false;
    }
  }

  get = <T>(endpoint: string) => this.request<T>('GET', endpoint);
  post = <T>(endpoint: string, data?: unknown) => this.request<T>('POST', endpoint, data);
  put = <T>(endpoint: string, data?: unknown) => this.request<T>('PUT', endpoint, data);
  patch = <T>(endpoint: string, data?: unknown) => this.request<T>('PATCH', endpoint, data);
  delete = <T>(endpoint: string) => this.request<T>('DELETE', endpoint);
}

export const api = new ApiClient();
