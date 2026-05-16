import 'server-only'
import sharp from 'sharp'

export type ImageVariant = 'card' | 'hero' | 'carousel'
export type ImageFormat = 'webp' | 'avif'

interface VariantSpec {
  width: number
  height: number
  fit: keyof sharp.FitEnum
  quality: {
    webp: number
    avif: number
  }
}

export const VARIANT_SPECS: Record<ImageVariant, VariantSpec> = {
  card: {
    width: 800,
    height: 600,
    fit: 'cover',
    quality: { webp: 82, avif: 60 },
  },
  hero: {
    width: 2400,
    height: 1350,
    fit: 'cover',
    quality: { webp: 85, avif: 65 },
  },
  carousel: {
    width: 1600,
    height: 1200,
    fit: 'cover',
    quality: { webp: 82, avif: 60 },
  },
}

export async function validateImage(buffer: Buffer): Promise<{
  format: string
  width: number
  height: number
  size: number
}> {
  const meta = await sharp(buffer).metadata()

  if (!meta.format || !meta.width || !meta.height) {
    throw new Error('Invalid image — could not read metadata')
  }

  const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff']
  if (!validFormats.includes(meta.format)) {
    throw new Error(`Unsupported image format: ${meta.format}`)
  }

  if (meta.width < 400 || meta.height < 300) {
    throw new Error(
      `Image too small: ${meta.width}×${meta.height} (minimum 400×300)`
    )
  }

  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error(
      `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max 20MB)`
    )
  }

  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    size: buffer.length,
  }
}

export async function processVariant(
  sourceBuffer: Buffer,
  variant: ImageVariant,
  format: ImageFormat
): Promise<Buffer> {
  const spec = VARIANT_SPECS[variant]

  let pipeline = sharp(sourceBuffer).resize(spec.width, spec.height, {
    fit: spec.fit,
    position: 'attention',
    withoutEnlargement: false,
  })

  if (format === 'webp') {
    pipeline = pipeline.webp({
      quality: spec.quality.webp,
      effort: 4,
    })
  } else if (format === 'avif') {
    pipeline = pipeline.avif({
      quality: spec.quality.avif,
      effort: 4,
    })
  }

  return pipeline.toBuffer()
}
