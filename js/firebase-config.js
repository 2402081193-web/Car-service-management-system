// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyAKVNXmMefJWmBfqiKKj3fKHBWaSdKw4LA",
    authDomain: "car-service-managemnt-system.firebaseapp.com",
    projectId: "car-service-managemnt-system",
    storageBucket: "car-service-managemnt-system.firebasestorage.app",
    messagingSenderId: "593184640451",
    appId: "1:593184640451:web:1bc4a0063eaa8c1b0ec176",
    measurementId: "G-MF85T06LC1"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 初始化服务
const auth = firebase.auth();
const db = firebase.firestore();

// 导出全局变量
window.auth = auth;
window.db = db;