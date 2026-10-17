import axios from 'axios';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.marquesuahora.com.br/api/v1';
export const API_BASE_URL = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl.replace(/\/$/, '')}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de Requisição: Injeta automaticamente o token JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('@marcatuahora:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor de Resposta: Tratamento inteligente de expiração de sessão (401)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 (Unauthorized)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const pathname = window.location.pathname;
      const isPublicPath =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/cadastro') ||
        pathname.startsWith('/onboarding') ||
        pathname.startsWith('/esqueci-senha');

      // Se já estiver em rota pública ou tentando login/refresh, não entra em loop
      if (
        isPublicPath ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      const storedRefreshToken = localStorage.getItem('refresh_token');

      // Se temos refresh token e ainda não estamos tentando renovar
      if (storedRefreshToken && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshRes = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken: storedRefreshToken },
            { withCredentials: true }
          );

          const { token: newToken, refreshToken: newRefreshToken } = refreshRes.data;

          if (newToken) {
            localStorage.setItem('auth_token', newToken);
            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
            }

            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
        } finally {
          isRefreshing = false;
        }
      }

      // Se não há refresh token ou a renovação falhou, limpa sessão e redireciona
      localStorage.removeItem('auth_token');
      localStorage.removeItem('@marcatuahora:token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('tenant_data');

      window.location.href = '/login?expired=true';
    }

    return Promise.reject(error);
  }
);
