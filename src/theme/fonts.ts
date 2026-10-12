import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'

/**
 * Plus Jakarta Sans, the weights the spec calls for (400/500/600/700/800).
 *
 * Loaded at runtime rather than embedded with the expo-font config plugin.
 * The plugin is more efficient on native, but it needs a development build, and
 * it names families differently per platform (file name on Android, PostScript
 * name on iOS). Runtime loading gives one family name everywhere and works on
 * web, which this app has to support.
 *
 * Returns `[loaded, error]`. Callers must treat an error as "carry on" — a font
 * that fails to download should fall back to the system face, not wedge the app
 * behind the splash screen forever.
 */
export function useAppFonts() {
  return useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })
}
