import type { PAEnvironment, MigratableObject } from '@/types/environment';

const API_BASE = 'http://localhost:5000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API request failed');
  }
  return res.json();
}

/** Test that a PA environment is reachable */
export async function testConnection(env: Omit<PAEnvironment, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> {
  return request('/test-connection', {
    method: 'POST',
    body: JSON.stringify(env),
  });
}

/** List dimensions, cubes, and processes from a PA environment */
export async function listObjects(env: PAEnvironment): Promise<MigratableObject[]> {
  return request('/list-objects', {
    method: 'POST',
    body: JSON.stringify(env),
  });
}

/** Migrate selected objects from source to target environment */
export async function migrateObjects(
  source: PAEnvironment,
  target: PAEnvironment,
  objects: MigratableObject[]
): Promise<{ success: boolean; message: string; results: { name: string; status: string }[] }> {
  return request('/migrate', {
    method: 'POST',
    body: JSON.stringify({ source, target, objects }),
  });
}

// ─── Environment CRUD (per-user, stored on backend as JSON) ───

/** Fetch all environments for a given user */
export async function fetchEnvironments(username: string): Promise<PAEnvironment[]> {
  return request(`/environments?username=${encodeURIComponent(username)}`);
}

/** Create a new environment */
export async function createEnvironment(
  username: string,
  env: Omit<PAEnvironment, 'id' | 'createdAt'>
): Promise<PAEnvironment> {
  return request('/environments', {
    method: 'POST',
    body: JSON.stringify({ username, ...env }),
  });
}

/** Update an existing environment */
export async function updateEnvironmentApi(
  username: string,
  id: string,
  env: Omit<PAEnvironment, 'id' | 'createdAt'>
): Promise<PAEnvironment> {
  return request(`/environments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ username, ...env }),
  });
}

/** Delete an environment */
export async function deleteEnvironment(username: string, id: string): Promise<void> {
  return request(`/environments/${id}?username=${encodeURIComponent(username)}`, {
    method: 'DELETE',
  });
}

// ─── Auth (server-side) ───
export async function apiLogin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
export async function apiRegister(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
// ─── Environment CRUD (per-user, stored on backend as JSON) ───
