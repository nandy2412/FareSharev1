import axios from 'axios';
import { auth } from '../services/firebase';

const api = axios.create({
  baseURL: 'http://localhost:5000/'
});

api.interceptors.request.use(async config => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;