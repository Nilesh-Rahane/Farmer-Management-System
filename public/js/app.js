/**
 * Farm Ledger - Core Application Orchestrator
 */
const App = (() => {
  let currentUser = null;

  const init = async () => {
    if (window.I18n) I18n.init();
    bindGlobalEvents();
    await handleAuthStateChange();
  };

  const bindGlobalEvents = () => {
    // Logout buttons
    document.querySelectorAll('.btn-logout').forEach((btn) => {
      btn.addEventListener('click', () => Auth.logout());
    });

    // Mobile sidebar toggle and overlay elements
    const farmerMenuBtn = document.getElementById('farmer-menu-toggle');
    const workerMenuBtn = document.getElementById('worker-menu-toggle');
    const farmerSidebar = document.getElementById('farmer-sidebar');
    const workerSidebar = document.getElementById('worker-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const closeMobileSidebar = () => {
      if (farmerSidebar) farmerSidebar.classList.remove('mobile-open');
      if (workerSidebar) workerSidebar.classList.remove('mobile-open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    };

    if (farmerMenuBtn && farmerSidebar) {
      farmerMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = farmerSidebar.classList.toggle('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active', isOpen);
      });
    }

    if (workerMenuBtn && workerSidebar) {
      workerMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = workerSidebar.classList.toggle('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active', isOpen);
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        closeMobileSidebar();
      });
    }

    // Auto-close sidebar on mobile when a nav item is clicked
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeMobileSidebar();
        }
      });
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (farmerSidebar && farmerSidebar.classList.contains('mobile-open') && !farmerSidebar.contains(e.target) && e.target !== farmerMenuBtn) {
          closeMobileSidebar();
        }
        if (workerSidebar && workerSidebar.classList.contains('mobile-open') && !workerSidebar.contains(e.target) && e.target !== workerMenuBtn) {
          closeMobileSidebar();
        }
      }
    });

    // Language Toggle Buttons
    document.querySelectorAll('.btn-lang-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.I18n) {
          I18n.toggleLanguage();
        }
      });
    });

    // Global Modal Backdrop Click / Close Button handling
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop.id);
        }
      });
    });

    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) closeModal(modal.id);
      });
    });

    // Global Seed Demo Data Button
    document.querySelectorAll('.btn-trigger-seed').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('This will populate the MongoDB database with realistic farm demo data (Farmer, Workers, Attendance logs, Expenses & Sales). Proceed?')) {
          return;
        }

        try {
          btn.disabled = true;
          const oldText = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Seeding MongoDB...';

          const res = await API.seedDemoData();
          showToast(res.message || 'Demo data generated!', 'success');

          // If currently authenticated, reload data
          if (API.isAuthenticated()) {
            await handleAuthStateChange();
          }
        } catch (err) {
          showToast(err.message || 'Seeding failed', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-database"></i> Seed Demo Data';
        }
      });
    });

    // Listen for Auth Expired event
    window.addEventListener('auth:expired', () => {
      showToast('Your session has expired. Please sign in again.', 'warning');
      handleAuthStateChange();
    });

    // Initialize Auth UI
    Auth.init();
  };

  const renderUserRoleDashboard = async (user) => {
    const authWrapper = document.getElementById('view-auth');
    const farmerWrapper = document.getElementById('view-farmer');
    const workerWrapper = document.getElementById('view-worker');

    if (authWrapper) authWrapper.style.display = 'none';

    if (user.role === 'farmer') {
      if (farmerWrapper) farmerWrapper.style.display = 'flex';
      if (workerWrapper) workerWrapper.style.display = 'none';

      // Update Farmer sidebar user snippet
      const nameEl = document.getElementById('farmer-user-name');
      const farmNameEl = document.getElementById('farmer-farm-name');
      const avatarEl = document.getElementById('farmer-avatar-letter');

      if (nameEl) nameEl.textContent = user.name;
      if (farmNameEl) farmNameEl.textContent = user.farmName || 'My Farm';
      if (avatarEl) avatarEl.textContent = (user.name && user.name[0]) ? user.name[0].toUpperCase() : 'F';

      await FarmerDashboard.init();
    } else if (user.role === 'worker') {
      if (farmerWrapper) farmerWrapper.style.display = 'none';
      if (workerWrapper) workerWrapper.style.display = 'flex';

      // Update Worker sidebar user snippet
      const nameEl = document.getElementById('worker-user-name');
      const avatarEl = document.getElementById('worker-avatar-letter');

      if (nameEl) nameEl.textContent = user.name;
      if (avatarEl) avatarEl.textContent = (user.name && user.name[0]) ? user.name[0].toUpperCase() : 'W';

      await WorkerDashboard.init();
    }

    if (window.I18n) I18n.applyTranslationsToDOM();
  };

  const handleAuthStateChange = async () => {
    const authWrapper = document.getElementById('view-auth');
    const farmerWrapper = document.getElementById('view-farmer');
    const workerWrapper = document.getElementById('view-worker');

    if (!API.isAuthenticated()) {
      currentUser = null;
      document.documentElement.classList.remove('is-authenticated');
      if (authWrapper) authWrapper.style.display = 'flex';
      if (farmerWrapper) farmerWrapper.style.display = 'none';
      if (workerWrapper) workerWrapper.style.display = 'none';
      if (window.I18n) I18n.applyTranslationsToDOM();
      return;
    }

    // Immediately render with cached user if present so refresh is instant and seamless
    const cachedUser = API.getUser();
    if (cachedUser && cachedUser.role) {
      currentUser = cachedUser;
      document.documentElement.classList.add('is-authenticated');
      await renderUserRoleDashboard(currentUser);
    }

    try {
      // Validate token with backend in background
      const res = await API.auth.me();
      currentUser = res.user;
      API.setUser(currentUser);
      document.documentElement.classList.add('is-authenticated');

      // If no cached user was present, render now
      if (!cachedUser || !cachedUser.role) {
        await renderUserRoleDashboard(currentUser);
      }
    } catch (err) {
      console.warn('Session verification notice:', err);
      // ONLY clear auth and force logout if backend explicitly returned 401 Unauthorized
      if (err.status === 401) {
        API.clearAuth();
        currentUser = null;
        document.documentElement.classList.remove('is-authenticated');
        if (authWrapper) authWrapper.style.display = 'flex';
        if (farmerWrapper) farmerWrapper.style.display = 'none';
        if (workerWrapper) workerWrapper.style.display = 'none';
        showToast('Your session has expired. Please sign in again.', 'warning');
      }
    }
  };

  // Toast Notification System
  const showToast = (message, type = 'info', duration = 3800) => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };

    const titles = {
      success: 'Success',
      error: 'Notice',
      warning: 'Attention',
      info: 'Information',
    };

    toast.innerHTML = `
      <div class="toast-icon text-${type}">
        <i class="fas ${icons[type] || 'fa-bell'}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${titles[type] || 'Notice'}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    const autoTimer = setTimeout(() => {
      removeToast(toast);
    }, duration);

    function removeToast(el) {
      clearTimeout(autoTimer);
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      setTimeout(() => el.remove(), 250);
    }
  };

  // Modal Dialog Utilities
  const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  return {
    init,
    handleAuthStateChange,
    showToast,
    openModal,
    closeModal,
    getCurrentUser: () => currentUser,
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
