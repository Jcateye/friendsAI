import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { flushOutbox } from '@/services/offlineStore'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    flushOutbox().catch(() => undefined)
  })
  return children
}

export default App
