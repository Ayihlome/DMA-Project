import { createContext } from 'react'

export type PagerSegment = 'sign-in' | 'register'

/**
 * Lets the segmented pill inside each page drive the pager instead of
 * navigating. Null outside the pager, where the pill falls back to routing.
 *
 * Its own file because AuthPager imports the screens, the screens import
 * AuthForm, and AuthForm needs this — keeping it in AuthPager would be a cycle.
 */
export const AuthPagerContext = createContext<{ goTo: (s: PagerSegment) => void } | null>(null)
