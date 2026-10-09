import { RouterProvider } from 'react-router'
import { router } from './routes'
import { StoreProvider } from './data/store'
import { ToastProvider } from './components/Toast'

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </StoreProvider>
  )
}
