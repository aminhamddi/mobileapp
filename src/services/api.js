/**
 * Service API pour communication avec backend — compatible web et native
 */
import axios from 'axios';
import { Platform } from 'react-native';
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
        if (error.response) {
            console.error('API Error Response:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url
            });
        } else if (error.request) {
            console.error('API No Response:', error.request);
        } else {
            console.error('API Setup Error:', error.message);
        }

        if (error.response?.status === 401) {
            await clearToken();
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

export const saveAuditResponses = async (auditId, responses) => {
    const response = await api.put(`/api/audits/${auditId}/responses`, { responses });
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

// ========== UPLOAD PHOTOS — web + native ==========

export const uploadPhoto = async (photoUri) => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
        // On web: convert data URI or blob URL to a File/Blob
        let file;

        if (photoUri.startsWith('data:')) {
            // Data URI (from camera.takePictureAsync on web)
            const response = await fetch(photoUri);
            const blob = await response.blob();
            file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type });
        } else if (photoUri.startsWith('blob:')) {
            // Blob URL (from image picker on web)
            const response = await fetch(photoUri);
            const blob = await response.blob();
            file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type });
        } else if (photoUri.startsWith('http')) {
            // Already a URL (e.g. from a CDN) — no need to upload
            return { url: photoUri };
        } else {
            // Fallback: try as a file path
            const response = await fetch(photoUri);
            const blob = await response.blob();
            file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        }

        formData.append('file', file);
    } else {
        // Native: use { uri, name, type } object format
        const filename = photoUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
            uri: photoUri,
            name: filename,
            type,
        });
    }

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

export const getProjects = async () => {
    const response = await api.get('/api/projects');
    return response.data;
};

export const getServicesWithQuestions = async () => {
    const response = await api.get('/api/services/with-questions');
    return response.data;
};

// ===== NLP / ACTIONS =====
export const getActionsByAudit = async (auditId) => {
    const response = await api.get(`/api/nlp/actions/${auditId}`);
    return response.data;
};

export const generateNlpActions = async (auditId) => {
    const response = await api.post(`/api/nlp/generate-actions/${auditId}`);
    return response.data;
};

export const getActionsByType = async (auditId) => {
    const response = await api.get(`/api/nlp/actions/${auditId}/by-type`);
    return response.data;
};

export const acceptNlpAction = async (actionId) => {
    const response = await api.patch(`/api/nlp/actions/${actionId}/accept`);
    return response.data;
};

export const rejectNlpAction = async (actionId) => {
    const response = await api.delete(`/api/nlp/actions/${actionId}`);
    return response.data;
};

export const analyzeComment = async (text) => {
    const response = await api.post('/api/nlp/analyze-comment', { text });
    return response.data;
};

export default api;
