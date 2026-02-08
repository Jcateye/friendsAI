import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { DemoModeProvider } from '../contexts/DemoModeContext'

export function App() {
  try {
    return (
      <DemoModeProvider>
        <RouterProvider router={router} />
      </DemoModeProvider>
    )
  } catch (error) {
    throw error;
  }
}
