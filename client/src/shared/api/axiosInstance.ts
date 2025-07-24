import axios from 'axios';

const API_BASE_URL = '/api/v1';

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

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('authToken')) {
        localStorage.removeItem('authToken');
        window.dispatchEvent(new Event('auth-error'));
        console.error('Unauthorized access - 401. Token might be invalid or expired. Dispatched auth-error event.');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;