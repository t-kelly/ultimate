import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reloadWhenIdle } from '../../web/src/sdk/idle-reload.ts'

let hidden = false
Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })

beforeEach(() => {
  vi.useFakeTimers()
  hidden = false
})
afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

function hide() {
  hidden = true
  document.dispatchEvent(new Event('visibilitychange'))
}

it('waits for the person to pause before reloading, and reloads a hidden page at once', () => {
  const reload = vi.fn<() => void>()
  reloadWhenIdle(reload)
  for (let typed = 0; typed < 6; typed++) {
    vi.advanceTimersByTime(20_000)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
  }
  document.dispatchEvent(new Event('scroll'))
  vi.advanceTimersByTime(29_000)
  expect(reload).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1000)
  expect(reload).toHaveBeenCalledTimes(1)

  const away = vi.fn<() => void>()
  reloadWhenIdle(away)
  window.dispatchEvent(new PointerEvent('pointermove'))
  hide()
  expect(away).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(60_000)
  expect(reload).toHaveBeenCalledTimes(1)
  expect(away).toHaveBeenCalledTimes(1)
})

it('never reloads while a focused field holds text', () => {
  const field = document.createElement('textarea')
  document.body.append(field)
  field.focus()
  field.value = 'half a sentence'
  const reload = vi.fn<() => void>()
  reloadWhenIdle(reload)
  hide()
  vi.advanceTimersByTime(10 * 60_000)
  expect(reload).not.toHaveBeenCalled()

  field.value = ''
  vi.advanceTimersByTime(1000)
  expect(reload).toHaveBeenCalledTimes(1)
})
