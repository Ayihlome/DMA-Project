import AuthPager from '@/screens/Auth/AuthPager'

// Sign in and Create account are one swipeable pager; this route only picks
// which side it opens on.
export default function SignInRoute() {
  return <AuthPager initial="sign-in" />
}
