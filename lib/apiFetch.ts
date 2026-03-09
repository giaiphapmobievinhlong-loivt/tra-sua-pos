// Wrapper around fetch that auto-attaches Authorization header from localStorage
// This is a fallback for environments where httpOnly cookies may not be forwarded correctly

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  // Attach token from localStorage if available (client-side only)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, { ...options, headers })
}
