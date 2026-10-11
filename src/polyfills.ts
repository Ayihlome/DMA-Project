/**
 * The backend creates ids with `crypto.randomUUID()`. React Native's JS engine (Hermes)
 * does not provide a global `crypto`, so without this every sale, product and sync entry
 * would throw on a real phone. Imported by data/backend.ts, so it runs before any use case is called.
 */
import { getRandomValues, randomUUID } from 'expo-crypto'

const g = globalThis as unknown as { crypto?: Record<string, unknown> }
if (!g.crypto) g.crypto = {}
if (typeof g.crypto.randomUUID !== 'function') g.crypto.randomUUID = randomUUID
if (typeof g.crypto.getRandomValues !== 'function') g.crypto.getRandomValues = getRandomValues
