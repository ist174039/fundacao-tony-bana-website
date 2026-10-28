"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { ArrowLeft, ChevronDown, LogOut, Menu, Search, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface AppShellProps {
  product: string
  title: string
  email: string
  onLogout: () => void
  sidebar: ReactNode
  children: ReactNode
  subtitle?: string
  headerLink?: { href: string; label: string }
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
}

export function WorkspaceTemplate({ product, title, email, onLogout, sidebar, children, subtitle, headerLink, search }: AppShellProps) {
  const [mobileNavOpen,setMobileNavOpen] = useState(false)
  return <div className="flex min-h-screen flex-col bg-background text-foreground">
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link href="/platform" aria-label="Ir para espaços de trabalho" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background p-1.5"><Image src="/logo.jpg" alt="Fundação Tony Bana" width={34} height={34} className="rounded-full object-contain"/></Link>
        <div className="hidden min-w-0 sm:block"><div className="flex items-center gap-1 text-[11px] text-muted-foreground"><span>Fundação Tony Bana</span><ChevronDown className="h-3 w-3"/></div><p className="truncate text-sm font-semibold">{product}</p></div>
        <div className="min-w-0 sm:hidden"><p className="truncate text-sm font-semibold">{product}</p></div>
        <span className="hidden h-6 w-px bg-border md:block"/>
        <div className="hidden min-w-0 md:block"><p className="truncate text-sm font-medium">{title}</p>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir navegação" aria-expanded={mobileNavOpen} onClick={()=>setMobileNavOpen(true)}><Menu className="h-5 w-5"/></Button>
        <Link href="/platform" className="hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"><ArrowLeft className="h-3.5 w-3.5"/>Espaços</Link>
        {headerLink && <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link href={headerLink.href}><ShieldCheck className="mr-2 h-4 w-4"/>{headerLink.label}</Link></Button>}
        <span title={email} className="hidden max-w-52 truncate rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground xl:inline-block">{email}</span>
        <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Terminar sessão" className="px-2 sm:px-3"><LogOut className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Sair</span></Button>
      </div>
    </header>
    <div className="mx-auto grid w-full max-w-[1800px] min-w-0 flex-1 lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden lg:block border-b bg-card/60 px-3 py-2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
        <div className="mb-2 hidden items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary"/>Navegação</div>
        {sidebar}
        {search && <div className="relative mt-4 hidden lg:block"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search.value} onChange={(event) => search.onChange(event.target.value)} placeholder={search.placeholder} className="h-9 pl-9 text-xs" aria-label={search.placeholder}/></div>}
        <div className="mt-6 hidden rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground lg:block"><p className="font-medium text-foreground">{product}</p><p className="mt-1">Fundação Tony Bana · espaço de trabalho</p></div>
      </aside>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}><SheetContent side="left" className="w-[min(88vw,22rem)] overflow-y-auto p-4 lg:hidden"><SheetHeader><SheetTitle className="text-left">{product}</SheetTitle></SheetHeader><nav aria-label="Navegação principal" className="mobile-workspace-nav mt-5" onClickCapture={event=>{if((event.target as HTMLElement).closest('[role="tab"]'))setMobileNavOpen(false)}}>{sidebar}</nav>{search&&<div className="mt-5"><Input value={search.value} onChange={event=>search.onChange(event.target.value)} placeholder={search.placeholder} aria-label={search.placeholder}/></div>}</SheetContent></Sheet>
      <main className="min-w-0 w-full px-3 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:px-6 lg:py-7 xl:px-8">{children}</main>
    </div>
  </div>
}

export const AppShell = WorkspaceTemplate
