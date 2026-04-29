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

  // documents
  listDocuments:    () => axios.get(`${API}/documents`).then(r => r.data),
  uploadDocument:   (file, onProgress) => {
    const fd = new FormData();
    fd.append("file", file);
    return axios.post(`${API}/documents/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }).then(r => r.data);
  },
  deleteDocument:   (id) => axios.delete(`${API}/documents/${id}`).then(r => r.data),

  // admin
  adminListUsers:    () => axios.get(`${API}/admin/users`).then(r => r.data),
  adminCreateUser:   (data) => axios.post(`${API}/admin/users`, data).then(r => r.data),
  adminUpdateUser:   (id, data) => axios.put(`${API}/admin/users/${id}`, data).then(r => r.data),
  adminDeleteUser:   (id) => axios.delete(`${API}/admin/users/${id}`).then(r => r.data),

  adminListRequests:   () => axios.get(`${API}/admin/recovery-requests`).then(r => r.data),
  adminUpdateRequest:  (id, data) => axios.put(`${API}/admin/recovery-requests/${id}`, data).then(r => r.data),
  adminMarkSent:       (id) => axios.post(`${API}/admin/recovery-requests/${id}/mark-sent`).then(r => r.data),
  adminSendEmail:      (id) => axios.post(`${API}/admin/recovery-requests/${id}/send-email`).then(r => r.data),
  adminDeleteRequest:  (id) => axios.delete(`${API}/admin/recovery-requests/${id}`).then(r => r.data),

  adminListUserDocuments: (userId) => axios.get(`${API}/admin/users/${userId}/documents`).then(r => r.data),
};
