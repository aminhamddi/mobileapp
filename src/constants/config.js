/**
 * Configuration API — standalone mode
 * Each project runs on its own port
 */
import { Platform } from 'react-native';

let API_URL;

// Priority: ENV variable -> fallback -> localhost
if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) {
    API_URL = process.env.EXPO_PUBLIC_API_URL;
} else if (Platform.OS === 'web') {
    // On web: use the same host as the page but port 8000 (backend)
    const { protocol, hostname } = window.location;
    API_URL = `${protocol}//${hostname}:8000`;
} else {
    // Native: try config.local.js
    try {
        const localConfig = require('./config.local');
        API_URL = localConfig.API_URL;
    } catch (e) {
        if (__DEV__) {
            console.warn(
                'API_URL non configure. Creez src/constants/config.local.js avec:\n' +
                'export const API_URL = "http://<SERVER_IP>:8000";\n\n' +
                'Ou definissez EXPO_PUBLIC_API_URL=<URL> dans .env'
            );
        }
        API_URL = 'http://localhost:8000';
    }
}

export { API_URL };

export const CONFIG = {
    API_TIMEOUT: 30000,
    AUTO_SAVE_INTERVAL: 30000,
    MAX_PHOTOS_PER_QUESTION: 3,
    PHOTO_QUALITY: 0.7,
};
