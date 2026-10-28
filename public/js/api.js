/**
 * Farm Ledger - Centralized API Service Client
 */
const API = (() => {
  const BASE_URL = '';
  const TOKEN_KEY = 'farm_ledger_token';
  const USER_KEY = 'farm_ledger_user';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
  const removeToken = () => localStorage.removeItem(TOKEN_KEY);

  const getUser = () => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  };

  const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
  const removeUser = () => localStorage.removeItem(USER_KEY);

  const clearAuth = () => {
    removeToken();
    removeUser();
  };

  const request = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register')) {
          clearAuth();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  };

  return {
    getToken,
    setToken,
    getUser,
    setUser,
    clearAuth,
    isAuthenticated: () => !!getToken(),

    // Auth endpoints
    auth: {
      login: (credentials) =>
        request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        }),
      register: (data) =>
        request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      me: () => request('/api/auth/me'),
      getFarms: () => request('/api/auth/farms'),
      updateProfile: (data) =>
        request('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },

    // Farmer-specific endpoints
    farmer: {
      getDashboard: () => request('/api/farmer/dashboard-summary'),
      getWorkers: () => request('/api/farmer/workers'),
      createWorker: (data) =>
        request('/api/farmer/workers', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      updateWorker: (id, data) =>
        request(`/api/farmer/workers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      deleteWorker: (id) =>
        request(`/api/farmer/workers/${id}`, {
          method: 'DELETE',
        }),
      getCrops: (params = '') => request(`/api/farmer/crops${params}`),
      createCrop: (data) =>
        request('/api/farmer/crops', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      updateCrop: (id, data) =>
        request(`/api/farmer/crops/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      deleteCrop: (id) =>
        request(`/api/farmer/crops/${id}`, {
          method: 'DELETE',
        }),
      getAttendance: (params = '') => request(`/api/farmer/attendance${params}`),
      markAttendance: (data) =>
        request('/api/farmer/attendance', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      updateAttendance: (id, data) =>
        request(`/api/farmer/attendance/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      deleteAttendance: (id) =>
        request(`/api/farmer/attendance/${id}`, {
          method: 'DELETE',
        }),
      getPayments: (params = '') => request(`/api/farmer/payments${params}`),
      createPayment: (data) =>
        request('/api/farmer/payments', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      deletePayment: (id) =>
        request(`/api/farmer/payments/${id}`, {
          method: 'DELETE',
        }),
      getExpenses: (params = '') => request(`/api/farmer/expenses${params}`),
      createExpense: (data) =>
        request('/api/farmer/expenses', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      updateExpense: (id, data) =>
        request(`/api/farmer/expenses/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      deleteExpense: (id) =>
        request(`/api/farmer/expenses/${id}`, {
          method: 'DELETE',
        }),
      getSales: (params = '') => request(`/api/farmer/sales${params}`),
      createSale: (data) =>
        request('/api/farmer/sales', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      updateSale: (id, data) =>
        request(`/api/farmer/sales/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      deleteSale: (id) =>
        request(`/api/farmer/sales/${id}`, {
          method: 'DELETE',
        }),
      getTransactions: (params = '') => request(`/api/farmer/transactions${params}`),
      getReports: (params = '') => request(`/api/farmer/reports${params}`),
      getCorrections: (params = '') => request(`/api/farmer/corrections${params}`),
      reviewCorrection: (id, data) =>
        request(`/api/farmer/corrections/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },

    // Worker-specific endpoints
    worker: {
      getDashboard: () => request('/api/worker/dashboard-summary'),
      getAttendance: (params = '') => request(`/api/worker/attendance${params}`),
      getPayments: (params = '') => request(`/api/worker/payments${params}`),
      getCorrections: (params = '') => request(`/api/worker/corrections${params}`),
      createCorrection: (data) =>
        request('/api/worker/corrections', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    // System endpoints
    seedDemoData: () =>
      request('/api/seed', {
        method: 'POST',
      }),
  };
})();
