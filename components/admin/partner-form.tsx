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
        <Label htmlFor="partner-logo">Logo</Label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <div className="relative w-24 h-24">
              <Image
                src={logoPreview}
                alt=""
                fill
                className="object-contain rounded-lg border p-2"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Remover pré-visualização do logótipo"
                onClick={() => {
                  setLogoFile(null)
                  setLogoPreview("")
                }}
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full shadow"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <input id="partner-logo" type="file" accept="image/*" onChange={handleLogoChange} className="peer sr-only" />
            <label htmlFor="partner-logo" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 hover:bg-muted peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Escolher logo</span>
            </label>
          </div>
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
