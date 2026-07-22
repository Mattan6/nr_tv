import api from './api';

export const getContent = () => api.get('/content').then((res) => res.data);
export const getPanel = (panel) => api.get(`/content/${panel}`).then((res) => res.data);
export const createItem = (panel, data) => api.post(`/content/${panel}`, data).then((res) => res.data);
export const updateItem = (panel, id, data) =>
  api.put(`/content/${panel}/${id}`, data).then((res) => res.data);
export const deleteItem = (panel, id) =>
  api.delete(`/content/${panel}/${id}`).then((res) => res.data);
