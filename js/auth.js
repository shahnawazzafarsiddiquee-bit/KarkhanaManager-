(function () {
  const KM = window.KM || (window.KM = {});
  const { toast, friendlyAuthError } = KM.utils;

  function showError(msg) {
    const el = document.getElementById("authError");
    const info = document.getElementById("authInfo");
    info.classList.add("hidden");
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function showInfo(msg) {
    const el = document.getElementById("authInfo");
    const err = document.getElementById("authError");
    err.classList.add("hidden");
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function clearMessages() {
    document.getElementById("authError").classList.add("hidden");
    document.getElementById("authInfo").classList.add("hidden");
  }

  function switchTab(tab) {
    clearMessages();
    const isSignIn = tab === "signin";
    document.getElementById("tabSignIn").classList.toggle("active", isSignIn);
    document.getElementById("tabSignUp").classList.toggle("active", !isSignIn);
    document.getElementById("signInForm").classList.toggle("hidden", !isSignIn);
    document.getElementById("signUpForm").classList.toggle("hidden", isSignIn);
  }

  async function handleSignIn(e) {
    e.preventDefault();
    clearMessages();
    const email = document.getElementById("signInEmail").value.trim();
    const password = document.getElementById("signInPassword").value;
    try {
      KM.utils.showLoading(true);
      await KM.fbAuth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged (in app.js) takes over from here.
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      KM.utils.showLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    clearMessages();
    const businessName = document.getElementById("signUpBusinessName").value.trim();
    const ownerName = document.getElementById("signUpOwnerName").value.trim();
    const email = document.getElementById("signUpEmail").value.trim();
    const password = document.getElementById("signUpPassword").value;
    const confirmPassword = document.getElementById("signUpConfirmPassword").value;

    if (password !== confirmPassword) {
      showError("Password aur Confirm Password match nahi karte.");
      return;
    }

    try {
      KM.utils.showLoading(true);
      const cred = await KM.fbAuth.createUserWithEmailAndPassword(email, password);
      await KM.db.createBusiness(cred.user.uid, { businessName, ownerName, email });
      // onAuthStateChanged (in app.js) takes over from here.
    } catch (err) {
      showError(friendlyAuthError(err));
    } finally {
      KM.utils.showLoading(false);
    }
  }

  async function handleForgotPassword() {
    clearMessages();
    const email = (document.getElementById("signInEmail").value || "").trim();
    if (!email) {
      showError("Pehle apna email likhein, phir 'Password bhool gaye?' dabayein.");
      return;
    }
    try {
      await KM.fbAuth.sendPasswordResetEmail(email);
      showInfo("Password reset link aapke email par bhej diya gaya hai.");
    } catch (err) {
      showError(friendlyAuthError(err));
    }
  }

  async function logout() {
    await KM.fbAuth.signOut();
  }

  function init() {
    document.getElementById("tabSignIn").addEventListener("click", () => switchTab("signin"));
    document.getElementById("tabSignUp").addEventListener("click", () => switchTab("signup"));
    document.getElementById("signInForm").addEventListener("submit", handleSignIn);
    document.getElementById("signUpForm").addEventListener("submit", handleSignUp);
    document.getElementById("forgotPasswordBtn").addEventListener("click", handleForgotPassword);
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }

  KM.auth = { init, logout };
})();
