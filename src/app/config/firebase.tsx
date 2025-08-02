// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBHJZAKcxHNOH0Dnhjs1ivpgtUArH3CYHw",
  authDomain: "my-video-lessons-20837.firebaseapp.com",
  databaseURL: "https://my-video-lessons-20837-default-rtdb.firebaseio.com",
  projectId: "my-video-lessons-20837",
  storageBucket: "my-video-lessons-20837.firebasestorage.app",
  messagingSenderId: "679889520118",
  appId: "1:679889520118:web:fdd33eca4959673b29b3d7",
  measurementId: "G-9VXLF4P7XZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);