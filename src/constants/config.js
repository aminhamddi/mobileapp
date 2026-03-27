/**
 * Configuration de l'application — web + native
 */

import { Platform } from 'react-native';

let API_URL;

// Priority: ENV variable -> dynamic web detection -> hardcoded fallback
if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) {
    API_URL = process.env.EXPO_PUBLIC_API_URL;
} else if (Platform.OS === 'web') {
    // On web, use the same host as the browser (works with any IP/hostname)
    const { protocol, hostname } = window.location;
    API_URL = `${protocol}//${hostname}:8000`;
} else {
    try {
        const localConfig = require('./config.local');
        API_URL = localConfig.API_URL;
    } catch (e) {
        // Native fallback — change this to your machine's local IP
        API_URL = __DEV__
            ? 'http://172.20.10.2:8000'
            : 'https://api-production.tn';
    }
}

export { API_URL };

export const CONFIG = {
    API_TIMEOUT: 30000,
    AUTO_SAVE_INTERVAL: 30000,
    MAX_PHOTOS_PER_QUESTION: 3,
    PHOTO_QUALITY: 0.7,
};
