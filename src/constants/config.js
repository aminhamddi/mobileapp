/**
 * Configuration de l'application
 */

// API Backend URL
// IMPORTANT : Changer selon votre environnement
export const API_URL = __DEV__
    ? 'http://172.20.10.2:8000'  // Votre IP locale (pas localhost!)
    : 'https://api-production.tn';

// Configuration
export const CONFIG = {
    API_TIMEOUT: 30000,
    AUTO_SAVE_INTERVAL: 30000, // 30 secondes
    MAX_PHOTOS_PER_QUESTION: 3,
    PHOTO_QUALITY: 0.7,
};

// Services disponibles (will be fetched from API)
// export const SERVICES = [...]; // Removed hardcoded services