import axios, { AxiosError } from 'axios';

export const TOKEN_KEY = 'pos_token';

// Base URL del backend. Ajusta VITE_API_URL en .env si tu API vive en otra ruta.
// El backend del proyecto expone sus rutas bajo /api/v1 (ver src/app.ts del backend).
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT guardado en cada request saliente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expiró o es inválido, limpia sesión y regresa al login.
// Se dispara un evento en vez de importar el router aquí directamente,
// para no acoplar el cliente HTTP a la capa de navegación.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('pos:unauthorized'));
    }
    return Promise.reject(error);
  },
);

// Extrae un mensaje legible de un error de axios/API para mostrar en la UI
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
