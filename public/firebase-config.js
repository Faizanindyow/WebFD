// public/firebase-config.js
// Inisialisasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB4yKSmidFU5Ow81FeGNIEb_-JlFwK0JkU",
    authDomain: "smart-parking-system-tafaiz.firebaseapp.com",
    // databaseURL: "https://smart-parking-system-tafaiz-default-rtdb.asia-southeast1.firebasedatabase.app", // Hapus atau komentari baris ini jika Anda HANYA menggunakan Firestore
    projectId: "smart-parking-system-tafaiz",
    storageBucket: "smart-parking-system-tafaiz.firebasestorage.app",
    messagingSenderId: "208962155522",
    appId: "1:208962155522:web:ee6153554d6f145a23e31b",
    measurementId: "G-REP7B1T1KC" // Opsional
};

firebase.initializeApp(firebaseConfig);

// Objek untuk Firebase Authentication
const auth = firebase.auth();

// PENTING: Inisialisasi Firestore Database
const firestore = firebase.firestore();

// Jika Anda ingin menggunakan Realtime Database juga di masa depan,
// Anda bisa menginisialisasinya di sini, tapi pastikan juga SDK-nya dimuat di HTML.
// const database = firebase.database();