const firebaseConfig = {
  apiKey: "AIzaSyDgPxSQ-zwTmna95q8zeojeok3f4hIZsEk",
  authDomain: "office-erp-c0a45.firebaseapp.com",
  projectId: "office-erp-c0a45",
  storageBucket: "office-erp-c0a45.firebasestorage.app",
  messagingSenderId: "77541814081",
  appId: "1:77541814081:web:ce694d4545777d3555bbc0",
  measurementId: "G-WB1V31FM7P"
};

(function guardCompat() {
  const missing = [];
  if (typeof firebase === 'undefined') missing.push('firebase-app-compat (from gstatic)');
  else {
    if (typeof firebase.firestore !== 'function') missing.push('firebase-firestore-compat');
    if (typeof firebase.auth !== 'function') missing.push('firebase-auth-compat');
  }
  if (missing.length) {
    window.__fbLoadError = 'Missing Firebase scripts: ' + missing.join(', ') +
      '. Verify https://www.gstatic.com/firebasejs/9.23.0/* is allowed by any content blocker / firewall.';
  }
})();

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
db = firebase.firestore();
auth = firebase.auth();
try {
  // Ensure the compat auth delegate actually resolves; throws configuration-not-found
  // early if Email/Password sign-in method is disabled in Firebase Console.
  auth.languageCode = 'en';
} catch (e) { window.__fbInitError = String(e && e.message || e); }

// Shim to replace mock-claude.js with live Firebase
window.claude = {
  use: async (n) => {
    if (window.__fbLoadError) throw new Error(window.__fbLoadError);
    if (n === 'db') return db;
    if (n === 'auth') {
      if (!auth || !auth.app || !auth.app.options || !auth.app.options.apiKey) {
        throw new Error(window.__fbInitError ||
          'Firebase Auth is not configured on the backend. Open Firebase Console → Authentication → Sign-in method and enable Email/Password. Also add this hostname to Authentication → Settings → Authorized domains: ' +
          (location && location.hostname ? location.hostname : 'your Vercel domain'));
      }
      return auth;
    }
    return null;
  }
};
