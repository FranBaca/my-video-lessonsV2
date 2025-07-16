// Firebase Configuration Template
// Copy this to .env.local and replace with your actual Firebase values

export const firebaseConfigTemplate = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Required environment variables for Firebase:
// NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
// NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

// To get these values:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing one
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" section
// 5. Click "Add app" > Web app
// 6. Copy the config values to your .env.local file 