"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogOut, Users, Newspaper, Briefcase, Handshake, Eye, Pencil, Trash2, Plus, Images, LayoutDashboard } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "@/lib/firebase-firestore"
import { auth } from "@/lib/firebase"

export default function AdminDashboard() {
  const router = useRouter()
  const [userEmail] = useState("admin@fundacaotony bana.org")
  const [openMember, setOpenMember] = useState(false)
  const [openNews, setOpenNews] = useState(false)
  const [openPartner, setOpenPartner] = useState(false)
  const [members, setMembers] = useState<Membro[]>([])
  const [news, setNews] = useState<Noticia[]>([])
  const [partners, setPartners] = useState<Parceiro[]>([])
  const [carrossel, setCarrossel] = useState<any[]>([])
  const [editingMember, setEditingMember] = useState<Membro | null>(null)
  const [editingNews, setEditingNews] = useState<Noticia | null>(null)
  const [editingPartner, setEditingPartner] = useState<Parceiro | null>(null)
  const [editingCarousel, setEditingCarousel] = useState<any | null>(null)
  const [openCarousel, setOpenCarousel] = useState(false)
  const [previewItem, setPreviewItem] = useState<{ kind: "noticia" | "membro" | "parceiro"; item: any } | null>(null)
  const galleryGroups = [
    { id: "desporto", label: "Desporto", items: carrossel.filter((item) => item.categoria === "desporto") },
    { id: "educacao", label: "Educação", items: carrossel.filter((item) => item.categoria === "educacao") },
    { id: "saude", label: "Saúde", items: carrossel.filter((item) => item.categoria === "saude") },
    { id: "comunidade", label: "Comunidade / geral", items: carrossel.filter((item) => !item.categoria || item.categoria === "comunidade") },
  ]

  const loadAll = async () => {
    try {
      const [m, n, p, c] = await Promise.all([
        getCollection<Membro>(COLLECTIONS.MEMBROS),
        getCollection<Noticia>(COLLECTIONS.NOTICIAS),
        getCollection<Parceiro>(COLLECTIONS.PARCEIROS),
        getCollection(COLLECTIONS.CARROSSEL),
      ])
      setMembers(m)
      setNews(n)
      setPartners(p)
      setCarrossel(c)
    } catch (err) {
      console.error("Error loading collections:", err)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleAddMember = async (data: any, imageFile?: File) => {
    if (!auth.currentUser) {
      alert("Você precisa estar logado para adicionar membros. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      let imageUrl = data.imagem || ""
      if (imageFile) {
        const path = `membros/${Date.now()}-${imageFile.name}`
        imageUrl = await uploadImage(imageFile, path)
      }
      await addDocument(COLLECTIONS.MEMBROS, { ...data, imagem: imageUrl })
      setOpenMember(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateMember = async (data: any, imageFile?: File) => {
    if (!editingMember) return
    if (!auth.currentUser) {
      alert("Você precisa estar logado para atualizar membros. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      console.log("Updating member", editingMember.id, data)
      let imageUrl = data.imagem || editingMember.imagem || ""
      if (imageFile) {
        const path = `membros/${Date.now()}-${imageFile.name}`
        imageUrl = await uploadImage(imageFile, path)
      }
      await updateDocument(COLLECTIONS.MEMBROS, editingMember.id, { ...data, imagem: imageUrl })
      console.log("Member updated", editingMember.id)
      if (typeof window !== "undefined") alert("Membro atualizado com sucesso")
      setEditingMember(null)
      setOpenMember(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddNews = async (data: any, imageFile?: File) => {
    if (!auth.currentUser) {
      alert("Você precisa estar logado para adicionar notícias. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      let imageUrl = data.imagem || ""
      if (imageFile) {
        const path = `noticias/${Date.now()}-${imageFile.name}`
        imageUrl = await uploadImage(imageFile, path)
      }
      await addDocument(COLLECTIONS.NOTICIAS, { ...data, imagem: imageUrl })
      setOpenNews(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateNews = async (data: any, imageFile?: File) => {
    if (!editingNews) return
    if (!auth.currentUser) {
      alert("Você precisa estar logado para atualizar notícias. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      console.log("Updating news", editingNews.id, data)
      let imageUrl = data.imagem || editingNews.imagem || ""
      if (imageFile) {
        const path = `noticias/${Date.now()}-${imageFile.name}`
        imageUrl = await uploadImage(imageFile, path)
      }
      await updateDocument(COLLECTIONS.NOTICIAS, editingNews.id, { ...data, imagem: imageUrl })
      console.log("News updated", editingNews.id)
      if (typeof window !== "undefined") alert("Notícia atualizada com sucesso")
      setEditingNews(null)
      setOpenNews(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddPartner = async (data: any, logoFile?: File) => {
    if (!auth.currentUser) {
      alert("Você precisa estar logado para adicionar parceiros. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      let logoUrl = data.logo || ""
      if (logoFile) {
        const path = `parceiros/${Date.now()}-${logoFile.name}`
        logoUrl = await uploadImage(logoFile, path)
      }
      await addDocument(COLLECTIONS.PARCEIROS, { ...data, logo: logoUrl })
      setOpenPartner(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdatePartner = async (data: any, logoFile?: File) => {
    if (!editingPartner) return
    if (!auth.currentUser) {
      alert("Você precisa estar logado para atualizar parceiros. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      console.log("Updating partner", editingPartner.id, data)
      let logoUrl = data.logo || editingPartner.logo || ""
      if (logoFile) {
        const path = `parceiros/${Date.now()}-${logoFile.name}`
        logoUrl = await uploadImage(logoFile, path)
      }
      await updateDocument(COLLECTIONS.PARCEIROS, editingPartner.id, { ...data, logo: logoUrl })
      console.log("Partner updated", editingPartner.id)
      if (typeof window !== "undefined") alert("Parceiro atualizado com sucesso")
      setEditingPartner(null)
      setOpenPartner(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCarousel = async (data: any, imageFile?: File) => {
    if (!auth.currentUser) {
      alert("Você precisa estar logado para adicionar imagens ao carrossel. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      let imageUrl = data.imagem || ""
      if (imageFile) {
        const path = `carrossel/${Date.now()}-${imageFile.name}`
        imageUrl = await uploadImage(imageFile, path)
      }
      await addDocument(COLLECTIONS.CARROSSEL, { ...data, imagem: imageUrl })
      setOpenCarousel(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateCarousel = async (data: any, imageFile?: File) => {
    if (!editingCarousel) return
    if (!auth.currentUser) {
      alert("Você precisa estar logado para atualizar o carrossel. Redirecionando para login.")
      router.push("/admin/login")
      return
    }
    try {
      let imageUrl = data.imagem || editingCarousel.imagem || ""
      if (imageFile) {
        const path = `carrossel/${Date.now()}-${imageFile.name}`
        imageUrl = await uploadImage(imageFile, path)
      }
      await updateDocument(COLLECTIONS.CARROSSEL, editingCarousel.id, { ...data, imagem: imageUrl })
      setEditingCarousel(null)
      setOpenCarousel(false)
      await loadAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      if (!auth.currentUser) {
        alert("Você precisa estar logado para remover itens. Redirecionando para login.")
        router.push("/admin/login")
        return
      }
      await deleteDocument(collectionName, id)
      await loadAll()
    } catch (err) {
      console.error("Error deleting:", err)
    }
  }

  const handleLogout = () => {
    // TODO: Implement Firebase logout
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="Fundação Tony Bana" width={40} height={40} className="rounded-full" />
            <div><h1 className="text-lg font-semibold font-montserrat">Painel administrativo</h1><p className="hidden text-xs text-muted-foreground sm:block">Fundação Tony Bana · Gestão de conteúdos</p></div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl py-8 md:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><LayoutDashboard className="h-4 w-4"/> Visão geral</div><h2 className="text-3xl font-bold tracking-tight text-foreground">Conteúdos do site</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Organize notícias, equipa, parceiros e imagens num só lugar.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[{label:"Notícias",count:news.length,icon:Newspaper},{label:"Membros",count:members.length,icon:Users},{label:"Parceiros",count:partners.length,icon:Handshake},{label:"Imagens",count:carrossel.length,icon:Images}].map(({label,count,icon:Icon})=><div key={label} className="min-w-[112px] rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm shadow-black/10"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="h-3.5 w-3.5 text-primary"/></div><div className="mt-1 text-xl font-semibold text-card-foreground">{count}</div></div>)}
          </div>
        </div>
        <Tabs defaultValue="noticias" className="space-y-5">
    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/70 bg-card p-1.5 sm:grid-cols-4">
            <TabsTrigger value="noticias">
              <Newspaper className="h-4 w-4 mr-2" />
              Notícias
            </TabsTrigger>
            <TabsTrigger value="membros">
              <Users className="h-4 w-4 mr-2" />
              Membros
            </TabsTrigger>
            <TabsTrigger value="parceiros">
              <Handshake className="h-4 w-4 mr-2" />
              Parceiros
            </TabsTrigger>
            <TabsTrigger value="carrossel">
              <Briefcase className="h-4 w-4 mr-2" />
              Carrossel
            </TabsTrigger>
          </TabsList>

          {/* Notícias Tab */}
          <TabsContent value="noticias">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Notícias</CardTitle><p className="mt-1 text-sm text-muted-foreground">Publicações e atualizações da fundação</p></div>
                <Button onClick={() => {setEditingNews(null);setOpenNews(true)}}><Plus className="mr-2 h-4 w-4"/>Nova notícia</Button>
              </CardHeader>
              <CardContent>
                {news.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma notícia cadastrada ainda.</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {news.map((n) => (
                      <div key={n.id} className="flex min-w-0 gap-4 rounded-xl border border-border/70 bg-card p-3 shadow-sm shadow-black/10 transition hover:border-primary/40 hover:shadow-lg">
                        {n.imagem ? <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted"><Image src={n.imagem} alt="" fill className="object-cover"/></div> : <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Newspaper className="h-7 w-7"/></div>}
                        <div className="flex min-w-0 flex-1 flex-col"><div className="font-semibold leading-snug">{n.titulo}</div><div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.descricao}</div><div className="mt-auto pt-2 text-xs text-muted-foreground">{n.data}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewItem({ kind: "noticia", item: n })}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setEditingNews(n)
                              setOpenNews(true)
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4"/>Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(COLLECTIONS.NOTICIAS, n.id)}>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Equipa</CardTitle><p className="mt-1 text-sm text-muted-foreground">Pessoas que fazem parte da fundação</p></div>
                <Button onClick={() => {setEditingMember(null);setOpenMember(true)}}><Plus className="mr-2 h-4 w-4"/>Novo membro</Button>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhum membro cadastrado ainda.</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3 shadow-sm shadow-black/10 transition hover:border-primary/40 hover:shadow-lg">
                        {m.imagem ? <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted"><Image src={m.imagem} alt={m.nome} fill className="object-cover"/></div> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-6 w-6"/></div>}
                        <div className="min-w-0 flex-1"><div className="font-semibold">{m.nome}</div><div className="text-sm text-muted-foreground">{m.cargo}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewItem({ kind: "membro", item: m })}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setEditingMember(m)
                              setOpenMember(true)
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4"/>Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(COLLECTIONS.MEMBROS, m.id)}>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Parceiros</CardTitle><p className="mt-1 text-sm text-muted-foreground">Organizações que apoiam o nosso trabalho</p></div>
                <Button onClick={() => {setEditingPartner(null);setOpenPartner(true)}}><Plus className="mr-2 h-4 w-4"/>Novo parceiro</Button>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhum parceiro cadastrado ainda.</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {partners.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-3 shadow-sm shadow-black/10 transition hover:border-primary/40 hover:shadow-lg">
                        {p.logo ? <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted p-2"><Image src={p.logo} alt={p.nome} fill className="object-contain p-2"/></div> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Handshake className="h-6 w-6"/></div>}
                        <div className="min-w-0 flex-1"><div className="font-semibold">{p.nome}</div><div className="truncate text-sm text-muted-foreground">{p.website || p.descricao}</div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewItem({ kind: "parceiro", item: p })}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setEditingPartner(p)
                              setOpenPartner(true)
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4"/>Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(COLLECTIONS.PARCEIROS, p.id)}>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Galerias</CardTitle><p className="mt-1 text-sm text-muted-foreground">Imagens organizadas por área de atuação</p></div>
                <Button onClick={() => {setEditingCarousel(null);setOpenCarousel(true)}}><Plus className="mr-2 h-4 w-4"/>Adicionar imagem</Button>
              </CardHeader>
              <CardContent>
                {carrossel.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma imagem no carrossel ainda.</div>
                ) : (
                  <div className="space-y-8">
                    {galleryGroups.filter((group) => group.items.length > 0).map((group) => <section key={group.id} className="space-y-3"><div className="flex items-center justify-between border-b pb-2"><div><h3 className="font-semibold">{group.label}</h3><p className="text-xs text-muted-foreground">{group.items.length} {group.items.length === 1 ? "imagem" : "imagens"}</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map((c) => (
                      <div key={c.id} className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm shadow-black/10 transition hover:border-primary/40 hover:shadow-lg">
                        <div className="relative aspect-[16/9] bg-muted">{c.imagem ? <Image src={c.imagem} alt={c.titulo || "Imagem da galeria"} fill className="object-cover"/> : <div className="flex h-full items-center justify-center text-muted-foreground"><Images className="h-8 w-8"/></div>}</div>
                        <div className="p-3"><div className="font-semibold">{c.titulo || "Imagem da galeria"}</div><div className="text-sm text-muted-foreground">{c.data}</div><div className="mt-3 flex gap-2">
                          {c.imagem && <Button variant="outline" size="sm" asChild><a href={c.imagem} target="_blank" rel="noreferrer"><Eye className="mr-1.5 h-4 w-4"/>Ver imagem</a></Button>}
                          <Button variant="outline" size="sm" onClick={() => {setEditingCarousel(c);setOpenCarousel(true)}}><Pencil className="mr-1.5 h-4 w-4"/>Editar</Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(COLLECTIONS.CARROSSEL, c.id)}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                        </div>
                      </div>
                    ))}</div></section>)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs for adding items */}
      <Dialog open={openMember} onOpenChange={setOpenMember}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Editar membro" : "Adicionar membro"}</DialogTitle>
          </DialogHeader>
          <MemberForm
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingNews ? "Editar notícia" : "Adicionar notícia"}</DialogTitle>
          </DialogHeader>
          <NewsForm
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Editar parceiro" : "Adicionar parceiro"}</DialogTitle>
          </DialogHeader>
          <PartnerForm
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCarousel ? "Editar imagem da galeria" : "Adicionar imagem à galeria"}</DialogTitle>
          </DialogHeader>
          <CarouselForm
            item={editingCarousel ?? undefined}
            onSubmit={editingCarousel ? handleUpdateCarousel : handleAddCarousel}
            onCancel={() => {
              setEditingCarousel(null)
              setOpenCarousel(false)
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{previewItem?.item?.titulo || previewItem?.item?.nome}</DialogTitle>
          </DialogHeader>
          {previewItem && <div className="space-y-4">
            {previewItem.item.imagem || previewItem.item.logo ? <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted"><Image src={previewItem.item.imagem || previewItem.item.logo} alt={previewItem.item.titulo || previewItem.item.nome} fill className="object-contain" /></div> : null}
            {previewItem.kind === "membro" && <p className="font-medium text-primary">{previewItem.item.cargo}</p>}
            {previewItem.kind === "parceiro" && <p className="font-medium text-primary">{previewItem.item.website}</p>}
            {previewItem.item.data && <p className="text-sm text-muted-foreground">{previewItem.item.data}</p>}
            {previewItem.item.descricao && <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{previewItem.item.descricao}</p>}
            {previewItem.kind === "noticia" && previewItem.item.link && <Button asChild><a href={previewItem.item.link} target="_blank" rel="noreferrer">Abrir ligação da notícia</a></Button>}
            {previewItem.kind === "parceiro" && previewItem.item.website && <Button asChild><a href={previewItem.item.website} target="_blank" rel="noreferrer">Visitar website</a></Button>}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
