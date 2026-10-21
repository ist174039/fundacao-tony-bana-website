"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageUploadField } from "@/components/admin/image-upload-field"
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
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    setLoading(true)
    try {
      await onSubmit(formData, imageFile || undefined)
    } catch {
      setSubmitError("Não foi possível guardar os dados do membro. Tente novamente.")
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

      <ImageUploadField
        id="member-photo"
        label="fotografia"
        value={formData.imagem}
        onChange={(file) => {
          setImageFile(file)
          if (!file) setFormData((current) => ({ ...current, imagem: "" }))
        }}
      />

      {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

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
