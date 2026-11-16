import { afterAll, beforeAll } from 'vitest'

/**
 * jsdom has no layout, so the options measure 0. For a test of where the thumb stands, each
 * option gets a place of its own: 80px wide, one after the other.
 */
export const measureOptions = () => {
  const left = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft')
  const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get(this: HTMLElement) {
        return 80 * [...(this.parentElement?.children ?? [])].indexOf(this)
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 80 })
  })

  afterAll(() => {
    for (const [name, descriptor] of [
      ['offsetLeft', left],
      ['offsetWidth', width],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, name, descriptor)
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, name)
      }
    }
  })
}
