import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only cleans up after each test by itself when the test functions are globals; ours are imported.
afterEach(cleanup)
