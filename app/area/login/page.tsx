"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmail } from "@/lib/firebase-auth"
import { areaFetch } from "@/lib/area-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AreaLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      await areaFetch<{ role: "admin" | "socio" }>("/api/area/session")
      router.replace("/area")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar o acesso à área.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%)]" />
      <Card className="site-card relative w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center"><Image src="/logo.jpg" alt="Fundação Tony Bana" width={84} height={84} className="rounded-full" /></div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Gestão da Fundação</p>
          <CardTitle className="text-2xl">Entrar na área de trabalho</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">Use a conta autorizada pela Fundação para consultar sócios, quotas e doações.</p>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="area-email">Email</Label><Input id="area-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} /></div>
            <div className="space-y-2"><Label htmlFor="area-password">Senha</Label><Input id="area-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "A validar acesso…" : "Entrar na área"}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/" className="underline underline-offset-4 hover:text-foreground">Voltar ao site</Link></p>
        </CardContent>
      </Card>
    </main>
  )
}
