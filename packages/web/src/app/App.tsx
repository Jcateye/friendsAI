import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

export function App() {
  try {
    return <RouterProvider router={router} />
  } catch (error) {
    throw error;
  }
}
