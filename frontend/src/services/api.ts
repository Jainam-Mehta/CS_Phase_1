/**
 * Base API configuration and utilities
 * Provides consistent fetch wrapper with timeout handling
 */

const API_BASE_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Creates a fetch promise with timeout
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch promise with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    throw error;
  }
}

/**
 * Handles API response and errors
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed JSON response
 */
async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Generic API request handler
 * @param {string} endpoint - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<any>} API response data
 */
async function apiRequest(endpoint: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetchWithTimeout(url, defaultOptions, timeout);
    return await handleResponse(response);
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API methods for different HTTP verbs
 */
export const api = {
  get: (endpoint: string, options: RequestInit = {}, timeout?: number) => 
    apiRequest(endpoint, { ...options, method: 'GET' }, timeout),
  
  post: (endpoint: string, data: any, options: RequestInit = {}, timeout?: number) => 
    apiRequest(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(data) 
    }, timeout),
  
  put: (endpoint: string, data: any, options: RequestInit = {}, timeout?: number) => 
    apiRequest(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }, timeout),
  
  delete: (endpoint: string, options: RequestInit = {}, timeout?: number) => 
    apiRequest(endpoint, { ...options, method: 'DELETE' }, timeout),
};

export default api;
