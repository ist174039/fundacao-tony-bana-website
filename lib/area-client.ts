import { auth } from "@/lib/firebase"

export async function areaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error("A sessão expirou. Inicia sessão novamente.")
  // Refresh claims and email verification state after an admin changes access.
  const token = await user.getIdToken(true)
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = typeof data.error === "string" ? data.error : "Não foi possível concluir a operação."
    throw new Error(typeof data.code === "string" ? `${error} (${data.code})` : error)
  }
  return data as T
}
