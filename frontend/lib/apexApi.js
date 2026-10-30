import { request } from './apexHttp';

/** Every backend endpoint the app uses, in one place. See api/openapi.yaml. */
export const apexApi = {
  config: () => request('/config'),
  me: () => request('/me'),

  master: {
    employees: () => request('/master/employees'),
    materials: () => request('/master/materials'),
    equipment: () => request('/master/equipment'),
    expenses: () => request('/master/expenses'),
    trades: () => request('/master/trades'),
    issues: () => request('/master/issues'),
    jobs: (divisions) => request('/master/jobs', { params: { division: divisions } }),
    division: (employee) => request('/master/division', { params: { employee } }),
  },

  tags: {
    list: (signal) => request('/tags', { signal }),
    get: (id, signal) => request(`/tags/${encodeURIComponent(id)}`, { signal }),
    create: (body) => request('/tags', { method: 'POST', body }),
    update: (id, body) => request(`/tags/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    submit: (id, body) => request(`/tags/${encodeURIComponent(id)}/submit`, { method: 'POST', body }),
    approve: (id) => request(`/tags/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
    reject: (id) => request(`/tags/${encodeURIComponent(id)}/reject`, { method: 'POST' }),
    remove: (id) => request(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  attachments: {
    upload: (tagId, file, name) => {
      const form = new FormData();
      form.append('file', file, name || file.name);
      return request(`/tags/${encodeURIComponent(tagId)}/attachments`, { method: 'POST', body: form });
    },
    remove: (tagId, attachmentId) =>
      request(`/tags/${encodeURIComponent(tagId)}/attachments/${attachmentId}`, { method: 'DELETE' }),
  },

  approvers: {
    list: (customer) => request('/approvers', { params: { customer } }),
    add: (body) => request('/approvers', { method: 'POST', body }),
  },
};
