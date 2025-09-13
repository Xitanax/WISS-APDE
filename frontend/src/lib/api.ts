export type Role = "admin" | "applicant";

export const API = {
  async get<T>(url: string, token?: string): Promise<T> {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post<T>(url: string, body?: any, token?: string, asText = false): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(await res.text());
    return asText ? (await res.text() as T) : res.json();
  },
  async patch<T>(url: string, body?: any, token?: string): Promise<T> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async del<T>(url: string, token?: string): Promise<T> {
    const res = await fetch(url, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

export function apiUrl(p: string) {
  // im Container via Nginx → /api; im Vite-dev via Proxy
  return p.startsWith("/api") ? p : `/api${p}`;
}

export type Job = { id: string; title: string; description: string; open?: boolean; linkedinPostId?: string | null };
export type Application = {
  id: string;
  status: string;
  job?: { id: string; title: string; description?: string } | null;
  applicant?: { email: string; birthdate?: string | null; address?: string | null } | null;
  createdAt: string;
};
export type Meeting = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  mode: string;
  location: string;
  job?: { id: string; title: string } | null;
  applicant?: { email: string } | null;
};
