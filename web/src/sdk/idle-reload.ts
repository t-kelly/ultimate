import { every } from '../../../lib/timers.ts'

const pauseMs = 30_000
const longestWaitMs = 5 * 60_000
const checkEveryMs = 1000
const activity = ['keydown', 'pointerdown', 'pointermove', 'wheel', 'scroll', 'focusin'] as const

const textInputs = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url'])

function writing(element: Element | null) {
  if (element instanceof HTMLTextAreaElement) return element.value !== ''
  if (element instanceof HTMLInputElement)
    return textInputs.has(element.type) && element.value !== ''
  return element instanceof HTMLElement && element.isContentEditable && element.textContent !== ''
}

export function reloadWhenIdle(reload: () => void) {
  const started = Date.now()
  let active = started
  const touch = () => (active = Date.now())
  const check = () => {
    const now = Date.now()
    const unused = document.hidden || now - active >= pauseMs || now - started >= longestWaitMs
    if (!unused || writing(document.activeElement)) return
    stop()
    reload()
  }
  for (const type of activity) addEventListener(type, touch, { capture: true, passive: true })
  document.addEventListener('visibilitychange', check)
  const stopChecking = every(checkEveryMs, check)
  function stop() {
    stopChecking()
    for (const type of activity) removeEventListener(type, touch, { capture: true })
    document.removeEventListener('visibilitychange', check)
  }
  check()
}
