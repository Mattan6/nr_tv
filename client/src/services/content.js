import api from './api';

export const getContent = () => api.get('/content').then((res) => res.data);
export const getPanel = (panel) => api.get(`/content/${panel}`).then((res) => res.data);
export const createItem = (panel, data) => api.post(`/content/${panel}`, data).then((res) => res.data);
export const updateItem = (panel, id, data) =>
  api.put(`/content/${panel}/${id}`, data).then((res) => res.data);
export const deleteItem = (panel, id) =>
  api.delete(`/content/${panel}/${id}`).then((res) => res.data);

// Reordering posts the WHOLE id list rather than "move this one up", so the server can reject
// an order computed against a list it no longer holds — see reorderPanel in the controller.
export const reorderPanel = (panel, ids) =>
  api.put(`/content/${panel}/order`, { ids }).then((res) => res.data);

// The שבת time overrides — one record, not a panel, hence its own pair of calls. A PUT
// replaces all five keys; a blank one clears that row back to the automatic value.
export const getSettings = () => api.get('/content/settings').then((res) => res.data);
export const updateSettings = (data) => api.put('/content/settings', data).then((res) => res.data);
