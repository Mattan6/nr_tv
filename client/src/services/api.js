import axios from 'axios';

// Relative by default — same origin as the page itself.
//
// In production one Express process serves both the built client and the API
// (server/src/app.js); in development Vite forwards /api to the server (vite.config.js).
// Either way this one path works from the TV, from a phone on the shul's WiFi and from a
// phone anywhere on the internet.
//
// It replaced a hardcoded `${hostname}:5000`, which was right on a LAN and wrong the
// moment the system was served over HTTPS on a real domain: the request would go to
// `https://example.com:5000`, where nothing listens, and a browser would refuse it as
// mixed content even if something did.
//
// Set VITE_API_URL only when the API genuinely runs on a different host from the page.
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');

// Announcements
export const getAnnouncements = () => api.get('/announcements');
export const createAnnouncement = (data) => api.post('/announcements', data);
export const updateAnnouncement = (id, data) => api.put(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// Events
export const getEvents = () => api.get('/events');
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

export default api;
