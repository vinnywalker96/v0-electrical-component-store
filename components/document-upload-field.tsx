"use client"

import type React from "react"
import { useState } from "react"
import { Upload, X, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { uploadFile, deleteFile, getFileUrl, type UploadResult } from "@/lib/utils/file-upload"
import { toast } from "@/hooks/use-toast"

interface DocumentUploadFieldProps {
  label: string
  bucket: "products" | "profiles" | "documents" | "payments"
  folder?: string
  currentDocumentUrls: string[]
  onUploadComplete: (newUrls: string[]) => void
}

export function DocumentUploadField({
  label,
  bucket,
  folder,
  currentDocumentUrls,
  onUploadComplete,
}: DocumentUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError("")

    const newUploadedUrls: string[] = [...currentDocumentUrls]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = await uploadFile(file, bucket, folder)

      if (result.error) {
        setError(result.error)
        toast({
          title: "Upload Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        newUploadedUrls.push(result.url)
        toast({
          title: "Upload Successful",
          description: `Document "${file.name}" uploaded.`,
        })
      }
    }

    onUploadComplete(newUploadedUrls)
    setUploading(false)
    e.target.value = "" // Reset input
  }

  async function handleRemoveDocument(urlToRemove: string) {
    // Extract path from URL
    // Assuming URL format like: https://[supabase-project-id].supabase.co/storage/v1/object/public/[bucket]/[folder]/[filename]
    const pathSegments = urlToRemove.split('/')
    const fileName = pathSegments.pop()
    const folderName = pathSegments.pop()
    const pathInStorage = folder ? `${folderName}/${fileName}` : fileName;

    if (!pathInStorage) {
      toast({
        title: "Error",
        description: "Could not determine file path for deletion.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = confirm("Are you sure you want to remove this document?")
    if (!confirmed) return

    try {
      const success = await deleteFile(bucket, pathInStorage)
      if (success) {
        onUploadComplete(currentDocumentUrls.filter((url) => url !== urlToRemove))
        toast({
          title: "Success",
          description: "Document removed successfully.",
        })
      } else {
        throw new Error("Failed to delete file from storage.")
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove document.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {currentDocumentUrls.length > 0 && (
        <div className="space-y-2">
          {currentDocumentUrls.map((url, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded-md">
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline truncate">
                <FileText className="h-4 w-4" />
                {url.split('/').pop()} {/* Display filename */}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveDocument(url)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="application/pdf" // Only allow PDFs for technical documents
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id={`upload-${label}`}
          multiple // Allow multiple file selection
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
                  {currentDocumentUrls.length > 0 ? "Upload More Documents" : "Upload Documents"}
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
