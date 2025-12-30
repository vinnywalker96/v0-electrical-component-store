import { createClient } from "@/lib/supabase/client"

export interface UploadResult {
  url: string
  path: string
  error?: string
}

export async function uploadFile(
  file: File,
  bucket: "products" | "profiles" | "documents" | "payments",
  folder?: string,
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Validate file
    if (!file.type.startsWith("image/") && !file.type.startsWith("application/pdf")) {
      return { url: "", path: "", error: "Invalid file type. Only images and PDFs are allowed." }
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { url: "", path: "", error: "File size must be less than 5MB." }
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("[v0] Upload error:", error)
      return { url: "", path: "", error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return { url: publicUrl, path: data.path }
  } catch (error: any) {
    console.error("[v0] Upload exception:", error)
    return { url: "", path: "", error: error.message || "Upload failed" }
  }
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error("[v0] Delete error:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Delete exception:", error)
    return false
  }
}

export function getFileUrl(bucket: string, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}