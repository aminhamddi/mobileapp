/**
 * Configuration de l'application
 */

// API Backend URL
// This file is tracked by Git.
// For local overrides, create 'config.local.js' and it will be loaded instead.

let API_URL;

try {
  // Attempt to load local configuration (not tracked by Git)
  const localConfig = require('./config.local');
  API_URL = localConfig.API_URL;
} catch (e) {
  // Fallback to default values if local config doesn't exist
  API_URL = __DEV__
    ? 'http://172.20.10.2:8001'  // Your computer's IPv4
    : 'https://api-production.tn'; // Default production
}

export { API_URL };

// Configuration
export const CONFIG = {
    API_TIMEOUT: 30000,
    AUTO_SAVE_INTERVAL: 30000, // 30 secondes
    MAX_PHOTOS_PER_QUESTION: 3,
    PHOTO_QUALITY: 0.7,
};

// Services disponibles (will be fetched from API)
// export const SERVICES = [...]; // Removed hardcoded services
