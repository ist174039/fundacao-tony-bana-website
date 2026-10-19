"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { Upload, X } from "lucide-react"
import type { CarrosselItem } from "@/lib/firebase-firestore"

interface Props {
  item?: CarrosselItem
  onSubmit: (data: Partial<CarrosselItem>, imageFile?: File) => Promise<void>
  onCancel: () => void
}

export function CarouselForm({ item, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState<Partial<CarrosselItem>>({
    titulo: item?.titulo || "",
    descricao: item?.descricao || "",
    data: item?.data || new Date().toISOString().split("T")[0],
    imagem: item?.imagem || "",
    categoria: item?.categoria || "comunidade",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>(item?.imagem || "")
  const [loading, setLoading] = useState(false)

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setImageFile(f)
      const r = new FileReader()
      r.onloadend = () => setPreview(r.result as string)
      r.readAsDataURL(f)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData, imageFile || undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="titulo">Título (opcional)</Label>
        <Input id="titulo" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="categoria">Galeria</Label>
        <Select value={formData.categoria || "comunidade"} onValueChange={(value: "desporto" | "educacao" | "saude" | "comunidade") => setFormData({ ...formData, categoria: value })}>
          <SelectTrigger id="categoria"><SelectValue placeholder="Escolher galeria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desporto">Desporto</SelectItem>
            <SelectItem value="educacao">Educação</SelectItem>
            <SelectItem value="saude">Saúde</SelectItem>
            <SelectItem value="comunidade">Comunidade / geral</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="data">Data</Label>
        <Input id="data" type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={4} />
      </div>
      <div>
        <Label>Imagem</Label>
        <div className="flex items-center gap-4">
          {preview && (
            <div className="relative w-32 h-24">
              <Image src={preview} alt="preview" fill className="object-cover rounded-md" />
              <button type="button" onClick={() => { setPreview(""); setImageFile(null); }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Escolher imagem</span>
            </div>
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : item ? "Atualizar" : "Adicionar"}</Button>
      </div>
    </form>
  )
}
