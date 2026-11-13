import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login/', { username, password });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('user_info', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  },
};

const buildCleanQuery = (params = {}) => {
  const token = localStorage.getItem('access_token');
  const clean = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null') {
      clean[key] = val;
    }
  }
  if (token) clean.token = token;
  return new URLSearchParams(clean).toString();
};

export const participantsService = {
  getAll: async (params = {}) => {
    const response = await api.get('/participants/', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/participants/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/participants/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/participants/${id}/`, data);
    return response.data;
  },
  patch: async (id, data) => {
    const response = await api.patch(`/participants/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/participants/${id}/`);
    return response.data;
  },
  toggleCheckin: async (id) => {
    const response = await api.post(`/participants/${id}/toggle_checkin/`);
    return response.data;
  },
  toggleDayCheckin: async (id, day = 1) => {
    const response = await api.post(`/participants/${id}/toggle_day_checkin/`, { day });
    return response.data;
  },
  searchLookup: async (query) => {
    const response = await api.get('/participants/search_lookup/', { params: { q: query } });
    return response.data;
  },
  fastCheckin: async (params, day = '1') => {
    const payload = typeof params === 'object' ? params : { query: params, day };
    const response = await api.post('/participants/fast_checkin/', payload);
    return response.data;
  },
  bulkAction: async (action, ids) => {
    const response = await api.post('/participants/bulk_action/', { action, ids });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/participants/stats/');
    return response.data;
  },
  getExportUrl: (params = {}) => {
    const query = buildCleanQuery(params);
    return `/participants/export_csv/${query ? `?${query}` : ''}`;
  },
  getCheckinExportUrl: (params = {}) => {
    const query = buildCleanQuery(params);
    return `/participants/export_checkin_csv/${query ? `?${query}` : ''}`;
  },
  getDirectExportUrl: (params = {}) => {
    const query = buildCleanQuery(params);
    return `/api/participants/export_csv/${query ? `?${query}` : ''}`;
  },
  getDirectCheckinExportUrl: (params = {}) => {
    const query = buildCleanQuery(params);
    return `/api/participants/export_checkin_csv/${query ? `?${query}` : ''}`;
  },
  downloadExport: async (url, defaultFilename = 'summit_export.csv') => {
    // Clean url: strip '/api' prefix if present so axios baseURL='/api' is not duplicated
    const cleanUrl = url.startsWith('/api/') ? url.substring(4) : url;
    try {
      const response = await api.get(cleanUrl, { responseType: 'blob' });
      let filename = defaultFilename;
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          err.parsedMessage = json.error || json.detail || json.message;
        } catch (e) {
          // not json
        }
      }
      throw err;
    }
  },
};

export const syncService = {
  getConfig: async () => {
    const response = await api.get('/sync/config/');
    return response.data;
  },
  updateConfig: async (data) => {
    const response = await api.patch('/sync/config/', data);
    return response.data;
  },
  triggerSync: async (params = {}) => {
    const response = await api.post('/sync/trigger/', params);
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get('/sync/history/');
    return response.data;
  },
};

export const usersService = {
  getAll: async () => {
    const response = await api.get('/auth/users/');
    return response.data;
  },
  getRoles: async () => {
    const response = await api.get('/auth/users/roles/');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/auth/users/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/auth/users/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/auth/users/${id}/`, data);
    return response.data;
  },
  patch: async (id, data) => {
    const response = await api.patch(`/auth/users/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/auth/users/${id}/`);
    return response.data;
  },
};

export const invitedGuestsService = {
  lookup: async (query) => {
    const response = await api.get('/invited-guests/lookup/', { params: { q: query } });
    return response.data;
  },
  getAll: async (params = {}) => {
    const response = await api.get('/invited-guests/', { params });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/invited-guests/stats/');
    return response.data;
  },
  syncSheet: async (sheetUrl) => {
    const response = await api.post('/invited-guests/sync_sheet/', { sheet_url: sheetUrl });
    return response.data;
  },
  exportCsv: async (params = {}) => {
    const query = buildCleanQuery(params);
    const url = `/invited-guests/export_csv/${query ? `?${query}` : ''}`;
    return participantsService.downloadExport(url, 'invited_guests_reference.csv');
  },
};

export default api;

