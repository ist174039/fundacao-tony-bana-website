"use client"

import { useState, type FormEvent } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploadField } from "@/components/admin/image-upload-field"
import type { CarrosselItem } from "@/lib/firebase-firestore"

interface CarouselFormProps {
  item?: CarrosselItem
  onSubmit: (data: Partial<CarrosselItem>, imageFile?: File) => Promise<void>
  onCancel: () => void
}

export function CarouselForm({ item, onSubmit, onCancel }: CarouselFormProps) {
  const [formData, setFormData] = useState<Partial<CarrosselItem>>({
    titulo: item?.titulo || "",
    descricao: item?.descricao || "",
    data: item?.data || new Date().toISOString().split("T")[0],
    imagem: item?.imagem || "",
    categoria: item?.categoria || "comunidade",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError("")
    setLoading(true)
    try {
      await onSubmit(formData, imageFile || undefined)
    } catch {
      setSubmitError("Não foi possível guardar a imagem. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título (opcional)</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(event) => setFormData({ ...formData, titulo: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Galeria</Label>
        <Select
          value={formData.categoria || "comunidade"}
          onValueChange={(value: NonNullable<CarrosselItem["categoria"]>) => setFormData({ ...formData, categoria: value })}
        >
          <SelectTrigger id="categoria"><SelectValue placeholder="Escolher galeria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desporto">Desporto</SelectItem>
            <SelectItem value="educacao">Educação</SelectItem>
            <SelectItem value="saude">Saúde</SelectItem>
            <SelectItem value="comunidade">Comunidade / geral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          value={formData.data}
          onChange={(event) => setFormData({ ...formData, data: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={formData.descricao}
          onChange={(event) => setFormData({ ...formData, descricao: event.target.value })}
          rows={4}
        />
      </div>

      <ImageUploadField
        id="carousel-image"
        label="imagem"
        value={formData.imagem}
        onChange={(file) => {
          setImageFile(file)
          if (!file) setFormData((current) => ({ ...current, imagem: "" }))
        }}
      />

      {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "A guardar…" : item ? "Atualizar" : "Adicionar"}
        </Button>
      </div>
    </form>
  )
}
