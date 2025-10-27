export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`/api${path}`, { ...options, headers, cache: 'no-store' as RequestCache });

  if (!res.ok) {
    // repasse o JSON de erro se existir (útil pra debug)
    let details = '';
    try { details = JSON.stringify(await res.json()); } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText} ${details}`);
  }
  // alguns endpoints podem retornar 204
  try { return await res.json(); } catch { return null; }
}
