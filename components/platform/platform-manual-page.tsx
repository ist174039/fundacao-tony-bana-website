"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2,
  ChevronRight, CircleHelp, GitBranch, ListChecks, LockKeyhole,
  RotateCcw, Search, ShieldCheck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { areaFetch } from "@/lib/area-client"
import { onAuthChange } from "@/lib/firebase-auth"
import { manualGuides, type ManualGuide, type ManualRole } from "@/lib/platform-manual-data"

const progressKey = (uid: string) => `ftb-manual-progress-v1:${uid}`
const roleName: Record<ManualRole, string> = {
  admin: "Administração",
  operational: "Operações",
  socio: "Sócio",
}
const groupOrder = [
  "Início e conta", "Educação e apoio", "Doações e logística",
  "Documentos", "Sócios e finanças", "Pessoas e adesões", "Administração", "Website institucional"
]

export default function PlatformManualPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState("")
  const [role, setRole] = useState<ManualRole | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [activeGuide, setActiveGuide] = useState("acesso")
  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [progressReady, setProgressReady] = useState(false)

  useEffect(() => onAuthChange(user => {
    if (!user) {
      setRole(null)
      setUid("")
      setReady(false)
      router.replace("/platform/login")
      return
    }
    setUid(user.uid)
    void areaFetch<{ role: ManualRole }>("/api/area/session")
      .then(access => { setRole(access.role); setError("") })
      .catch(cause => {
        setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o perfil.")
      })
      .finally(() => setReady(true))
  }), [router])

  useEffect(() => {
    if (!uid) return
    try {
      const saved = window.localStorage.getItem(progressKey(uid))
      const parsed: unknown = saved ? JSON.parse(saved) : {}
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setCompleted(Object.fromEntries(Object.entries(parsed).filter(([key, value]) => /^(?:[a-z]+):\d+$/.test(key) && value === true)))
      }
    } catch {
      setCompleted({})
    }
    setProgressReady(true)
  }, [uid])

  useEffect(() => {
    if (!progressReady || !uid) return
    try { window.localStorage.setItem(progressKey(uid), JSON.stringify(completed)) } catch { /* Browser storage is optional. */ }
  }, [completed, uid, progressReady])

  const available = useMemo(
    () => manualGuides.filter(guide => role && guide.roles.includes(role)),
    [role],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt")
    return available.filter(guide => !q || [
      guide.title, guide.summary, guide.group, guide.steps.map(step => step.title).join(" "),
    ].join(" ").toLocaleLowerCase("pt").includes(q))
  }, [available, query])
  const groups = useMemo(
    () => [...new Set(filtered.map(guide => guide.group))]
      .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b)),
    [filtered],
  )
  const selected: ManualGuide | undefined = available.find(guide => guide.id === activeGuide) || available[0]
  const currentStep = selected?.steps[Math.min(activeStep, selected.steps.length - 1)]
  const completedForGuide = selected?.steps.filter((_, index) => completed[`${selected.id}:${index}`]).length || 0
  const totalSteps = available.reduce((sum, guide) => sum + guide.steps.length, 0)
  const finishedSteps = available.reduce(
    (sum, guide) => sum + guide.steps.filter((_, index) => completed[`${guide.id}:${index}`]).length, 0
  )
  const percent = totalSteps ? Math.round(finishedSteps / totalSteps * 100) : 0

  const selectGuide = (id: string) => { setActiveGuide(id); setActiveStep(0) }
  const toggleDone = () => {
    if (!selected) return
    const key = `${selected.id}:${activeStep}`
    setCompleted(previous => ({ ...previous, [key]: !previous[key] }))
  }
  const resetGuide = () => {
    if (!selected) return
    setCompleted(previous => {
      const next = { ...previous }
      selected.steps.forEach((_, index) => delete next[`${selected.id}:${index}`])
      return next
    })
    setActiveStep(0)
  }

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">A validar o acesso ao manual…</main>
  if (error || !role) return <main className="container min-h-screen py-12">
    <Alert variant="destructive"><AlertDescription>{error || "Perfil não encontrado."}</AlertDescription></Alert>
    <Button asChild className="mt-5"><Link href="/platform/login">Voltar ao início de sessão</Link></Button>
  </main>

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="container flex min-h-16 items-center justify-between gap-3 py-2">
        <Link href="/platform" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> <span>Espaço de trabalho</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>Manual de utilizador</span>
          <span className="hidden rounded-full border px-2 py-1 sm:inline">{roleName[role]}</span>
        </div>
      </div>
    </header>

    <main className="container max-w-[1510px] px-4 py-8 sm:py-10">
      <div className="mb-8 grid gap-6 rounded-3xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-primary"><GitBranch className="h-4 w-4" /> Guia interativo de processos</p>
          <h1 className="font-montserrat text-3xl font-bold tracking-tight sm:text-4xl">Manual de utilização da Fundação Tony Bana</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Percursos reais de trabalho com pré-requisitos, decisões, passos detalhados, resultados esperados e resolução de problemas.
            As instruções visíveis dependem do teu perfil. O acesso efetivo depende sempre das permissões e da ativação de cada módulo.
          </p>
        </div>
        <div className="min-w-[190px] rounded-2xl border bg-background p-4" aria-label="Progresso do manual">
          <p className="text-xs font-medium text-muted-foreground">O teu progresso neste dispositivo</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{percent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">{finishedSteps} de {totalSteps} passos assinalados</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="min-w-0" aria-label="Índice do manual">
          <Card className="lg:sticky lg:top-24">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary"/> Processos e módulos</CardTitle>
              <label htmlFor="manual-search" className="sr-only">Pesquisar no manual</label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="manual-search" data-testid="manual-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar processos e passos…" className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="max-h-[65vh] space-y-4 overflow-y-auto pb-6">
              {groups.map(group => <div key={group}>
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                <div className="space-y-1">
                  {filtered.filter(guide => guide.group === group).map(guide => {
                    const done = guide.steps.filter((_, index) => completed[`${guide.id}:${index}`]).length
                    return <button type="button" key={guide.id} onClick={() => selectGuide(guide.id)} aria-pressed={selected?.id === guide.id}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected?.id === guide.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}>
                      <span className="min-w-0 flex-1">{guide.title}</span>
                      <span className="shrink-0 text-[11px] tabular-nums opacity-70">{done}/{guide.steps.length}</span>
                    </button>
                  })}
                </div>
              </div>)}
              {filtered.length === 0 && <p className="px-2 text-sm text-muted-foreground">Sem resultados. Tenta outras palavras.</p>}
            </CardContent>
          </Card>
        </aside>

        {selected ? <section className="min-w-0 space-y-5" aria-label="Fluxo de trabalho selecionado">
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{selected.group} · {selected.steps.length} passos</p>
              <CardTitle className="mt-1 text-2xl">{selected.title}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.summary}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5"/> {selected.roles.map(r => roleName[r]).join(" · ")}</span>
                <span className="text-xs text-muted-foreground">{completedForGuide}/{selected.steps.length} concluídos</span>
                <Button variant="outline" size="sm" className="ml-auto" asChild><Link href={selected.location}>Abrir área da plataforma <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-primary" /> Antes de começar</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {selected.prerequisites.map((item, index) => <li key={index} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg"><GitBranch className="h-5 w-5 text-primary" /> Fluxo de trabalho</CardTitle>
              <p className="text-sm text-muted-foreground">Seleciona um nó do fluxo para ver as instruções desse passo.</p>
            </CardHeader>
            <CardContent>
              <div data-testid="workflow-diagram" className="flex flex-wrap items-center gap-2">
                {selected.steps.map((step, index) => <div key={step.title} className="flex items-center gap-2">
                  <button type="button" onClick={() => setActiveStep(index)} aria-current={activeStep === index ? "step" : undefined}
                    className={`flex max-w-[165px] min-h-16 flex-col justify-center gap-1 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${activeStep === index ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">{completed[`${selected.id}:${index}`] ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="tabular-nums">{index + 1}.</span>} Etapa</span>
                    <span className="text-xs font-semibold leading-4">{step.title}</span>
                  </button>
                  {index < selected.steps.length - 1 && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>)}
              </div>
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><CircleHelp className="h-4 w-4 text-primary"/> Decisão: {selected.decision.question}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold text-primary">SIM</p><p className="mt-1 text-sm leading-6">{selected.decision.yes}</p></div>
                  <div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold text-muted-foreground">NÃO</p><p className="mt-1 text-sm leading-6">{selected.decision.no}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentStep && <Card data-testid="current-step">
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-primary">Passo {activeStep + 1} de {selected.steps.length}</p>
              <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><ChevronRight className="h-4 w-4 text-primary" /> O que fazer</p>
                  <p className="text-sm leading-7 text-muted-foreground">{currentStep.action}</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary"/> Resultado esperado</p>
                  <p className="text-sm leading-7 text-muted-foreground">{currentStep.expected}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="mb-1 text-sm font-semibold">Se algo falhar</p>
                <p className="text-sm leading-6 text-muted-foreground">{currentStep.ifFail}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button type="button" onClick={toggleDone} variant={completed[`${selected.id}:${activeStep}`] ? "secondary" : "default"} size="sm">
                  <Check className="mr-2 h-4 w-4"/> {completed[`${selected.id}:${activeStep}`] ? "Passo concluído" : "Assinalar como concluído"}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={activeStep === 0} onClick={() => setActiveStep(index => Math.max(0, index - 1))}>
                  <ArrowLeft className="mr-1 h-4 w-4"/> Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={activeStep >= selected.steps.length - 1} onClick={() => setActiveStep(index => Math.min(selected.steps.length - 1, index + 1))}>
                  Próximo <ArrowRight className="ml-1 h-4 w-4"/>
                </Button>
                <Button type="button" variant="ghost" size="sm" className="sm:ml-auto" onClick={resetGuide}><RotateCcw className="mr-1 h-4 w-4"/> Reiniciar percurso</Button>
              </div>
            </CardContent>
          </Card>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary"/> Boa prática</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.tip}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-primary"/> Atenção</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.warning}</p>
            </div>
          </div>
          <p className="pb-6 text-xs leading-5 text-muted-foreground">
            O manual explica processos, mas não altera permissões nem confirma operações. Verifica sempre o resultado efetivo na aplicação; os passos assinalados são guardados apenas neste navegador e não constituem evidência de QA.
          </p>
        </section> : <div className="rounded-xl border p-6 text-sm text-muted-foreground">Nenhum percurso está disponível para este perfil.</div>}
      </div>
    </main>
  </div>
}
