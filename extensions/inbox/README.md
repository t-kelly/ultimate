# Inbox

Everything that waits on the user, answered in place: the `inbox` surface, first tab after Agent. Its
items are the open questions in the live Messages log merged with the items other extensions provide (`items.ts`);
a question leaves the moment it is answered or dismissed, wherever
that happened, a provided item when its provider stops listing it. Browser only: no `server.ts`, no documents, no
actions of its own.

## Urgent and important

**Urgent & important** (amber) comes first, then **Important, not urgent** (sky blue). Each group is oldest first.
A [question](../messages/README.md#messages-to-the-user) or provided item is urgent only with `urgent: { reason }`.
The reason appears on its row and above its title in the reading pane. Waiting longer does not make an item urgent.

The header, surface tab and sidebar use the same colours for their counts, showing a number only for a group with
items. Screen readers hear which group each number counts.

## Provided items (`ui.solid.tsx`)

Another extension puts its own things to do in the Inbox (a command to run in a terminal, say) by providing the
`InboxItems` point from its `web.solid.tsx`: `provide(InboxItems, () => items)`, where `items` is an accessor of
`{ key, at, urgent?, conversation?, tag, title, gist?, pane }[]`. `key` is unique across providers (`shell:12`), `at` when it
started waiting, `urgent` an optional `{ reason }` that puts it in **Urgent & important** (a blank reason leaves it in the other group), `tag` the row's kind tag, `title` one line of inline Markdown (rendered without images in the
reading pane, text only in the list), `pane` the reading pane's content below the title, its buttons included;
with `conversation` the row names it and the pane offers **Open in branch**. Every provider's items count in the
sidebar row and the To-dos' "For you" row too: they all read `Waiting` from `ui.solid.tsx`. A provider that throws is left
out behind its inline error card. Items are entries keyed by string; a question's key is `message:<id>`.

## Surface (`web.solid.tsx`)

- **List**: each non-empty group has a label and count. Each row shows the asking branch's feature chip and `#id` as the sidebar draws them, a `preview` tag
  when the text links to a local preview (`http://127.0.0.1:…` or `localhost`), else `question`; the message's bold
  lead or first line as its title, as plain text (a link's text, never its URL), its first question as the gist,
  and how long it has waited, amber past an hour on urgent rows only.
- **Reading pane** for the selected item: the title with inline Markdown and working links, without title images,
  the rest of the text (messages' `Body`), its forwarded images
  (`MessageImages`), **Open preview** (a new tab) when it links one, **Open in branch #id** (messages'
  `messages:open {conversation, message}`), and the answer card itself (questions' `MessageQuestions`). An extension
  providing `QuestionPane` (`ui.solid.tsx`) may take a question's pane over: side-chat shows the question's side chat there
  while it is in front.
- **Keys** (desktop): `j`/`k` move the selection in list order, `⇧O` opens the branch (plain `o` is the card's "Something else…"),
  and the card's own keys (1–9, letters, ↵, ⇧↵) answer the shown item: the Inbox passes `keys` to the card. A
  branch's transcript keeps its own rule (`keyCard`) when the Inbox is not on screen.
- **Phone**: the list full width; a tap shows the item full screen with a back arrow, the answer card after the text.
- **Zero**: "Nothing waits on you", the questions answered or dismissed today, and **Back to @ultimate**.

The durable UI key `ext.inbox.selected` holds `{ key, at, urgent?, open }`. The list and the reading pane show that
key if present. If it leaves, they show the next one in the list's order (urgent first, then by age, then key), or
the last entry if there is no successor. The selection moves to that entry, so a newer arrival never takes its
place. With no selection they show the first entry. Desktop ignores `open`; the phone's back arrow clears `open` without
forgetting the selection.

`?inbox=<key>` on load opens the surface at that entry and removes the parameter from the address. The
`inbox:open {key}` event does the same at runtime (a push notification's tap, `extensions/push`). A plain number, in
either or as `inbox:open {message}`, is a question's message id. A link to an entry that has not loaded yet keeps
its key with `at: 0`, so the entry shows when it arrives and the selection takes its age and urgency.

## Elsewhere

- **Sidebar**: a row under @ultimate's (`sidebar.under-ultimate`), with an amber icon while anything is urgent.
  The `Inbox` label stays neutral, with no counts at zero. A click opens the surface. @ultimate's own row then says only `waits on you`.
- **To-dos**: the panel's "For you" keeps one `Inbox · N` row, provided items counted, that opens it.
- ⌘K **Open Inbox**.
