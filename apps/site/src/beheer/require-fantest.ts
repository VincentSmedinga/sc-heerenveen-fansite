import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

/**
 * For the pages and actions of the Fantest in the admin, after `requireRole`: with the part
 * off they answer "niet gevonden", as the public pages do.
 */
export const requireFantest = () => requireFansPart('fantest', notFound)
