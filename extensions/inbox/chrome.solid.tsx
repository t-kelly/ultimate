import { Check, ChevronRight, Inbox } from '@lucide/solid'
import { For, Show, onSettled } from 'solid-js'
import { Button } from '@/components/ui/button.solid.tsx'
import {
  api,
  cn,
  formatTime,
  showSurface,
  switchConversation,
  useEvent,
  useUiState,
  writingAs,
} from '@/sdk/solid'
import { ConversationRef } from '../conversations/ui.solid.tsx'
import { StandingAction } from '../subagents/refs.ts'
import { SELECTED, SURFACE, UNLOADED, amber, keyOf, sky } from './items.ts'
import type { Anchor, Answered, Counts, Selection } from './items.ts'

async function backToUltimate(source: string) {
  const id = await api.action(StandingAction, { name: 'ultimate' })
  writingAs(source, () => {
    switchConversation(id)
    showSurface('agent')
  })
}

export function Zero(props: { today: readonly Answered[] }) {
  return (
    <div class="flex min-h-0 flex-1 overflow-y-auto" data-inbox-zero>
      <div class="m-auto flex w-full max-w-md flex-col items-center px-6 py-12 text-center">
        <span class="flex size-10 items-center justify-center rounded-full bg-muted/60">
          <Check class="size-5 text-muted-foreground" />
        </span>
        <h2 class="mt-4 text-[17px] font-semibold tracking-[-0.01em]">Nothing waits on you</h2>
        <p class="mt-1 text-[14px] text-muted-foreground">Every branch has what it needs.</p>
        <Button class="mt-6" onClick={(_, { source }) => backToUltimate(source)}>
          Back to @ultimate
        </Button>
        <Show when={props.today.length > 0}>
          <div class="mt-10 w-full text-left">
            <div class="section-label px-1 pb-2">Answered today · {props.today.length}</div>
            <For each={props.today} keyed={(row) => row.id}>
              {(row) => (
                <div class="flex min-w-0 items-center gap-2 px-1 py-1.5">
                  <Check class="size-3 shrink-0 text-muted-foreground/70" />
                  <span class="max-w-44 shrink-0">
                    <Show
                      when={row().conversation}
                      fallback={<span class="font-mono text-[10.5px]">{row().from}</span>}
                    >
                      {(id) => (
                        <ConversationRef
                          class="font-mono text-[10.5px] text-muted-foreground/70"
                          id={id()}
                        />
                      )}
                    </Show>
                  </span>
                  <span class="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                    {row().title}
                  </span>
                  <span class="shrink-0 font-mono text-[11px] text-muted-foreground/70">
                    {formatTime(row().at)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}

export function Badge(props: Counts) {
  return (
    <Show when={props.urgent > 0 || props.notUrgent > 0}>
      <span class="inline-flex items-baseline gap-1.5 font-mono text-[11px] tabular-nums">
        <Show when={props.urgent > 0}>
          <span class={amber}>
            {props.urgent}
            <span class="sr-only"> urgent</span>
          </span>
        </Show>
        <Show when={props.notUrgent > 0}>
          <span class={sky}>
            {props.notUrgent}
            <span class="sr-only"> not urgent</span>
          </span>
        </Show>
      </span>
    </Show>
  )
}

export function SidebarRow(props: Counts & { active: boolean }) {
  return (
    <Button
      aria-current={props.active ? 'true' : undefined}
      class={cn(
        'mx-2 flex w-[calc(100%-1rem)] items-center gap-1.5 py-1.5 pr-2 pl-9 text-left font-normal focus-visible:ring-1 hover:bg-sidebar-accent/50',
        props.active && 'bg-sidebar-accent',
      )}
      data-inbox-sidebar
      onClick={() => showSurface(SURFACE)}
      size={null}
      variant={null}
    >
      <Inbox class={cn('size-3 shrink-0', props.urgent > 0 ? amber : 'text-muted-foreground')} />
      <span class="flex min-w-0 flex-1 items-baseline gap-2 truncate font-mono text-[10.5px] text-foreground/70 [&>span]:text-[10.5px]">
        <span>
          <span class="sr-only">Show </span>Inbox
        </span>
        <Badge urgent={props.urgent} notUrgent={props.notUrgent} />
      </span>
      <ChevronRight class="size-3 shrink-0 text-muted-foreground/60" />
    </Button>
  )
}

export function LinkOverlay(props: { entries: readonly Anchor[] }) {
  const [, setSelected] = useUiState<Selection>(SELECTED, null)
  const open = (key: string | undefined) => {
    if (key !== undefined) {
      const anchor = props.entries.find((entry) => entry.key === key) ?? { key, at: UNLOADED }
      setSelected({ ...anchor, open: true })
    }
    showSurface(SURFACE)
  }

  useEvent('inbox:open', (value) => {
    const { key, message } = value as { key?: string; message?: number }
    open(keyOf(key ?? message))
  })
  onSettled(() => {
    const url = new URL(location.href)
    if (!url.searchParams.has('inbox')) return
    const key = keyOf(url.searchParams.get('inbox'))
    url.searchParams.delete('inbox')
    history.replaceState(history.state, '', url)
    writingAs('app', () => open(key))
  })
  return null
}
