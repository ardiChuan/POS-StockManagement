const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pos_token") : null;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${BASE}${path}`, { ...init, headers });
}

export function getStoredToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("pos_token") : null;
}

export function saveToken(token: string) {
  localStorage.setItem("pos_token", token);
}

export function clearToken() {
  localStorage.removeItem("pos_token");
}
