import { Outlet } from 'react-router-dom'
import type { ReactElement } from 'react'

export function RootLayout(): ReactElement {
  return <Outlet />
}
