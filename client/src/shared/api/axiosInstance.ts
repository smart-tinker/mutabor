import axios from 'axios';

// ### ИЗМЕНЕНИЕ: Добавляем префикс /api/v1 в базовый URL клиента ###
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1`;

// Create an Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add the JWT token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (optional, but good for global error handling or token refresh)
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Реализована логика автоматического выхода при ошибке 401
    if (error.response && error.response.status === 401) {
      // Проверяем, что мы не на странице логина, чтобы избежать цикла редиректов
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('authToken');
        // Перезагружаем страницу на /login. AuthContext переинициализируется и корректно обработает отсутствие токена.
        window.location.href = '/login';
        console.error('Unauthorized access - 401. Token might be invalid or expired. Redirecting to login.');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;