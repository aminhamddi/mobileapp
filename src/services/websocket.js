import { API_URL } from '../constants/config';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async connect(plant) {
        if (!plant) {
            console.warn('WebSocket: Aucun plant spécifié, connexion impossible');
            return;
        }

        // Convertir http:// en ws:// pour WebSocket
        const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const url = `${wsUrl}/ws/${plant}`;

        console.log(`Connexion WebSocket à : ${url}`);

        try {
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                console.log('WebSocket connecté');
                this.reconnectAttempts = 0;
                this.emit('connected', { plant });
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Message WebSocket reçu:', data);
                    
                    if (data.type === 'AUDIT_FINALIZED') {
                        this.emit('auditFinalized', data.data);
                    } else {
                        this.emit(data.type, data.data);
                    }
                } catch (e) {
                    console.warn('WebSocket: Erreur parsing message', e);
                }
            };

            this.socket.onerror = (error) => {
                console.warn('Erreur WebSocket:', error);
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket déconnecté:', event.reason);
                this.emit('disconnected', { reason: event.reason });
                
                // Tentative de reconnexion
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    console.log(`Reconnexion dans ${delay/1000}s (Tentative ${this.reconnectAttempts})`);
                    setTimeout(() => this.connect(plant), delay);
                }
            };
        } catch (error) {
            console.error('WebSocket: Erreur lors de la création de la connexion', error);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        const eventListeners = this.listeners.get(event);
        if (!eventListeners.includes(callback)) {
            eventListeners.push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event).filter(cb => cb !== callback);
            this.listeners.set(event, callbacks);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    send(type, data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, data }));
        } else {
            console.warn('WebSocket: Impossible d\'envoyer le message, socket non connecté');
        }
    }
}

const wsService = new WebSocketService();
export default wsService;
