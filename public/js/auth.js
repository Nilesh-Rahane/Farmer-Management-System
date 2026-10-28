/**
 * Farm Ledger - Authentication Controller
 * Supports both Farmer Portal and Worker Portal (Login & Registration)
 */
const Auth = (() => {
  let currentAuthMode = 'login'; // 'login' | 'register'
  let currentRole = 'farmer'; // 'farmer' | 'worker'
  let cachedFarms = [];

  const init = () => {
    bindEvents();
    renderAuthUI();
  };

  const bindEvents = () => {
    // Mode toggles (Login vs Register)
    const loginToggleBtn = document.getElementById('btn-mode-login');
    const registerToggleBtn = document.getElementById('btn-mode-register');
    if (loginToggleBtn) loginToggleBtn.addEventListener('click', () => setMode('login'));
    if (registerToggleBtn) registerToggleBtn.addEventListener('click', () => setMode('register'));

    // Role tabs (Farmer vs Worker)
    const farmerRoleTab = document.getElementById('tab-role-farmer');
    const workerRoleTab = document.getElementById('tab-role-worker');
    if (farmerRoleTab) farmerRoleTab.addEventListener('click', () => setRole('farmer'));
    if (workerRoleTab) workerRoleTab.addEventListener('click', () => setRole('worker'));

    // Form Submissions
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
  };

  const setMode = (mode) => {
    // Worker portal only supports login mode
    if (currentRole === 'worker' && mode === 'register') {
      currentAuthMode = 'login';
    } else {
      currentAuthMode = mode;
    }
    renderAuthUI();
  };

  const setRole = (role) => {
    currentRole = role;
    // Worker portal does not have a registration option
    if (role === 'worker') {
      currentAuthMode = 'login';
    }
    renderAuthUI();
  };

  const renderAuthUI = () => {
    const loginSection = document.getElementById('section-login');
    const registerSection = document.getElementById('section-register');
    const farmerTab = document.getElementById('tab-role-farmer');
    const workerTab = document.getElementById('tab-role-worker');
    const btnLoginTab = document.getElementById('btn-mode-login');
    const btnRegisterTab = document.getElementById('btn-mode-register');
    const labelModeRegister = document.getElementById('label-mode-register');
    const labelRegName = document.getElementById('label-reg-name');
    const farmerFields = document.getElementById('reg-farmer-fields');
    const workerNotice = document.getElementById('worker-login-notice');

    // Update active role tab buttons
    if (farmerTab) farmerTab.classList.toggle('active', currentRole === 'farmer');
    if (workerTab) workerTab.classList.toggle('active', currentRole === 'worker');

    // Role-specific display: Worker portal has NO register option
    if (currentRole === 'worker') {
      if (btnRegisterTab) btnRegisterTab.style.display = 'none';
      if (workerNotice) workerNotice.style.display = 'block';
      currentAuthMode = 'login';
    } else {
      if (btnRegisterTab) btnRegisterTab.style.display = 'inline-flex';
      if (workerNotice) workerNotice.style.display = 'none';
      if (labelModeRegister) labelModeRegister.textContent = 'Register New Farm';
      if (labelRegName) labelRegName.textContent = 'Farmer Full Name *';
      if (farmerFields) farmerFields.style.display = 'block';
    }

    // Update mode buttons active styles
    if (btnLoginTab && btnRegisterTab) {
      if (currentAuthMode === 'login') {
        btnLoginTab.className = 'btn btn-sm btn-primary';
        btnRegisterTab.className = 'btn btn-sm btn-secondary';
      } else {
        btnLoginTab.className = 'btn btn-sm btn-secondary';
        btnRegisterTab.className = 'btn btn-sm btn-primary';
      }
    }

    // Toggle Section visibility
    if (currentAuthMode === 'login') {
      if (loginSection) loginSection.style.display = 'block';
      if (registerSection) registerSection.style.display = 'none';
    } else {
      if (loginSection) loginSection.style.display = 'none';
      if (registerSection) registerSection.style.display = 'block';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) {
      App.showToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      }

      const res = await API.auth.login({
        email,
        password,
      });

      API.setToken(res.token);
      API.setUser(res.user);
      document.documentElement.classList.add('is-authenticated');

      App.showToast(res.message || 'Login successful!', 'success');
      App.handleAuthStateChange();
    } catch (err) {
      App.showToast(err.message || 'Login failed', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to Dashboard <i class="fas fa-arrow-right"></i>';
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value.trim();

    const submitBtn = document.getElementById('btn-submit-register');

    if (!name || !email || !password) {
      App.showToast('Please complete all required fields', 'warning');
      return;
    }

    if (password.length < 6) {
      App.showToast('Password must be at least 6 characters long', 'warning');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
      }

      let payload = {
        name,
        email,
        password,
        phone,
        role: 'farmer',
        farmName: document.getElementById('reg-farm-name')?.value.trim() || 'My Farm',
        farmLocation: document.getElementById('reg-farm-location')?.value.trim() || '',
        farmSizeAcres: document.getElementById('reg-farm-size')?.value || 0,
      };

      const res = await API.auth.register(payload);

      API.setToken(res.token);
      API.setUser(res.user);
      document.documentElement.classList.add('is-authenticated');

      App.showToast(res.message || 'Account registered successfully!', 'success');
      App.handleAuthStateChange();
    } catch (err) {
      App.showToast(err.message || 'Registration failed', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Register Farm & Continue <i class="fas fa-check"></i>';
      }
    }
  };

  const logout = () => {
    API.clearAuth();
    document.documentElement.classList.remove('is-authenticated');
    App.showToast('You have been logged out safely.', 'info');
    App.handleAuthStateChange();
  };

  return {
    init,
    logout,
    getCurrentRole: () => currentRole,
  };
})();
