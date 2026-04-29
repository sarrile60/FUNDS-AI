import axios from "axios";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = {
  // procedure
  startProcedure:    (data) => axios.post(`${API}/procedure/start`, data).then(r => r.data),
  completeProcedure: () => axios.post(`${API}/procedure/complete`).then(r => r.data),
  procedureState:    () => axios.get(`${API}/procedure/state`).then(r => r.data),

  // recovery requests (user)
  createRecoveryRequest: (data) => axios.post(`${API}/recovery-requests`, data).then(r => r.data),

  // admin
  adminListUsers:    () => axios.get(`${API}/admin/users`).then(r => r.data),
  adminCreateUser:   (data) => axios.post(`${API}/admin/users`, data).then(r => r.data),
  adminUpdateUser:   (id, data) => axios.put(`${API}/admin/users/${id}`, data).then(r => r.data),
  adminDeleteUser:   (id) => axios.delete(`${API}/admin/users/${id}`).then(r => r.data),

  adminListRequests:   () => axios.get(`${API}/admin/recovery-requests`).then(r => r.data),
  adminUpdateRequest:  (id, data) => axios.put(`${API}/admin/recovery-requests/${id}`, data).then(r => r.data),
  adminMarkSent:       (id) => axios.post(`${API}/admin/recovery-requests/${id}/mark-sent`).then(r => r.data),
  adminDeleteRequest:  (id) => axios.delete(`${API}/admin/recovery-requests/${id}`).then(r => r.data),
};
