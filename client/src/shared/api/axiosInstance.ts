import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
    // Example: Handle 401 Unauthorized globally (e.g., redirect to login)
    if (error.response && error.response.status === 401) {
      // localStorage.removeItem('authToken'); // Clear expired token
      // TODO: redirect to login, update auth state
      // window.location.href = '/login'; // Or use react-router programmatically
      console.error('Unauthorized access - 401. Token might be invalid or expired.');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

// How to use this instance:
// import axiosInstance from './shared/api/axiosInstance';
//
// const fetchData = async () => {
//   try {
//     const response = await axiosInstance.get('/protected-route');
//     console.log(response.data);
//   } catch (error) {
//     console.error('Error fetching data', error);
//   }
// };
