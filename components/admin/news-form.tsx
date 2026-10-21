"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import type { Noticia } from "@/lib/firebase-firestore"

interface NewsFormProps {
  news?: Noticia
  onSubmit: (data: Partial<Noticia>, imageFile?: File) => Promise<void>
  onCancel: () => void
}

export function NewsForm({ news, onSubmit, onCancel }: NewsFormProps) {
  const [formData, setFormData] = useState<Partial<Noticia>>({
    titulo: news?.titulo || "",
    data: news?.data || new Date().toISOString().split("T")[0],
    descricao: news?.descricao || "",
    link: news?.link || "",
    imagem: news?.imagem || "",
    destaque: news?.destaque || false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(news?.imagem || "")
  const [loading, setLoading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData, imageFile || undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          value={formData.data}
          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="link">Link (opcional)</Label>
        <Input
          id="link"
          type="url"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://exemplo.com/noticia"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="news-image">Imagem</Label>
        <div className="flex items-center gap-4">
          {imagePreview && (
            <div className="relative h-24 w-32">
              <Image src={imagePreview} alt="" fill className="rounded-lg object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Remover pré-visualização da imagem"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview("")
                }}
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full shadow"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <input id="news-image" type="file" accept="image/*" onChange={handleImageChange} className="peer sr-only" />
            <label htmlFor="news-image" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 hover:bg-muted peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Escolher imagem</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="destaque"
          checked={formData.destaque}
          onCheckedChange={(checked) => setFormData({ ...formData, destaque: checked as boolean })}
        />
        <Label htmlFor="destaque" className="cursor-pointer">
          Destacar notícia
        </Label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : news ? "Atualizar" : "Adicionar"}
        </Button>
      </div>
    </form>
  )
}
