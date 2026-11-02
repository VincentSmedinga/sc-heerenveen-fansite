'use client'

import type { AdminRole } from '@fansite/db/schema'

import { NavigationBar } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

import { logOut } from '#src/app/beheer/actions'

import { currentScreen, isLoginPage, screensFor } from './screens'

/**
 * The bar of the admin for the page the visitor is on. The server decides who gets it and with
 * which role (AdminBar); the browser's path tells which screen is the current one, as it does
 * for the main menu, and the HTML of the server already has it. On a login page there is no
 * bar. Logging out is the last item of the bar: a button in a form with the server action.
 */
export function AdminScreens({ role }: { role: AdminRole }) {
  const pathname = usePathname()

  if (isLoginPage(pathname)) {
    return null
  }

  const current = currentScreen(pathname)

  return (
    <NavigationBar
      end={{ action: logOut, label: 'Uitloggen' }}
      label="Beheer"
      subitems={screensFor(role).map(({ href, label }) => ({ current: href === current, href, label }))}
    />
  )
}
