import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKVNXmMefJWmBfqiKKj3fKHBWaSdKw4LA",
  authDomain: "car-service-managemnt-system.firebaseapp.com",
  projectId: "car-service-managemnt-system",
  storageBucket: "car-service-managemnt-system.firebasestorage.app",
  messagingSenderId: "593184640451",
  appId: "1:593184640451:web:1bc4a0063eaa8c1b0ec176"
};

export const app = initializeApp(firebaseConfig);
