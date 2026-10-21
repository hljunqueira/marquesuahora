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

// Helpers de Cookie seguros para persistência resiliente em navegadores móveis (Safari/iOS)
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('@marcatuahora:token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('tenant_data');

  if (typeof document !== 'undefined') {
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  }
}

// Interceptor de Requisição: Injeta automaticamente o token JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('auth_token') || localStorage.getItem('@marcatuahora:token');
    if (!token) {
      // Fallback para cookie no Safari/iOS
      const cookieToken = getCookie('auth_token');
      if (cookieToken) {
        token = cookieToken;
        localStorage.setItem('auth_token', cookieToken);
        localStorage.setItem('@marcatuahora:token', cookieToken);
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor de Resposta: Tratamento inteligente de expiração de sessão (401) com fila concorrente
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
      const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

      // Se for rota pública ou requisição de autenticação, não entra em loop e não redireciona
      if (
        !isProtectedRoute ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      // Se já está acontecendo um refresh, enfileira a requisição para executar assim que o token renovar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      const storedRefreshToken =
        localStorage.getItem('refresh_token') || getCookie('refresh_token');

      // Se temos refresh token, tenta renovar o acesso silenciosamente
      if (storedRefreshToken) {
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
            localStorage.setItem('@marcatuahora:token', newToken);
            setCookie('auth_token', newToken, 30);

            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
              setCookie('refresh_token', newRefreshToken, 90);
            }

            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr: any) {
          processQueue(refreshErr, null);

          // Só desloga e redireciona se o servidor explicitamente rejeitou o refresh token com 401
          if (refreshErr.response?.status === 401 && isProtectedRoute) {
            clearAuthStorage();
            window.location.href = '/login?expired=true';
            return Promise.reject(refreshErr);
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // Se não há refresh token e estamos em rota protegida
      if (!storedRefreshToken && isProtectedRoute) {
        clearAuthStorage();
        window.location.href = '/login?expired=true';
      }
    }

    return Promise.reject(error);
  }
);
