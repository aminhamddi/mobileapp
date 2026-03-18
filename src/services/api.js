/**
 * Service API pour communication avec backend
 */
import axios from 'axios';
import { API_URL, CONFIG } from '../constants/config';
import { getToken, saveToken, clearToken } from '../utils/storage';



// Instance axios
const api = axios.create({
    baseURL: API_URL,
    timeout: CONFIG.API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Interceptor pour gérer erreurs
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            console.error('API Error Response:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url
            });
        } else if (error.request) {
            console.error('API No Response:', error.request);
        } else {            console.error('API Setup Error:', error.message);
        }

        if (error.response?.status === 401) {
            await clearToken();
        }
        return Promise.reject(error);
    }
);

// Interceptor pour ajouter token JWT
api.interceptors.request.use(
    async (config) => {
        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor pour gérer erreurs
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expiré, logout
            await clearToken();
            // Navigate to login
        }
        return Promise.reject(error);
    }
);

// ========== AUTH ==========

export const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { access_token } = response.data;
    await saveToken(access_token);
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
};

// ========== QUESTIONS ==========

export const getQuestions = async () => {
    const response = await api.get('/api/questions');
    return response.data;
};

export const getCategories = async () => {
    const response = await api.get('/api/questions/categories');
    return response.data;
};

export const getGravites = async () => {
    const response = await api.get('/api/questions/gravites');
    return response.data;
};

// ========== AUDITS ==========

export const createAudit = async (auditData) => {
    const response = await api.post('/api/audits', auditData);
    return response.data;
};

export const getAudit = async (auditId) => {
    const response = await api.get(`/api/audits/${auditId}`);
    return response.data;
};

export const finalizeAudit = async (auditId) => {
    const response = await api.patch(`/api/audits/${auditId}/finalize`);
    return response.data;
};

// ========== REPONSES ==========

export const createReponse = async (reponseData) => {
    const response = await api.post('/api/reponses', reponseData);
    return response.data;
};

export const updateReponse = async (reponseId, reponseData) => {
    const response = await api.put(`/api/reponses/${reponseId}`, reponseData);
    return response.data;
};

export const getReponsesByAudit = async (auditId) => {
    const response = await api.get(`/api/reponses/audit/${auditId}`);
    return response.data;
};

// ========== UPLOAD PHOTOS ==========

export const uploadPhoto = async (photoUri) => {
    const formData = new FormData();

    // Créer objet file depuis URI
    const filename = photoUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
        uri: photoUri,
        name: filename,
        type,
    });

    const response = await api.post('/api/upload/photo', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

// ========== SERVICES ==========

export const getServices = async () => {
    const response = await api.get('/api/services');
    return response.data;
};

export default api;