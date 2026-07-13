"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "./button"

export interface ImageEntry {
  url: string
  thumbnail?: string
  isPrimary?: boolean
  file?: File
  uploading?: boolean
  error?: string
}

interface ImageUploadProps {
  images: ImageEntry[]
  onChange: (images: ImageEntry[]) => void
  maxImages?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<{ blob: Blob; thumbnailBlob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width))
          width = maxWidth
        }
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height))
          height = maxHeight
        }

        // Main image resize
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Failed to resize image"))

            // Create thumbnail (150px)
            const thumbCanvas = document.createElement("canvas")
            const thumbScale = Math.min(150 / width, 150 / height)
            const thumbW = Math.round(width * thumbScale)
            const thumbH = Math.round(height * thumbScale)
            thumbCanvas.width = thumbW
            thumbCanvas.height = thumbH
            const thumbCtx = thumbCanvas.getContext("2d")!
            thumbCtx.drawImage(img, 0, 0, thumbW, thumbH)

            thumbCanvas.toBlob(
              (thumbBlob) => {
                if (!thumbBlob) return reject(new Error("Failed to create thumbnail"))
                resolve({ blob, thumbnailBlob: thumbBlob })
              },
              "image/jpeg",
              0.6
            )
          },
          "image/jpeg",
          quality
        )
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadImage(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData()
  const file = new File([blob], filename, { type: "image/jpeg" })
  formData.append("file", file)

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Upload failed")
  }

  const json = await res.json()
  return json.data.url
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 5,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setIsProcessing(true)
      try {
        const fileArray = Array.from(files)
        const remaining = maxImages - images.length
        const toProcess = fileArray.slice(0, remaining)

          // Process all images in parallel
        const results = await Promise.allSettled(
          toProcess.map(async (file) => {
            const { blob, thumbnailBlob } = await resizeImage(
              file,
              maxWidth,
              maxHeight,
              quality
            )

            // Upload resized image
            const url = await uploadImage(blob, file.name)
            
            // Upload thumbnail
            let thumbnailUrl: string | undefined
            try {
              thumbnailUrl = await uploadImage(thumbnailBlob, `thumb_${file.name}`)
            } catch {
              // Thumbnail upload is optional
            }

            return {
              url,
              thumbnail: thumbnailUrl,
              isPrimary: images.length === 0,
            }
          })
        )

        const newImages: ImageEntry[] = []
        let hasSetPrimary = images.some((img) => img.isPrimary)
        for (const result of results) {
          if (result.status === "fulfilled") {
            const entry = result.value
            if (!hasSetPrimary) {
              entry.isPrimary = true
              hasSetPrimary = true
            } else {
              entry.isPrimary = false
            }
            newImages.push(entry)
          } else {
            newImages.push({
              url: "",
              error: result.reason?.message || "Upload failed",
              isPrimary: false,
            })
          }
        }

        onChange([...images, ...newImages])
      } catch (err) {
        console.error("Image processing error:", err)
      } finally {
        setIsProcessing(false)
      }
    },
    [images, maxImages, maxWidth, maxHeight, quality, onChange]
  )

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index)
    if (images[index]?.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true
    }
    onChange(updated)
  }

  const setAsPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }))
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <div
              key={index}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                img.isPrimary ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
              } ${img.error ? "border-red-300" : ""}`}
            >
              {img.uploading ? (
                <div className="w-full h-24 bg-gray-50 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-blue-400 animate-spin" />
                </div>
              ) : img.error ? (
                <div className="w-full h-24 bg-red-50 flex items-center justify-center p-2">
                  <div className="text-center">
                    <AlertCircle className="h-4 w-4 text-red-400 mx-auto mb-1" />
                    <span className="text-[10px] text-red-500">{img.error}</span>
                  </div>
                </div>
              ) : (
                <img
                  src={img.thumbnail || img.url}
                  alt="Product"
                  className="w-full h-24 object-cover"
                />
              )}

              {!img.uploading && !img.error && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(index)}
                      className="p-1 bg-white/90 rounded text-xs hover:bg-white transition-colors"
                      title="Set as primary"
                    >
                      ★
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1 bg-white/90 rounded text-xs hover:bg-white transition-colors text-red-600"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {img.isPrimary && !img.uploading && !img.error && (
                <span className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50 ${
            isProcessing ? "opacity-50 pointer-events-none" : ""
          } ${images.length === 0 ? "border-gray-300" : "border-gray-200"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <RotateCcw className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Resizing & uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {images.length === 0 ? "Upload product images" : "Add more images"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-resized to {maxWidth}×{maxHeight}px for faster loading
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {images.length}/{maxImages} images
      </p>
    </div>
  )
}
