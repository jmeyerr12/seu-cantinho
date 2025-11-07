export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    cache: 'no-store' as RequestCache,
  });

  if (!res.ok) {
    // se o token for inválido ou expirado
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    // repasse o JSON de erro se existir (útil pra debug)
    let details = '';
    try {
      details = JSON.stringify(await res.json());
    } catch {}

    throw new Error(`HTTP ${res.status} ${res.statusText} ${details}`);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}
