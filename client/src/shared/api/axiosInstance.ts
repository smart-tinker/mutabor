import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

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

// ### ИЗМЕНЕНИЕ: Логика обработки 401 ошибки ###
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Если получена ошибка 401
    if (error.response && error.response.status === 401) {
      // Проверяем, был ли токен в localStorage.
      // Это предотвращает срабатывание при обычном 401 (например, на странице логина),
      // и реагирует только на невалидный/просроченный токен.
      if (localStorage.getItem('authToken')) {
        // Удаляем невалидный токен
        localStorage.removeItem('authToken');
        // Генерируем глобальное событие, на которое подпишется AuthContext
        window.dispatchEvent(new Event('auth-error'));
        console.error('Unauthorized access - 401. Token might be invalid or expired. Dispatched auth-error event.');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;