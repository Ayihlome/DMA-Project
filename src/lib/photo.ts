import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

/**
 * Lets the owner pick a photo, then resizes it to fit within `max` px and re-encodes it as
 * JPEG, so a phone photo (often 3-5 MB) becomes ~20-40 KB. Same output as the web
 * `compressImage`: a data URL stored on this device only.
 */
export async function pickProductPhoto(max = 400, quality = 0.8): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error('Allow photo access in Settings to add product photos.')
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 })
  if (picked.canceled || !picked.assets[0]) return null
  const asset = picked.assets[0]
  const scale = Math.min(1, max / Math.max(asset.width || max, asset.height || max))
  const ctx = ImageManipulator.manipulate(asset.uri)
  if (scale < 1) ctx.resize({ width: Math.round((asset.width || max) * scale), height: Math.round((asset.height || max) * scale) })
  const image = await ctx.renderAsync()
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64: true })
  if (!out.base64) throw new Error('This photo could not be read.')
  return `data:image/jpeg;base64,${out.base64}`
}
