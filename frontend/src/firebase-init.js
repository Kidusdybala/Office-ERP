const firebaseConfig = {
  apiKey: "AIzaSyDgPxSQ-zwTmna95q8zeojeok3f4hIZsEk",
  authDomain: "office-erp-c0a45.firebaseapp.com",
  projectId: "office-erp-c0a45",
  storageBucket: "office-erp-c0a45.firebasestorage.app",
  messagingSenderId: "77541814081",
  appId: "1:77541814081:web:ce694d4545777d3555bbc0",
  measurementId: "G-WB1V31FM7P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
db = firebase.firestore();
auth = firebase.auth();

// Shim to replace mock-claude.js with live Firebase
window.claude = {
  use: async (n) => n === 'db' ? db : n === 'auth' ? auth : null
};
