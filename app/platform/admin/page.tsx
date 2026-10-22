"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Users, Newspaper, Handshake, Eye, Pencil, Trash2, Plus, Images, LayoutDashboard } from "lucide-react"
import { Drawer as Dialog, DrawerContent as DialogContent, DrawerDescription as DialogDescription, DrawerHeader as DialogHeader, DrawerTitle as DialogTitle } from "@/components/workspace/drawer"
import { CarouselForm } from "@/components/admin/carousel-form"
import { MemberForm } from "@/components/admin/member-form"
import { NewsForm } from "@/components/admin/news-form"
import { PartnerForm } from "@/components/admin/partner-form"
import {
  addDocument,
  uploadImage,
  updateDocument,
  COLLECTIONS,
  getCollection,
  deleteDocument,
  Noticia,
  Membro,
  Parceiro,
  CarrosselItem,
} from "@/lib/firebase-firestore"
import { onAuthChange, signOut } from "@/lib/firebase-auth"
import { areaFetch } from "@/lib/area-client"
import { ContentOverviewChart } from "@/components/admin/content-overview-chart"
import { WorkspaceTemplate } from "@/components/workspace/app-shell"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ListControls } from "@/components/workspace/list-controls"

type PreviewItem =
  | { kind: "noticia"; item: Noticia }
  | { kind: "membro"; item: Membro }
  | { kind: "parceiro"; item: Parceiro }
  | { kind: "carrossel"; item: CarrosselItem }

const imagePath = (folder: string, file: File) =>
  `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

export default function AdminDashboard() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [openMember, setOpenMember] = useState(false)
  const [openNews, setOpenNews] = useState(false)
  const [openPartner, setOpenPartner] = useState(false)
  const [members, setMembers] = useState<Membro[]>([])
  const [news, setNews] = useState<Noticia[]>([])
  const [partners, setPartners] = useState<Parceiro[]>([])
  const [carrossel, setCarrossel] = useState<CarrosselItem[]>([])
  const [editingMember, setEditingMember] = useState<Membro | null>(null)
  const [editingNews, setEditingNews] = useState<Noticia | null>(null)
  const [editingPartner, setEditingPartner] = useState<Parceiro | null>(null)
  const [editingCarousel, setEditingCarousel] = useState<CarrosselItem | null>(null)
  const [openCarousel, setOpenCarousel] = useState(false)
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [contentSearch, setContentSearch] = useState("")
  const [sectionFilters, setSectionFilters] = useState({ noticias: "all", membros: "all", parceiros: "all", carrossel: "all" })
  const [sectionPages, setSectionPages] = useState({ noticias: 1, membros: 1, parceiros: 1, carrossel: 1 })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ collectionName: string; id: string; label: string } | null>(null)
  const searchTerm = contentSearch.trim().toLocaleLowerCase()
  const searchedNews = news.filter((item) => `${item.titulo} ${item.descricao}`.toLocaleLowerCase().includes(searchTerm))
  const searchedMembers = members.filter((item) => `${item.nome} ${item.cargo}`.toLocaleLowerCase().includes(searchTerm))
  const searchedPartners = partners.filter((item) => `${item.nome} ${item.website} ${item.descricao}`.toLocaleLowerCase().includes(searchTerm))
  const searchedCarousel = carrossel.filter((item) => `${item.titulo} ${item.categoria} ${item.data}`.toLocaleLowerCase().includes(searchTerm))
  const visibleNews = searchedNews.filter((item) => sectionFilters.noticias === "all" || (sectionFilters.noticias === "featured" ? item.destaque : !item.destaque))
  const visibleMembers = searchedMembers.filter((item) => sectionFilters.membros === "all" || item.cargo === sectionFilters.membros)
  const visiblePartners = searchedPartners.filter((item) => sectionFilters.parceiros === "all" || (sectionFilters.parceiros === "website" ? Boolean(item.website) : !item.website))
  const visibleCarousel = searchedCarousel.filter((item) => sectionFilters.carrossel === "all" || (sectionFilters.carrossel === "comunidade" ? !item.categoria || item.categoria === "comunidade" : item.categoria === sectionFilters.carrossel))
  const pageItems = <T,>(items: T[], key: keyof typeof sectionPages) => items.slice((sectionPages[key] - 1) * 10, sectionPages[key] * 10)
  const setFilter = (key: keyof typeof sectionFilters, value: string) => { setSectionFilters((filters) => ({ ...filters, [key]: value })); setSectionPages((pages) => ({ ...pages, [key]: 1 })) }
  const setPage = (key: keyof typeof sectionPages, value: number) => setSectionPages((pages) => ({ ...pages, [key]: value }))
  useEffect(() => { setSectionPages({ noticias: 1, membros: 1, parceiros: 1, carrossel: 1 }) }, [searchTerm])
  const pagedCarousel = pageItems(visibleCarousel, "carrossel")
  const galleryGroups = [
    { id: "desporto", label: "Desporto", items: pagedCarousel.filter((item) => item.categoria === "desporto") },
    { id: "educacao", label: "Educação", items: pagedCarousel.filter((item) => item.categoria === "educacao") },
    { id: "saude", label: "Saúde", items: pagedCarousel.filter((item) => item.categoria === "saude") },
    { id: "comunidade", label: "Comunidade / geral", items: pagedCarousel.filter((item) => !item.categoria || item.categoria === "comunidade") },
  ]

  const showPreview = (item: PreviewItem) => { setPreviewItem(item); setPreviewOpen(true) }

  const loadAll = useCallback(async () => {
    try {
      const [m, n, p, c] = await Promise.all([
        getCollection<Membro>(COLLECTIONS.MEMBROS),
        getCollection<Noticia>(COLLECTIONS.NOTICIAS),
        getCollection<Parceiro>(COLLECTIONS.PARCEIROS),
        getCollection<CarrosselItem>(COLLECTIONS.CARROSSEL),
      ])
      setMembers(m)
      setNews(n)
      setPartners(p)
      setCarrossel(c)
      setLoadError(null)
    } catch (err) {
      console.error("Unable to load admin collections")
      setLoadError("Não foi possível carregar os conteúdos. Confirme o acesso e tente novamente.")
    }
  }, [])

  useEffect(() => {
    // Wait for persisted Firebase session restoration before requesting admin data.
    // Firestore and Storage Security Rules remain responsible for admin authorization.
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        setAuthReady(true)
        setIsAuthenticated(false)
        setUserEmail(null)
        setMembers([])
        setNews([])
        setPartners([])
        setCarrossel([])
        router.replace("/platform/login")
        return
      }

      setUserEmail(user.email ?? null)
      void areaFetch<{ role: "admin" | "socio" }>("/api/area/session")
        .then(({ role }) => {
          if (role !== "admin") {
            setIsAuthenticated(false)
            router.replace("/platform/area")
            return
          }
          setIsAuthenticated(true)
        })
        .catch(() => {
          setIsAuthenticated(false)
          router.replace("/platform/login")
        })
        .finally(() => setAuthReady(true))
    })

    return unsubscribe
  }, [router])

  useEffect(() => {
    if (!authReady || !isAuthenticated) return
    setLoadError(null)
    void loadAll()
  }, [authReady, isAuthenticated, loadAll])

  const handleAddMember = async (data: Partial<Membro>, imageFile?: File) => {
    if (!isAuthenticated) {
      alert("Você precisa estar logado para adicionar membros. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let imageUrl = data.imagem || ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, imagePath("membros", imageFile))
      }
      await addDocument(COLLECTIONS.MEMBROS, { ...data, imagem: imageUrl })
      setOpenMember(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to create member")
      throw err
    }
  }

  const handleUpdateMember = async (data: Partial<Membro>, imageFile?: File) => {
    if (!editingMember) return
    if (!isAuthenticated) {
      alert("Você precisa estar logado para atualizar membros. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let imageUrl = data.imagem ?? editingMember.imagem ?? ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, imagePath("membros", imageFile))
      }
      await updateDocument(COLLECTIONS.MEMBROS, editingMember.id, { ...data, imagem: imageUrl })
      setEditingMember(null)
      setOpenMember(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to update member")
      throw err
    }
  }

  const handleAddNews = async (data: Partial<Noticia>, imageFile?: File) => {
    if (!isAuthenticated) {
      alert("Você precisa estar logado para adicionar notícias. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let imageUrl = data.imagem || ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, imagePath("noticias", imageFile))
      }
      await addDocument(COLLECTIONS.NOTICIAS, { ...data, imagem: imageUrl })
      setOpenNews(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to create news item")
      throw err
    }
  }

  const handleUpdateNews = async (data: Partial<Noticia>, imageFile?: File) => {
    if (!editingNews) return
    if (!isAuthenticated) {
      alert("Você precisa estar logado para atualizar notícias. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let imageUrl = data.imagem ?? editingNews.imagem ?? ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, imagePath("noticias", imageFile))
      }
      await updateDocument(COLLECTIONS.NOTICIAS, editingNews.id, { ...data, imagem: imageUrl })
      setEditingNews(null)
      setOpenNews(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to update news item")
      throw err
    }
  }

  const handleAddPartner = async (data: Partial<Parceiro>, logoFile?: File) => {
    if (!isAuthenticated) {
      alert("Você precisa estar logado para adicionar parceiros. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let logoUrl = data.logo || ""
      if (logoFile) {
        logoUrl = await uploadImage(logoFile, imagePath("parceiros", logoFile))
      }
      await addDocument(COLLECTIONS.PARCEIROS, { ...data, logo: logoUrl })
      setOpenPartner(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to create partner")
      throw err
    }
  }

  const handleUpdatePartner = async (data: Partial<Parceiro>, logoFile?: File) => {
    if (!editingPartner) return
    if (!isAuthenticated) {
      alert("Você precisa estar logado para atualizar parceiros. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let logoUrl = data.logo ?? editingPartner.logo ?? ""
      if (logoFile) {
        logoUrl = await uploadImage(logoFile, imagePath("parceiros", logoFile))
      }
      await updateDocument(COLLECTIONS.PARCEIROS, editingPartner.id, { ...data, logo: logoUrl })
      setEditingPartner(null)
      setOpenPartner(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to update partner")
      throw err
    }
  }

  const handleAddCarousel = async (data: Partial<CarrosselItem>, imageFile?: File) => {
    if (!isAuthenticated) {
      alert("Você precisa estar logado para adicionar imagens ao carrossel. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let imageUrl = data.imagem || ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, imagePath("carrossel", imageFile))
      }
      await addDocument(COLLECTIONS.CARROSSEL, { ...data, imagem: imageUrl })
      setOpenCarousel(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to create gallery item")
      throw err
    }
  }

  const handleUpdateCarousel = async (data: Partial<CarrosselItem>, imageFile?: File) => {
    if (!editingCarousel) return
    if (!isAuthenticated) {
      alert("Você precisa estar logado para atualizar o carrossel. Redirecionando para login.")
      router.push("/platform/login")
      return
    }
    try {
      let imageUrl = data.imagem ?? editingCarousel.imagem ?? ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, imagePath("carrossel", imageFile))
      }
      await updateDocument(COLLECTIONS.CARROSSEL, editingCarousel.id, { ...data, imagem: imageUrl })
      setEditingCarousel(null)
      setOpenCarousel(false)
      await loadAll()
    } catch (err) {
      console.error("Unable to update gallery item")
      throw err
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      if (!isAuthenticated) {
        alert("Você precisa estar logado para remover itens. Redirecionando para login.")
        router.push("/platform/login")
        return
      }
      await deleteDocument(pendingDelete.collectionName, pendingDelete.id)
      setPendingDelete(null)
      await loadAll()
    } catch (err) {
      console.error("Unable to delete admin content")
      setLoadError("Não foi possível remover este conteúdo. Tente novamente.")
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.replace("/platform/login")
    } catch (err) {
      console.error("Unable to sign out admin")
      alert("Não foi possível terminar a sessão. Tente novamente.")
    }
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <p role="status" className="text-sm text-muted-foreground">A verificar a sessão…</p>
      </main>
    )
  }

  if (!isAuthenticated) return null

  return (
    <Tabs defaultValue="overview" className="min-h-screen">
      <WorkspaceTemplate product="Administração do site" title="Conteúdos do site" email={userEmail ?? "Sessão iniciada"} onLogout={handleLogout} headerLink={{ href: "/platform/area", label: "Gestão de sócios" }} sidebar={
        <div className="space-y-3">
          <div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:pt-0">Conteúdo público</div>
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-transparent p-0 lg:flex-col lg:items-stretch lg:overflow-visible">
            <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="overview"><LayoutDashboard className="mr-2 h-4 w-4"/>Visão geral</TabsTrigger>
            <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="noticias"><Newspaper className="mr-2 h-4 w-4"/>Notícias <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">{news.length}</span></TabsTrigger>
            <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="membros"><Users className="mr-2 h-4 w-4"/>Equipa <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">{members.length}</span></TabsTrigger>
            <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="parceiros"><Handshake className="mr-2 h-4 w-4"/>Parceiros <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">{partners.length}</span></TabsTrigger>
            <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="carrossel"><Images className="mr-2 h-4 w-4"/>Galerias <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">{carrossel.length}</span></TabsTrigger>
          </TabsList>
        </div>
      }>
      <div className="space-y-6">
        {loadError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</div>}
        <TabsContent value="overview" className="mt-0 space-y-6">
        <div className="mb-2 border-b border-border/70 pb-5">
          <div className="flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
          <div className="max-w-xl"><div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><LayoutDashboard className="h-3.5 w-3.5"/> Visão geral</div><h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Conteúdos do site</h2><p className="mt-2.5 max-w-lg text-sm leading-6 text-muted-foreground">Organize notícias, equipa, parceiros e imagens num só lugar.</p></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{label:"Notícias",count:news.length,icon:Newspaper},{label:"Membros",count:members.length,icon:Users},{label:"Parceiros",count:partners.length,icon:Handshake},{label:"Galeria",count:carrossel.length,icon:Images}].map(({label,count,icon:Icon})=><div key={label} className="admin-stat-card min-w-[110px] rounded-lg border border-border/70 bg-card px-3.5 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.07] text-primary"><Icon className="h-4 w-4"/></span></div><div className="mt-3 text-2xl font-semibold tracking-tight text-card-foreground">{count}</div><p className="mt-0.5 text-[0.68rem] text-muted-foreground">registos publicados</p></div>)}
          </div>
          </div>
        </div>
        <div className="mb-7"><ContentOverviewChart news={news.length} members={members.length} partners={partners.length} gallery={carrossel.length}/></div>
        </TabsContent>
        <div className="space-y-5">
          {/* Notícias Tab */}
          <TabsContent value="noticias">
            <Card className="site-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Notícias</CardTitle><p className="mt-1 text-sm text-muted-foreground">Publicações e atualizações da fundação</p></div>
                <Button onClick={() => {setEditingNews(null);setOpenNews(true)}}><Plus className="mr-2 h-4 w-4"/>Nova notícia</Button>
              </CardHeader>
              <CardContent className="admin-list-content">
                <ListControls search={contentSearch} onSearchChange={(value) => { setContentSearch(value); setPage("noticias", 1) }} placeholder="Pesquisar notícia" filter={sectionFilters.noticias} onFilterChange={(value) => setFilter("noticias", value)} filterOptions={[{ value: "all", label: "Todas as notícias" }, { value: "featured", label: "Em destaque" }, { value: "standard", label: "Sem destaque" }]} page={sectionPages.noticias} pageCount={Math.max(1, Math.ceil(visibleNews.length / 10))} total={visibleNews.length} onPageChange={(value) => setPage("noticias", value)}/>
                {visibleNews.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhuma notícia corresponde à pesquisa." : news.length === 0 ? "Nenhuma notícia cadastrada ainda." : "Não há notícias para mostrar."}</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pageItems(visibleNews, "noticias").map((n) => (
                      <div key={n.id} className="admin-content-card site-card site-card-interactive flex min-w-0 gap-4 p-3.5">
                        {n.imagem ? <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted"><Image src={n.imagem} alt="" fill className="object-cover"/></div> : <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Newspaper className="h-7 w-7"/></div>}
                        <div className="flex min-w-0 flex-1 flex-col"><div className="font-semibold leading-snug">{n.titulo}</div><div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.descricao}</div><div className="mt-auto pt-2 text-xs text-muted-foreground">{n.data}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => showPreview({ kind: "noticia", item: n })}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setEditingNews(n)
                              setOpenNews(true)
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4"/>Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ collectionName: COLLECTIONS.NOTICIAS, id: n.id, label: n.titulo })}>
                            <Trash2 className="mr-1.5 h-4 w-4"/>Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membros Tab */}
          <TabsContent value="membros">
            <Card className="site-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Equipa</CardTitle><p className="mt-1 text-sm text-muted-foreground">Pessoas que fazem parte da fundação</p></div>
                <Button onClick={() => {setEditingMember(null);setOpenMember(true)}}><Plus className="mr-2 h-4 w-4"/>Novo membro</Button>
              </CardHeader>
              <CardContent className="admin-list-content">
                <ListControls search={contentSearch} onSearchChange={(value) => { setContentSearch(value); setPage("membros", 1) }} placeholder="Pesquisar pessoa da equipa" filter={sectionFilters.membros} onFilterChange={(value) => setFilter("membros", value)} filterOptions={[{ value: "all", label: "Todas as funções" }, ...Array.from(new Set(members.map((member) => member.cargo).filter(Boolean))).map((cargo) => ({ value: cargo, label: cargo }))]} page={sectionPages.membros} pageCount={Math.max(1, Math.ceil(visibleMembers.length / 10))} total={visibleMembers.length} onPageChange={(value) => setPage("membros", value)}/>
                {visibleMembers.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhum membro corresponde à pesquisa." : members.length === 0 ? "Nenhum membro cadastrado ainda." : "Não há membros para mostrar."}</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pageItems(visibleMembers, "membros").map((m) => (
                      <div key={m.id} className="admin-content-card site-card site-card-interactive flex items-center gap-4 p-3.5">
                        {m.imagem ? <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted"><Image src={m.imagem} alt={m.nome} fill className="object-cover"/></div> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-6 w-6"/></div>}
                        <div className="min-w-0 flex-1"><div className="font-semibold">{m.nome}</div><div className="text-sm text-muted-foreground">{m.cargo}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => showPreview({ kind: "membro", item: m })}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setEditingMember(m)
                              setOpenMember(true)
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4"/>Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ collectionName: COLLECTIONS.MEMBROS, id: m.id, label: m.nome })}>
                            <Trash2 className="mr-1.5 h-4 w-4"/>Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parceiros Tab */}
          <TabsContent value="parceiros">
            <Card className="site-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Parceiros</CardTitle><p className="mt-1 text-sm text-muted-foreground">Organizações que apoiam o nosso trabalho</p></div>
                <Button onClick={() => {setEditingPartner(null);setOpenPartner(true)}}><Plus className="mr-2 h-4 w-4"/>Novo parceiro</Button>
              </CardHeader>
              <CardContent className="admin-list-content">
                <ListControls search={contentSearch} onSearchChange={(value) => { setContentSearch(value); setPage("parceiros", 1) }} placeholder="Pesquisar parceiro" filter={sectionFilters.parceiros} onFilterChange={(value) => setFilter("parceiros", value)} filterOptions={[{ value: "all", label: "Todos os parceiros" }, { value: "website", label: "Com website" }, { value: "no-website", label: "Sem website" }]} page={sectionPages.parceiros} pageCount={Math.max(1, Math.ceil(visiblePartners.length / 10))} total={visiblePartners.length} onPageChange={(value) => setPage("parceiros", value)}/>
                {visiblePartners.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhum parceiro corresponde à pesquisa." : partners.length === 0 ? "Nenhum parceiro cadastrado ainda." : "Não há parceiros para mostrar."}</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {pageItems(visiblePartners, "parceiros").map((p) => (
                      <div key={p.id} className="admin-content-card site-card site-card-interactive flex items-center gap-4 p-3.5">
                        {p.logo ? <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted p-2"><Image src={p.logo} alt={p.nome} fill className="object-contain p-2"/></div> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Handshake className="h-6 w-6"/></div>}
                        <div className="min-w-0 flex-1"><div className="font-semibold">{p.nome}</div><div className="truncate text-sm text-muted-foreground">{p.website || p.descricao}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => showPreview({ kind: "parceiro", item: p })}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setEditingPartner(p)
                              setOpenPartner(true)
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4"/>Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ collectionName: COLLECTIONS.PARCEIROS, id: p.id, label: p.nome })}>
                            <Trash2 className="mr-1.5 h-4 w-4"/>Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Carrossel Tab */}
          <TabsContent value="carrossel">
            <Card className="site-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Galerias</CardTitle><p className="mt-1 text-sm text-muted-foreground">Imagens organizadas por área de atuação</p></div>
                <Button onClick={() => {setEditingCarousel(null);setOpenCarousel(true)}}><Plus className="mr-2 h-4 w-4"/>Adicionar imagem</Button>
              </CardHeader>
              <CardContent className="admin-list-content">
                <ListControls search={contentSearch} onSearchChange={(value) => { setContentSearch(value); setPage("carrossel", 1) }} placeholder="Pesquisar imagens da galeria" filter={sectionFilters.carrossel} onFilterChange={(value) => setFilter("carrossel", value)} filterOptions={[{ value: "all", label: "Todas as galerias" }, { value: "desporto", label: "Desporto" }, { value: "educacao", label: "Educação" }, { value: "saude", label: "Saúde" }, { value: "comunidade", label: "Comunidade / geral" }]} page={sectionPages.carrossel} pageCount={Math.max(1, Math.ceil(visibleCarousel.length / 10))} total={visibleCarousel.length} onPageChange={(value) => setPage("carrossel", value)}/>
                {visibleCarousel.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhuma imagem corresponde à pesquisa." : "Nenhuma imagem na galeria ainda."}</div>
                ) : (
                  <div className="space-y-8">
                    {galleryGroups.filter((group) => group.items.length > 0).map((group) => <section key={group.id} className="space-y-3"><div className="flex items-center justify-between border-b pb-2"><div><h3 className="font-semibold">{group.label}</h3><p className="text-xs text-muted-foreground">{group.items.length} {group.items.length === 1 ? "imagem" : "imagens"}</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map((c) => (
                      <div key={c.id} className="admin-content-card site-card site-card-interactive overflow-hidden">
                        <div className="relative aspect-[16/9] bg-muted">{c.imagem ? <Image src={c.imagem} alt={c.titulo || "Imagem da galeria"} fill className="object-cover"/> : <div className="flex h-full items-center justify-center text-muted-foreground"><Images className="h-8 w-8"/></div>}</div>
                        <div className="p-3"><div className="font-semibold">{c.titulo || "Imagem da galeria"}</div><div className="text-sm text-muted-foreground">{c.data}</div><div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => showPreview({ kind: "carrossel", item: c })}><Eye className="mr-1.5 h-4 w-4"/>Detalhes</Button>
                          <Button variant="outline" size="sm" onClick={() => {setEditingCarousel(c);setOpenCarousel(true)}}><Pencil className="mr-1.5 h-4 w-4"/>Editar</Button>
                          <Button variant="ghost" size="sm" aria-label={`Remover ${c.titulo || "imagem"} da galeria`} className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ collectionName: COLLECTIONS.CARROSSEL, id: c.id, label: c.titulo || "imagem da galeria" })}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                        </div>
                      </div>
                    ))}</div></section>)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </div>
      </WorkspaceTemplate>

      {/* Dialogs for adding items */}
      <Dialog open={openMember} onOpenChange={setOpenMember}>
        <DialogContent className="overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Editar membro" : "Adicionar membro"}</DialogTitle>
            <DialogDescription>Preencha os dados da pessoa e adicione a fotografia que será apresentada no site.</DialogDescription>
          </DialogHeader>
          <MemberForm
            key={editingMember?.id ?? "new-member"}
            member={editingMember ?? undefined}
            onSubmit={editingMember ? handleUpdateMember : handleAddMember}
            onCancel={() => {
              setEditingMember(null)
              setOpenMember(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openNews} onOpenChange={setOpenNews}>
        <DialogContent className="overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingNews ? "Editar notícia" : "Adicionar notícia"}</DialogTitle>
            <DialogDescription>Preencha o título, a data e a descrição da publicação. A imagem e a ligação são opcionais.</DialogDescription>
          </DialogHeader>
          <NewsForm
            key={editingNews?.id ?? "new-news"}
            news={editingNews ?? undefined}
            onSubmit={editingNews ? handleUpdateNews : handleAddNews}
            onCancel={() => {
              setEditingNews(null)
              setOpenNews(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openPartner} onOpenChange={setOpenPartner}>
        <DialogContent className="overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Editar parceiro" : "Adicionar parceiro"}</DialogTitle>
            <DialogDescription>Preencha a identificação do parceiro e os detalhes que pretende apresentar no site.</DialogDescription>
          </DialogHeader>
          <PartnerForm
            key={editingPartner?.id ?? "new-partner"}
            partner={editingPartner ?? undefined}
            onSubmit={editingPartner ? handleUpdatePartner : handleAddPartner}
            onCancel={() => {
              setEditingPartner(null)
              setOpenPartner(false)
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={openCarousel} onOpenChange={setOpenCarousel}>
        <DialogContent className="overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCarousel ? "Editar imagem da galeria" : "Adicionar imagem à galeria"}</DialogTitle>
            <DialogDescription>Escolha a galeria e adicione a imagem com a data e a descrição da atividade.</DialogDescription>
          </DialogHeader>
          <CarouselForm
            key={editingCarousel?.id ?? "new-carousel"}
            item={editingCarousel ?? undefined}
            onSubmit={editingCarousel ? handleUpdateCarousel : handleAddCarousel}
            onCancel={() => {
              setEditingCarousel(null)
              setOpenCarousel(false)
            }}
          />
        </DialogContent>
      </Dialog>
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="pr-8">
            <SheetTitle>{previewItem && (previewItem.kind === "noticia" || previewItem.kind === "carrossel" ? previewItem.item.titulo || "Detalhes da galeria" : previewItem.item.nome)}</SheetTitle>
            <SheetDescription>Detalhes do conteúdo selecionado. Fecha o painel para continuar exatamente na mesma lista.</SheetDescription>
          </SheetHeader>
          {previewItem && <div className="space-y-4">
            {(previewItem.kind === "parceiro" ? previewItem.item.logo : previewItem.item.imagem) ? <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted"><Image src={previewItem.kind === "parceiro" ? previewItem.item.logo! : previewItem.item.imagem!} alt={previewItem.kind === "noticia" || previewItem.kind === "carrossel" ? previewItem.item.titulo || "Imagem da galeria" : previewItem.item.nome} fill className="object-contain" /></div> : null}
            {previewItem.kind === "membro" && <p className="font-medium text-primary">{previewItem.item.cargo}</p>}
            {previewItem.kind === "parceiro" && <p className="font-medium text-primary">{previewItem.item.website}</p>}
            {(previewItem.kind === "noticia" || previewItem.kind === "carrossel") && <p className="text-sm text-muted-foreground">{previewItem.item.data}</p>}
            {previewItem.item.descricao && <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{previewItem.item.descricao}</p>}
            {previewItem.kind === "noticia" && previewItem.item.link && <Button asChild><a href={previewItem.item.link} target="_blank" rel="noreferrer">Abrir ligação da notícia</a></Button>}
            {previewItem.kind === "parceiro" && previewItem.item.website && <Button asChild><a href={previewItem.item.website} target="_blank" rel="noreferrer">Visitar website</a></Button>}
          </div>}
        </SheetContent>
      </Sheet>
      <Sheet open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Remover conteúdo?</SheetTitle><SheetDescription>Esta ação remove “{pendingDelete?.label}” do site e não pode ser desfeita.</SheetDescription></SheetHeader>
          <SheetFooter className="mt-6"><Button variant="outline" onClick={() => setPendingDelete(null)}>Cancelar</Button><Button onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </Tabs>
  )
}
