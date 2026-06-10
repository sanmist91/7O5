# Laxmi Tea Tracker — Setup Guide

## 1. Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for testing)

---

## 2. Firebase Setup (one-time)

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project (e.g. `laxmi-tea-tracker`)
2. In the project, click **Firestore Database** → **Create database** → Start in **test mode**
3. Go to **Project Settings** (gear icon) → **Your apps** → click the `</>` web icon to add a web app
4. Copy the `firebaseConfig` object shown

5. Open `src/config/firebase.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
};
```

6. Deploy Firestore rules:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 3. Install & Run

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## 4. Build for Production (APK / IPA)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # for APK
eas build --platform ios       # for IPA (needs Apple dev account)
```

---

## App Screens

| Screen | Description |
|--------|-------------|
| **Home** | Today's tea counter + monthly balance overview |
| **Daily Log** | View and edit tea count for any day, month-by-month |
| **Payments** | Record who paid how much; set opening balance |

## Data Structure (Firestore)

| Collection | Document ID | Fields |
|------------|-------------|--------|
| `dailyLogs` | `YYYY-MM-DD` | `date`, `count`, `updatedAt` |
| `payments` | auto-id | `name`, `amount`, `date`, `month` |
| `monthSettings` | `YYYY-MM` | `month`, `openingBalance`, `pricePerTea` |

## Cost Calculation
- Each tea = ₹20
- Monthly cost = total teas × ₹20
- Balance = Opening Balance + All Credits − Monthly Cost
