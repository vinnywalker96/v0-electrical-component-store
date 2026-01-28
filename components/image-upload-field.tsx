"use client"

import type React from "react"

import { useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { uploadFile, type UploadResult } from "@/lib/utils/file-upload"
import Image from "next/image"

interface ImageUploadFieldProps {
  label: string
  folder?: string
  currentImageUrl?: string
  onUploadComplete: (result: UploadResult) => void
  onRemove?: () => void
  multiple?: boolean
  accept?: string
}

export function ImageUploadField({
  label,
  folder,
  currentImageUrl,
  onUploadComplete,
  onRemove,
  multiple = false,
  accept = "image/*",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    const result = await uploadFile(file, folder)

    if (result.error) {
      setError(result.error)
    } else {
      onUploadComplete(result)
    }

    setUploading(false)
    e.target.value = "" // Reset input
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {currentImageUrl && (
        <div className="relative w-40 h-40 border rounded-lg overflow-hidden">
          <Image src={currentImageUrl || "/placeholder.svg"} alt={label} fill className="object-cover" />
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id={`upload-${label}`}
          multiple={multiple}
        />
        <label htmlFor={`upload-${label}`}>
          <Button type="button" variant="outline" disabled={uploading} asChild>
            <span>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentImageUrl ? "Change Image" : "Upload Image"}
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
