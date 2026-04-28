import axios from "axios";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = {
  createCase:   (data) => axios.post(`${API}/cases`, data).then(r => r.data),
  listCases:    () => axios.get(`${API}/cases`).then(r => r.data),
  getCase:      (id) => axios.get(`${API}/cases/${id}`).then(r => r.data),
  updateCase:   (id, data) => axios.put(`${API}/cases/${id}`, data).then(r => r.data),
  addTransaction:(id, data) => axios.post(`${API}/cases/${id}/transactions`, data).then(r => r.data),
  listTransactions:(id) => axios.get(`${API}/cases/${id}/transactions`).then(r => r.data),
  addEvidence:  (id, data) => axios.post(`${API}/cases/${id}/evidence`, data).then(r => r.data),
  listEvidence: (id) => axios.get(`${API}/cases/${id}/evidence`).then(r => r.data),
  analyze:      (id, lang = "it") => axios.post(`${API}/cases/${id}/analyze`, null, { params: { lang } }).then(r => r.data),
  getAnalysis:  (id) => axios.get(`${API}/cases/${id}/analysis`).then(r => r.data),
  createReport: (id, data) => axios.post(`${API}/cases/${id}/reports`, data).then(r => r.data),
  listReports:  (id) => axios.get(`${API}/cases/${id}/reports`).then(r => r.data),
};
