"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogOut, Calendar, Users, Newspaper, Briefcase, FileText, Handshake } from "lucide-react"
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
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="Fundação Tony Bana" width={40} height={40} className="rounded-full" />
            <h1 className="text-xl font-semibold font-montserrat">Painel Administrativo</h1>
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
      <main className="container py-8">
        <Tabs defaultValue="noticias" className="space-y-6">
    <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
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
                <CardTitle>Lista de Notícias</CardTitle>
                <Button onClick={() => setOpenNews(true)}>Adicionar Notícia</Button>
              </CardHeader>
              <CardContent>
                {news.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma notícia cadastrada ainda.</div>
                ) : (
                  <div className="space-y-4">
                    {news.map((n) => (
                      <div key={n.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{n.titulo}</div>
                          <div className="text-sm text-muted-foreground">{n.data}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingNews(n)
                              setOpenNews(true)
                            }}
                          >
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(COLLECTIONS.NOTICIAS, n.id)}>
                            Remover
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
                <CardTitle>Lista de Membros</CardTitle>
                <Button onClick={() => setOpenMember(true)}>Adicionar Membro</Button>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhum membro cadastrado ainda.</div>
                ) : (
                  <div className="space-y-4">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{m.nome}</div>
                          <div className="text-sm text-muted-foreground">{m.cargo}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingMember(m)
                              setOpenMember(true)
                            }}
                          >
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(COLLECTIONS.MEMBROS, m.id)}>
                            Remover
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
                <CardTitle>Lista de Parceiros</CardTitle>
                <Button onClick={() => setOpenPartner(true)}>Adicionar Parceiro</Button>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhum parceiro cadastrado ainda.</div>
                ) : (
                  <div className="space-y-4">
                    {partners.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{p.nome}</div>
                          <div className="text-sm text-muted-foreground">{p.website}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingPartner(p)
                              setOpenPartner(true)
                            }}
                          >
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(COLLECTIONS.PARCEIROS, p.id)}>
                            Remover
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
                <CardTitle>Carrossel</CardTitle>
                <Button onClick={() => setOpenCarousel(true)}>Adicionar Imagem</Button>
              </CardHeader>
              <CardContent>
                {carrossel.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma imagem no carrossel ainda.</div>
                ) : (
                  <div className="space-y-4">
                    {carrossel.map((c) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{c.titulo || c.data}</div>
                          <div className="text-sm text-muted-foreground">{c.data}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingCarousel(c)
                              setOpenCarousel(true)
                            }}
                          >
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(COLLECTIONS.CARROSSEL, c.id)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs for adding items */}
      <Dialog open={openMember} onOpenChange={setOpenMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Notícia</DialogTitle>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Parceiro</DialogTitle>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Imagem - Carrossel</DialogTitle>
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
    </div>
  )
}
