import { createBrowserRouter } from 'react-router'
import AppShell from './components/AppShell'
import Dashboard from './screens/Dashboard'
import Sales from './screens/Sales'
import Supply from './screens/Supply'
import Restock from './screens/Restock'
import Profile from './screens/Profile'
import NotFound from './screens/NotFound'

// Respect Vite's `base` so the app works when deployed under a sub-path.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: AppShell,
      children: [
        { index: true, Component: Dashboard },
        { path: 'sales', Component: Sales },
        { path: 'supply', Component: Supply },
        { path: 'restock', Component: Restock },
        { path: 'profile', Component: Profile },
        { path: '*', Component: NotFound },
      ],
    },
  ],
  { basename },
)
