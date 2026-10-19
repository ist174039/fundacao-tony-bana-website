"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import type { Parceiro } from "@/lib/firebase-firestore"

interface PartnerFormProps {
  partner?: Parceiro
  onSubmit: (data: Partial<Parceiro>, logoFile?: File) => Promise<void>
  onCancel: () => void
}

export function PartnerForm({ partner, onSubmit, onCancel }: PartnerFormProps) {
  const [formData, setFormData] = useState<Partial<Parceiro>>({
    nome: partner?.nome || "",
    descricao: partner?.descricao || "",
    website: partner?.website || "",
    logo: partner?.logo || "",
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(partner?.logo || "")
  const [loading, setLoading] = useState(false)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData, logoFile || undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Parceiro</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
        <Label htmlFor="website">Website (opcional)</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://exemplo.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <div className="relative w-24 h-24">
              <Image
                src={logoPreview || "/placeholder.svg"}
                alt="Preview"
                fill
                className="object-contain rounded-lg border p-2"
              />
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null)
                  setLogoPreview("")
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
              <span className="text-sm">Escolher logo</span>
            </div>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : partner ? "Atualizar" : "Adicionar"}
        </Button>
      </div>
    </form>
  )
}
