export const BACKEND_URL = process.env.BACKEND_URL;

export async function serverApi(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, cache: 'no-store' as RequestCache });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  try { return await res.json(); } catch { return null; }
}
