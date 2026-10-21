"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import Image from "next/image"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface ImageUploadFieldProps {
  id: string
  label: string
  value?: string
  onChange: (file: File | null) => void
  fit?: "cover" | "contain"
  previewClassName?: string
}

export function ImageUploadField({
  id,
  label,
  value,
  onChange,
  fit = "cover",
  previewClassName,
}: ImageUploadFieldProps) {
  const [preview, setPreview] = useState(value || "")
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!objectUrl.current) setPreview(value || "")
  }, [value])

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Escolha uma imagem JPEG, PNG ou WebP.")
      event.target.value = ""
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("A imagem deve ter no máximo 5 MB.")
      event.target.value = ""
      return
    }

    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    setPreview(objectUrl.current)
    setError(null)
    onChange(file)
  }

  const clearImage = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = null
    setPreview("")
    setError(null)
    onChange(null)
    if (input.current) input.current.value = ""
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleChange}
        aria-describedby={error ? `${id}-error` : `${id}-help`}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {preview ? `Alterar ${label.toLowerCase()}` : `Escolher ${label.toLowerCase()}`}
      </label>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP · máximo 5 MB
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {preview && (
        <div className={cn("relative h-24 w-32 overflow-hidden rounded-lg border bg-muted", previewClassName)}>
          <Image
            src={preview}
            alt=""
            fill
            sizes="128px"
            unoptimized={preview.startsWith("blob:")}
            className={fit === "contain" ? "object-contain p-2" : "object-cover"}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label={`Remover ${label.toLowerCase()}`}
            onClick={clearImage}
            className="absolute right-1 top-1 h-7 w-7 rounded-full shadow"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
