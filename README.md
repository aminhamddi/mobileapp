# OEE Audit - Application Mobile

Application mobile React Native (Expo) pour la réalisation des audits OEE sur le terrain par les auditeurs.

## Architecture

```
mobile/
├── App.js                       # Point d'entrée + connexion WebSocket
├── app.json                     # Configuration Expo
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js      # Stack Navigator (Login → Home → Question...)
│   ├── screens/
│   │   ├── LoginScreen.js       # Connexion (email + mot de passe)
│   │   ├── HomeScreen.js        # Accueil auditeur
│   │   ├── ServiceSelectionScreen.js  # Sélection service + questions
│   │   ├── QuestionScreen.js    # Écran de question (note, NA, photos, commentaire)
│   │   ├── RecapScreen.js       # Récapitulatif avant finalisation
│   │   ├── AuditsListScreen.js  # Liste des audits (brouillons + finalisés)
│   │   └── AuditDetailScreen.js # Détails d'un audit finalisé
│   ├── components/
│   │   ├── NoteSelector.js      # Sélecteur de note (0-5) par gravité
│   │   ├── NAButton.js          # Bouton "Non Applicable" avec raison
│   │   └── PhotoCapture.js      # Capture photo (caméra + galerie)
│   ├── services/
│   │   ├── api.js               # Appels API (auth, audits, questions, réponses)
│   │   └── websocket.js         # Connexion WebSocket temps réel
│   ├── store/
│   │   └── useAuditStore.js     # Store Zustand global
│   ├── constants/
│   │   ├── config.js            # URL API + timeout
│   │   ├── config.local.js      # Override local (IP réseau)
│   │   └── colors.js            # Palette de couleurs
│   └── utils/
│       └── storage.js           # AsyncStorage (token + brouillons)
├── package.json
└── babel.config.js
```

## Prérequis

- **Node.js** 18+
- **Expo CLI** (`npm install -g expo-cli`)
- **Expo Go** sur le téléphone (iOS ou Android)
- Backend API lancé sur le port 8000
- Téléphone et PC sur le **même réseau Wi-Fi**

## Configuration réseau

Modifier `src/constants/config.local.js` avec l'IP locale du PC :

```js
export const API_URL = 'http://192.168.1.X:8000';
```

Trouver l'IP : `ipconfig` (Windows) → chercher l'adresse IPv4 de la carte Wi-Fi.

## Installation

```bash
cd mobile
npm install
```

## Lancement

```bash
npx expo start
```

Puis scanner le QR code avec **Expo Go** (Android) ou l'appareil photo (iOS).

## Flux d'utilisation

1. **Connexion** — l'auditeur se connecte avec son email/mot de passe
2. **Accueil** — vue d'ensemble de l'auditeur
3. **Nouvel Audit** — choisir un service pour commencer
4. **Questions** — répondre à chaque question :
   - Sélectionner une note (0-5) selon la gravité
   - Ou marquer comme NA (Non Applicable)
   - Prendre des photos (optionnel, max 3)
   - Ajouter un commentaire (optionnel)
   - Navigation entre services via la barre en haut
5. **Récapitulatif** — vérifier les réponses avant finalisation
6. **Finalisation** — calcul automatique du score + broadcast WebSocket

## Navigation entre services

Les questions sont organisées par service (Production, Maintenance, VCE...). La barre de services en haut de l'écran de question permet de :

- Voir quel service est actif (chip coloré)
- Voir la progression par service (ex: 3/5)
- Naviguer vers un autre service (tap sur le chip)

Toutes les questions appartiennent au **même audit**.

## Écrans

| Écran | Description |
|-------|-------------|
| Login | Authentification JWT |
| Home | Accueil auditeur + démarrer un audit |
| ServiceSelection | Choix du service, voir les questions par groupe |
| Question | Saisie réponse (note/NA/photo/commentaire) |
| Recap | Récapitulatif + finalisation |
| AuditsList | Historique des audits (brouillons + finalisés) |
| AuditDetail | Détails d'un audit finalisé |

## Technologies

- **React Native** 0.81 + **Expo** 54
- **React Navigation** 7 (Stack)
- **Zustand** pour le state management
- **Axios** pour les appels API
- **AsyncStorage** pour persistance locale
- **expo-camera** / **expo-image-picker** pour les photos
