import { put, del } from "@vercel/blob"
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz01234456789', 10)

export interface UploadResult {
  url: string
  path: string // Vercel Blob returns a URL directly, path might not be needed
  error?: string
}

export async function uploadFileToVercelBlob(
  file: File,
  folder?: string,
): Promise<UploadResult> {
  try {
    // Validate file type (only images)
    if (!file.type.startsWith("image/")) {
      return { url: "", path: "", error: "Invalid file type. Only images are allowed." }
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { url: "", path: "", error: "File size must be less than 5MB." }
    }

    // Generate unique filename with folder prefix
    const fileExt = file.name.split(".").pop()
    const fileName = `${nanoid()}.${fileExt}`
    const blobPath = folder ? `${folder}/${fileName}` : fileName

    const { url } = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false, // We generate our own unique name
    })

    return { url: url, path: blobPath } // Vercel Blob uses URL as identifier
  } catch (error: any) {
    console.error("[v0] Vercel Blob Upload exception:", error)
    return { url: "", path: "", error: error.message || "Vercel Blob upload failed" }
  }
}

export async function deleteFileFromVercelBlob(url: string): Promise<boolean> {
  try {
    await del(url)
    return true
  } catch (error: any) {
    console.error("[v0] Vercel Blob Delete exception:", error)
    return false
  }
}

// Vercel Blob URLs are directly accessible, no need for a getFileUrl function like Supabase
// export function getFileUrl(path: string): string {
//   return `https://example.blob.vercel-storage.com/${path}`; // Example, actual domain will vary
// }
