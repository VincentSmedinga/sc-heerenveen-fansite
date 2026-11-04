import type * as NextNavigation from 'next/navigation'

import { vi } from 'vitest'

// The switches that change the page with the router (`SwitchLinks`) are on pages that a test
// renders without Next.js, where `useRouter` has no router to give. A test of its own replaces
// this mock (see `SwitchLinks.test.tsx`).
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push: () => undefined }),
}))
