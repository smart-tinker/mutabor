import axiosInstance from '../../../shared/api/axiosInstance'; // Import the configured Axios instance
import axios from 'axios'; // Keep for isAxiosError if needed, or type directly

// Define the structure of the registration data
interface RegistrationData {
  name: string;
  email: string;
  password?: string; // Password might be optional if using OAuth, but required for email registration
}

// Define the structure of the successful API response (adjust as per your actual API)
interface RegistrationResponse {
  message: string;
  userId?: string; // Example field
  // Add other relevant fields from your API response
}

// Define the structure of an API error (adjust as per your actual API)
interface ApiError {
  message: string;
  errors?: Array<{ field: string; message: string }>; // Example for field-specific errors
}

// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'; // Base URL is now in axiosInstance

export const registerUserApi = async (userData: RegistrationData): Promise<RegistrationResponse> => {
  try {
    // Use axiosInstance for the request. Base URL is already part of it.
    const response = await axiosInstance.post<RegistrationResponse>(`/auth/register`, userData, {
      // headers: { 'Content-Type': 'application/json' } // Default in axiosInstance if set, or can be overridden
    });
    return response.data;
  } catch (error) {
    // Error handling can remain similar, but AxiosError type might come from the global axios import
    if (axios.isAxiosError(error) && error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const apiError = error.response.data as ApiError;
      throw new Error(apiError.message || `Registration failed with status: ${error.response.status}`);
    } else if (axios.isAxiosError(error) && error.request) {
      // The request was made but no response was received
      throw new Error('Registration failed: No response from server. Please check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }
};

// Define the structure of the login data
interface LoginData {
  email: string;
  password?: string;
}

// Define the structure of the successful login API response
interface LoginResponse {
  message: string;
  token: string; // JWT token
  // Add other relevant fields from your API response, e.g., user details
}

export const loginUserApi = async (userData: LoginData): Promise<LoginResponse> => {
  try {
    // Use axiosInstance for the request
    const response = await axiosInstance.post<LoginResponse>(`/auth/login`, userData, {
      // headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const apiError = error.response.data as ApiError; // Reuse ApiError type for consistency
      throw new Error(apiError.message || `Login failed with status: ${error.response.status}`);
    } else if (axios.isAxiosError(error) && error.request) {
      throw new Error('Login failed: No response from server. Please check your network connection.');
    } else {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }
};
