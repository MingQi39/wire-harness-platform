import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '@/router'
import { SessionBootstrap } from '@/components/SessionBootstrap'

function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL
  if (b === '/') return undefined
  return b.endsWith('/') ? b.slice(0, -1) : b
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <SessionBootstrap>
        <AppRouter />
      </SessionBootstrap>
    </BrowserRouter>
  )
}
