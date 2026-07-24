// Shared API helper — all frontend modules use this to talk to the backend.
const API_BASE = '/api';

function getToken() { return localStorage.getItem('psi_token'); }
function setToken(t) { localStorage.setItem('psi_token', t); }
function clearToken() { localStorage.removeItem('psi_token'); localStorage.removeItem('psi_user'); }
function getUser() { const u = localStorage.getItem('psi_user'); return u ? JSON.parse(u) : null; }
function setUser(u) { localStorage.setItem('psi_user', JSON.stringify(u)); }

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
