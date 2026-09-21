/**
 * ===== FIREBASE CONFIG (PLACEHOLDER) =====
 * 1. Go to https://console.firebase.google.com -> Create Project
 * 2. Project settings -> General -> "Your apps" -> Add a Web app (</>)
 * 3. Copy the config object Firebase gives you and paste the VALUES below
 *    (replace every "REPLACE_ME_..." string).
 * 4. In the Firebase console:
 *    - Authentication -> Sign-in method -> enable "Email/Password"
 *    - Firestore Database -> Create database (start in production mode)
 *      and paste the rules from firestore.rules into the Rules tab.
 */
const firebaseConfig = {
  apiKey: "REPLACE_ME_API_KEY",
  authDomain: "REPLACE_ME_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_ME_PROJECT_ID",
  storageBucket: "REPLACE_ME_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_ME_SENDER_ID",
  appId: "REPLACE_ME_APP_ID",
};

firebase.initializeApp(firebaseConfig);

const KM = window.KM || (window.KM = {});
KM.fbAuth = firebase.auth(); // Firebase Auth SDK instance (KM.auth is our own auth module, see js/auth.js)
KM.firestore = firebase.firestore();
KM.serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;

// Enable offline cache so the "local cache OK but source of truth = Firestore" requirement works.
KM.firestore.enablePersistence({ synchronizeTabs: true }).catch(() => {
  // Multiple tabs open, or browser doesn't support persistence - safe to ignore.
});

// ---- Shared in-memory state ----
KM.state = {
  user: null,          // firebase auth user object
  business: null,       // { businessName, ownerName, email }
  karigars: [],          // cached list for dashboard/list rendering
  vyaparis: [],
  currentKarigarId: null,
  unsubscribers: [],    // firestore listener cleanup functions
};
