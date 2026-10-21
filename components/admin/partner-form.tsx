"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageUploadField } from "@/components/admin/image-upload-field"
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
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    setLoading(true)
    try {
      await onSubmit(formData, logoFile || undefined)
    } catch {
      setSubmitError("Não foi possível guardar os dados do parceiro. Tente novamente.")
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

      <ImageUploadField
        id="partner-logo"
        label="logótipo"
        value={formData.logo}
        fit="contain"
        onChange={(file) => {
          setLogoFile(file)
          if (!file) setFormData((current) => ({ ...current, logo: "" }))
        }}
      />

      {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

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
