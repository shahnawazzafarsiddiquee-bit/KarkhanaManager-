/**
 * Firebase project config. These values are public by design - they identify
 * the project in browser requests; access is controlled by firestore.rules.
 * To point the app at a different project, replace this block with the config
 * from Firebase console -> Project settings -> Your apps -> SDK setup (Config).
 */
const firebaseConfig = {
  apiKey: "AIzaSyA6OL_f_AdHmuAMTrp1DxoURjk0luQZWEk",
  authDomain: "karkhana-maneger.firebaseapp.com",
  projectId: "karkhana-maneger",
  storageBucket: "karkhana-maneger.firebasestorage.app",
  messagingSenderId: "493590521831",
  appId: "1:493590521831:web:065fc4e76c56b4d9f3bf42",
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
