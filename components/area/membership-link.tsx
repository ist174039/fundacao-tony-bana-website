"use client"

import { useState } from "react"
import { Link2, ShieldCheck } from "lucide-react"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MembershipLink() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function linkAccount() {
    setLoading(true)
    setError("")
    try {
      await areaFetch("/api/area/membership-link", { method: "POST", body: "{}" })
      window.location.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível associar a conta.")
    } finally {
      setLoading(false)
    }
  }

  return <Card className="site-card mt-5 max-w-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary"/>Associar a minha conta de sócio</CardTitle><CardDescription>Se já tens um registo de sócio, associa-o usando a conta com o mesmo email verificado. A associação só permite consultar os teus próprios dados.</CardDescription></CardHeader><CardContent className="space-y-4">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><p>Por segurança, o email da conta tem de estar verificado e coincidir com o email registado pela Fundação.</p></div>
    <Button onClick={() => void linkAccount()} disabled={loading}><Link2 className="mr-2 h-4 w-4"/>{loading ? "A verificar…" : "Associar a minha conta"}</Button>
  </CardContent></Card>
}
