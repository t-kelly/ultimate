import type { ConversationId } from '@earendil-works/pi-durable'
import type { Nodes } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { openQuestion } from '../../lib/message-state.ts'
import type { Message } from '../messages/refs.ts'
import type { InboxItem } from './points.ts'

export const SURFACE = 'inbox'
export const SELECTED = 'ext.inbox.selected'
export const WAIT_WARNING_AFTER_MS = 60 * 60_000
export const amber = 'text-amber-700 dark:text-amber-300'
export const sky = 'text-sky-700 dark:text-sky-300/75'

export type Anchor = { key: string; at: number; urgent?: true }
export type Selection = (Anchor & { open: boolean }) | null
type WaitingItem = Anchor & { reason?: string }
export type Entry = WaitingItem &
  ({ message: Message; item?: undefined } | { item: InboxItem; message?: undefined })
type Sender = { conversation?: ConversationId; from?: string }
export type Row = WaitingItem &
  Sender & {
    tag: string
    title: string
    gist?: string
    more?: number
    message?: number
  }
export type Answered = Sender & { id: number; at: number; title: string }

const messageKey = (id: number) => `message:${id}`

export function keyOf(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? messageKey(value) : undefined
  if (typeof value !== 'string' || !value) return undefined
  return /^\d+$/.test(value) ? messageKey(Number(value)) : value
}

export const inboxItems = (
  messages: readonly Message[],
  provided: readonly (readonly InboxItem[])[] = [],
): Entry[] =>
  [
    ...messages
      .filter(openQuestion)
      .toReversed()
      .map((message) => ({
        key: messageKey(message.id),
        at: message.at,
        ...urgency(message.urgent),
        message,
      })),
    ...provided
      .flat()
      .map((item) => ({ key: item.key, at: item.at, ...urgency(item.urgent), item })),
  ].toSorted(byListOrder)

function urgency(urgent: InboxItem['urgent']): { urgent?: true; reason?: string } {
  const reason = urgent?.reason.trim()
  return reason ? { urgent: true, reason } : {}
}

const byListOrder = (a: Anchor, b: Anchor) =>
  Number(!!b.urgent) - Number(!!a.urgent) ||
  a.at - b.at ||
  (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)

export const anchorOf = ({ key, at, urgent }: Anchor): Anchor =>
  urgent ? { key, at, urgent } : { key, at }

export type Counts = { urgent: number; notUrgent: number }

export const countsOf = (entries: readonly Anchor[]): Counts => {
  const urgent = entries.filter((entry) => entry.urgent).length
  return { urgent, notUrgent: entries.length - urgent }
}

export function shown<T extends Anchor>(entries: readonly T[], selected: Selection): T | undefined {
  if (!selected) return entries[0]
  const exact = entries.find((entry) => entry.key === selected.key)
  if (exact || selected.at === UNLOADED) return exact ?? entries[0]
  return entries.find((entry) => byListOrder(entry, selected) > 0) ?? entries.at(-1)
}

export const UNLOADED = 0

export function selectionAfterChange(
  entries: readonly Anchor[],
  selected: Selection,
): Selection | undefined {
  if (!selected) return undefined
  const entry = entries.find((candidate) => candidate.key === selected.key)
  if (entry)
    return entry.at === selected.at && entry.urgent === selected.urgent
      ? undefined
      : { ...anchorOf(entry), open: selected.open }
  if (selected.at === UNLOADED) return undefined
  const successor = shown(entries, selected)
  return successor && { ...anchorOf(successor), open: selected.open }
}

export const previewUrl = (text: string) =>
  /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/[^\s)<>\]`*]*)?/.exec(text)?.[0]

export function lead(text: string) {
  const trimmed = text.trimStart()
  const bold = /^\*\*(.+?)\*\*[:.]?\s*/.exec(trimmed)
  if (bold) return { title: bold[1].trim(), body: trimmed.slice(bold[0].length) }
  const [first = '', ...rest] = trimmed.split('\n')
  return {
    title: first.replace(/^(?:\s*(?:#{1,6}(?=\s)|>|[-*+](?=\s)))+\s*/, '').trim(),
    body: rest.join('\n').trim(),
  }
}

export const asOneParagraph = (title: string) =>
  title
    .replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
    .replace(
      /^(?:#{1,6}(?=\s|$)|[-+*](?=\s|$)|[-*_](?=[-*_\s]*$)|>|[`~](?=[`~]{2})|\[(?=[^\]]*\]:))/,
      '\\$&',
    )

const inline = unified().use(remarkParse).use(remarkGfm)
const textOf = (node: Nodes): string =>
  node.type === 'html'
    ? ''
    : node.type === 'break'
      ? ' '
      : 'value' in node
        ? node.value
        : 'children' in node
          ? node.children.map(textOf).join('')
          : ''

export const readerText = (title: string) => textOf(inline.parse(asOneParagraph(title))).trim()

export const tagOf = (entry: Entry) =>
  entry.message ? (previewUrl(entry.message.text) ? 'preview' : 'question') : entry.item.tag

const sender = (from: Message['from'] | undefined): Sender =>
  typeof from === 'number' ? { conversation: from } : { from }

export const senderOf = (entry: Entry): Sender =>
  sender(entry.message ? entry.message.from : entry.item.conversation)

export function toRow(entry: Entry): Row {
  const { reason, message, item } = entry
  return {
    ...anchorOf(entry),
    reason,
    ...senderOf(entry),
    tag: tagOf(entry),
    title: readerText(message ? lead(message.text).title : item.title),
    gist: message ? message.questions?.[0]?.text : item.gist,
    more: Math.max(0, (message?.questions?.length ?? 0) - 1),
    message: message?.id,
  }
}

export function answeredToday(messages: readonly Message[], now: number): Answered[] {
  const midnight = new Date(now).setHours(0, 0, 0, 0)
  return messages
    .filter((m) => m.to === 'user' && (m.state === 'answered' || m.state === 'dismissed'))
    .flatMap((m) => {
      const reply = messages.find((r) => r.from === 'user' && r.re === m.id)
      return reply && reply.at >= midnight
        ? [
            {
              ...sender(m.from),
              id: m.id,
              at: reply.at,
              title: readerText(lead(m.text).title),
            },
          ]
        : []
    })
    .toSorted((a, b) => b.at - a.at)
}
