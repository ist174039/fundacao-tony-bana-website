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
        <Label>Imagem</Label>
        <div className="flex items-center gap-4">
          {imagePreview && (
            <div className="relative w-32 h-24">
              <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview("")
                }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Escolher imagem</span>
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
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
