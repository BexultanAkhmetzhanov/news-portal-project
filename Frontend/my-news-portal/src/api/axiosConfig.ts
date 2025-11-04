import axios, { type AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  
  (error: AxiosError) => {
    
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user'); 
      
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;