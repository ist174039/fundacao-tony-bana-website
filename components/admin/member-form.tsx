"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import type { Membro } from "@/lib/firebase-firestore"

interface MemberFormProps {
  member?: Membro
  onSubmit: (data: Partial<Membro>, imageFile?: File) => Promise<void>
  onCancel: () => void
}

export function MemberForm({ member, onSubmit, onCancel }: MemberFormProps) {
  const [formData, setFormData] = useState<Partial<Membro>>({
    nome: member?.nome || "",
    cargo: member?.cargo || "",
    descricao: member?.descricao || "",
    imagem: member?.imagem || "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(member?.imagem || "")
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
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cargo">Cargo</Label>
        <Input
          id="cargo"
          value={formData.cargo}
          onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
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
        <Label htmlFor="member-photo">Foto</Label>
        <div className="flex items-center gap-4">
          {imagePreview && (
            <div className="relative w-24 h-24">
              <Image src={imagePreview} alt="" fill className="object-cover rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Remover pré-visualização da foto"
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
            <input id="member-photo" type="file" accept="image/*" onChange={handleImageChange} className="peer sr-only" />
            <label htmlFor="member-photo" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 hover:bg-muted peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Escolher foto</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : member ? "Atualizar" : "Adicionar"}
        </Button>
      </div>
    </form>
  )
}
