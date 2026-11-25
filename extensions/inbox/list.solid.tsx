import { For, Show, createEffect, createMemo, createUniqueId } from 'solid-js'
import { Button } from '@/components/ui/button.solid.tsx'
import { Kbd } from '@/components/ui/kbd.solid.tsx'
import {
  cn,
  events,
  formatAgo,
  showSurface,
  switchConversation,
  useNow,
  useUiState,
} from '@/sdk/solid'
import { ConversationRef } from '../conversations/ui.solid.tsx'
import { SELECTED, WAIT_WARNING_AFTER_MS, amber, anchorOf, shown, sky } from './items.ts'
import type { Anchor, Row, Selection } from './items.ts'

function InboxRow(props: {
  row: Row
  now: number
  current: boolean
  select: (row: Anchor) => void
}) {
  const reasonId = createUniqueId()
  return (
    <Button
      aria-current={props.current ? 'true' : undefined}
      aria-describedby={props.row.reason ? reasonId : undefined}
      aria-label={`Read ${props.row.title} (${props.row.message === undefined ? props.row.key : `#${props.row.message}`})`}
      class={cn(
        'flex w-full flex-col items-stretch gap-1 px-3 py-2.5 text-left focus-visible:ring-1 hover:bg-accent/40',
        props.current && 'bg-accent/60 hover:bg-accent/60',
      )}
      data-inbox-row={props.row.message ?? props.row.key}
      onClick={(event) => {
        if (event?.currentTarget instanceof HTMLElement) event.currentTarget.blur()
        props.select(props.row)
      }}
      size={null}
      variant={null}
    >
      <span class="flex min-w-0 items-center gap-2">
        <Show
          when={props.row.conversation}
          fallback={<span class="font-mono text-[10.5px]">{props.row.from}</span>}
        >
          {(id) => (
            <ConversationRef class="font-mono text-[10.5px] text-muted-foreground/70" id={id()} />
          )}
        </Show>
        <span class="ml-auto flex shrink-0 items-center gap-2">
          <span class="shrink-0 rounded border border-border/70 px-1 font-mono text-[10px] leading-4 text-muted-foreground">
            {props.row.tag}
          </span>
          <time
            class={cn(
              'shrink-0 font-mono text-[11px] tabular-nums',
              props.row.urgent && props.now - props.row.at > WAIT_WARNING_AFTER_MS
                ? amber
                : 'text-muted-foreground',
            )}
            datetime={new Date(props.row.at).toISOString()}
            title={`Asked ${new Date(props.row.at).toLocaleString()}`}
          >
            {formatAgo(props.row.at, props.now)}
          </time>
        </span>
      </span>
      <span class="truncate text-[13px] font-medium text-foreground">{props.row.title}</span>
      <Show when={props.row.reason}>
        <span class={cn('truncate text-[12px] font-normal', amber)} id={reasonId}>
          {props.row.reason}
        </span>
      </Show>
      <Show when={props.row.gist}>
        <span class="truncate text-[12px] font-normal text-muted-foreground">
          {props.row.gist}
          <Show when={props.row.more}>
            <span class="font-mono text-[11px]"> +{props.row.more}</span>
          </Show>
        </span>
      </Show>
    </Button>
  )
}

const keyClass = 'h-4 min-w-4 rounded-[3px] px-1 font-mono text-[10px]'
const groups = [
  { label: 'Urgent & important', urgent: true, tone: amber },
  { label: 'Important, not urgent', urgent: false, tone: sky },
]

export function List(props: { rows: readonly Row[]; phone: boolean }) {
  const now = useNow(60_000)
  const [selected, setSelected] = useUiState<Selection>(SELECTED, null)
  const current = createMemo(() => shown(props.rows, selected()))
  const select = (row: Anchor) => setSelected({ ...anchorOf(row), open: true })

  const onKey = (event: KeyboardEvent) => {
    const target = event.target
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      (target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')) ||
      document.querySelector(
        '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
      )
    )
      return

    const row = current()
    if (!row) return
    if (event.key === 'j' || event.key === 'k') {
      event.preventDefault()
      const rows = props.rows
      const at = rows.findIndex((candidate) => candidate.key === row.key)
      const step = event.key === 'j' ? 1 : -1
      select(rows[Math.max(0, Math.min(rows.length - 1, at + step))])
    } else if (event.key === 'O') {
      event.preventDefault()
      const { conversation, message } = row
      if (conversation === undefined) return
      if (message !== undefined) events.emit('messages:open', { conversation, message })
      showSurface('agent')
      switchConversation(conversation)
    }
  }
  createEffect(
    () => !props.phone,
    (desktop) => {
      if (!desktop) return undefined
      window.addEventListener('keydown', onKey, true)
      return () => window.removeEventListener('keydown', onKey, true)
    },
  )

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-4" data-inbox-list>
        <For each={groups}>
          {(group) => {
            const rows = createMemo(() => props.rows.filter((row) => !!row.urgent === group.urgent))
            const first = () => group.urgent || !props.rows[0]?.urgent
            return (
              <Show when={rows().length > 0}>
                <section aria-label={group.label}>
                  <h3
                    class={cn(
                      'flex items-center justify-between px-3 pb-1.5',
                      first() ? 'pt-4' : 'pt-5',
                    )}
                  >
                    <span class={cn('section-label', group.tone)}>
                      {group.label} · {rows().length}
                    </span>
                    <Show when={first()}>
                      <span class="section-label">oldest first</span>
                    </Show>
                  </h3>
                  <For each={rows()} keyed={(row) => row.key}>
                    {(row) => (
                      <InboxRow
                        current={!props.phone && row().key === current()?.key}
                        now={now()}
                        row={row()}
                        select={select}
                      />
                    )}
                  </For>
                </section>
              </Show>
            )
          }}
        </For>
      </div>
      <Show when={!props.phone}>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 px-5 py-2 font-mono text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1">
            <Kbd class={keyClass}>j</Kbd>
            <Kbd class={keyClass}>k</Kbd> next
          </span>
          <span class="flex items-center gap-1">
            <Kbd class={keyClass}>⇧↵</Kbd> accept picks
          </span>
          <span class="flex items-center gap-1">
            <Kbd class={keyClass}>⇧O</Kbd> open branch
          </span>
        </div>
      </Show>
    </div>
  )
}
