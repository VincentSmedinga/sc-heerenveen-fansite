'use client'

import type { AdminRole } from '@fansite/db/schema'

import { SectionBar } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

import { currentScreen, isLoginPage, screensFor } from './screens'

/**
 * The bar of the admin for the page the visitor is on. The server decides who gets it and with
 * which role (AdminBar); the browser's path tells which screen is the current one, as it does
 * for the main menu, and the HTML of the server already has it. On a login page there is no
 * bar.
 */
export function AdminScreens({ role }: { role: AdminRole }) {
  const pathname = usePathname()

  if (isLoginPage(pathname)) {
    return null
  }

  const current = currentScreen(pathname)

  return (
    <SectionBar
      items={screensFor(role).map(({ href, label }) => ({ current: href === current, href, label }))}
      label="Beheer"
    />
  )
}
