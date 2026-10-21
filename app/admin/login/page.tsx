"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signInWithEmail } from "@/lib/firebase-auth"

export default function AdminLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signInWithEmail(formData.email, formData.password)
      router.push("/area")
    } catch {
      setError("Não foi possível iniciar sessão. Confirme as credenciais e tente novamente.")
      console.error("Admin sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top, hsl(var(--primary)/0.22), transparent_52%)]" />
      <Card className="site-card relative w-full max-w-md shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.jpg" alt="Fundação Tony Bana" width={100} height={100} className="rounded-full" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Área restrita</p>
          <CardTitle className="text-2xl font-montserrat">Acesso administrativo</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">Entre com as suas credenciais para gerir os conteúdos.</p>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
