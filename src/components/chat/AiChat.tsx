'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { analytics } from '@/lib/analytics'
import './ai-chat.css'

/**
 * D-Tech AI customer chat.
 *
 * Talks straight to the messaging-ai widget API (`POST {base}/api/widget/messages`,
 * SSE-shaped `delta` / `done` frames over a ReadableStream). We render the UI
 * ourselves instead of loading that project's widget bundle, because:
 *
 *  - nothing serves that bundle yet, and its client posts to a RELATIVE
 *    `/api/widget/messages`, which on this domain would hit US, not the AI app;
 *  - a native component inherits the storefront's tokens, RTL and fonts, and
 *    adds no third-party script to the critical path.
 *
 * Cross-origin is fine: the AI side echoes the request Origin when the
 * channel's `originsAllowlist` is empty (v1 default) or contains this origin,
 * and never sets Allow-Credentials — so this is a plain unauthenticated POST.
 *
 * Anonymous identity only: a UUID in localStorage. We deliberately do NOT
 * send `hints.phone` — on the AI side an unverified phone must never key
 * entitlements, and a widget visitor's phone is unverified by construction.
 */

const STORAGE_ID = 'dt-ai-chat-id'
const STORAGE_CONV = 'dt-ai-chat-conv'
/** Resume the same thread for a day, then start clean. */
const CONV_TTL_MS = 24 * 60 * 60 * 1000

interface Msg {
  id: number
  role: 'user' | 'bot'
  text: string
  pending?: boolean
  failed?: boolean
}

type Copy = {
  title: string
  subtitle: string
  placeholder: string
  send: string
  open: string
  close: string
  greeting: string
  error: string
  retry: string
  offline: string
  aborted: string
  poweredBy: string
}

const COPY: Record<string, Copy> = {
  fr: {
    title: 'Assistant D-Tech',
    subtitle: 'Réponses instantanées sur nos produits',
    placeholder: 'Écrivez votre message…',
    send: 'Envoyer',
    open: 'Ouvrir le chat',
    close: 'Fermer le chat',
    greeting:
      'Bonjour 👋 Posez-moi une question sur nos produits, la disponibilité ou la livraison.',
    error: "Je n'ai pas pu répondre. Réessayez dans un instant.",
    retry: 'Réessayer',
    offline: 'Connexion perdue. Vérifiez votre réseau.',
    aborted: 'Message interrompu. Réessayez.',
    poweredBy: 'Assistant IA · D-Tech Algérie',
  },
  en: {
    title: 'D-Tech Assistant',
    subtitle: 'Instant answers about our products',
    placeholder: 'Type your message…',
    send: 'Send',
    open: 'Open chat',
    close: 'Close chat',
    greeting:
      'Hi 👋 Ask me anything about our products, availability or delivery.',
    error: "I couldn't answer that. Please try again in a moment.",
    retry: 'Retry',
    offline: 'Connection lost. Check your network.',
    aborted: 'Message interrupted. Try again.',
    poweredBy: 'AI assistant · D-Tech Algeria',
  },
  ar: {
    title: 'مساعد D-Tech',
    subtitle: 'أجوبة فورية على منتجاتنا',
    placeholder: 'اكتب رسالتك…',
    send: 'إرسال',
    open: 'افتح المحادثة',
    close: 'أغلق المحادثة',
    greeting: 'مرحبا 👋 اسألني على المنتجات، التوفر ولا التوصيل.',
    error: 'ما قدرتش نجاوب. عاود المحاولة بعد لحظة.',
    retry: 'أعد المحاولة',
    offline: 'انقطع الاتصال. تحقق من الشبكة.',
    aborted: 'تم إيقاف الرسالة. عاود المحاولة.',
    poweredBy: 'مساعد ذكي · D-Tech الجزائر',
  },
}

function readId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_ID)
    if (existing) return existing
    const fresh =
      globalThis.crypto?.randomUUID?.() ??
      `anon-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(STORAGE_ID, fresh)
    return fresh
  } catch {
    return `anon-${Date.now().toString(36)}`
  }
}

function readConversation(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_CONV)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string; at?: number }
    if (!parsed.id || !parsed.at) return null
    if (Date.now() - parsed.at > CONV_TTL_MS) return null
    return parsed.id
  } catch {
    return null
  }
}

function writeConversation(id: string): void {
  try {
    localStorage.setItem(STORAGE_CONV, JSON.stringify({ id, at: Date.now() }))
  } catch {
    /* private mode — the thread just won't resume */
  }
}

export function AiChat({
  baseUrl,
  widgetKey,
  title,
}: {
  baseUrl: string
  widgetKey: string
  title?: string | null
}) {
  const locale = useLocale()
  const c = COPY[locale] ?? COPY.fr!
  const heading = title?.trim() || c.title

  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const conversationId = useRef<string | null>(null)
  const customerId = useRef<string>('')
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLTextAreaElement | null>(null)
  const nextId = useRef(1)
  const lastSent = useRef<string>('')

  useEffect(() => {
    customerId.current = readId()
    conversationId.current = readConversation()
  }, [])

  // Abort any in-flight stream on unmount so we stop billing for a reply
  // nobody will read.
  useEffect(() => () => abort.current?.abort(), [])

  useEffect(() => {
    if (!open) return
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [open, msgs])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const push = (m: Omit<Msg, 'id'>) => {
    const id = nextId.current++
    setMsgs((prev) => [...prev, { ...m, id }])
    return id
  }

  const patch = (
    id: number,
    patchObj: Partial<Msg> | ((currentText: string) => Partial<Msg>)
  ) =>
    setMsgs((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...(typeof patchObj === 'function' ? patchObj(m.text) : patchObj),
            }
          : m
      )
    )

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || busy) return

      lastSent.current = message
      push({ role: 'user', text: message })
      setValue('')
      const botId = push({ role: 'bot', text: '', pending: true })
      setBusy(true)
      analytics.chatMessage()

      const controller = new AbortController()
      abort.current = controller

      try {
        const res = await fetch(`${baseUrl}/api/widget/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetKey,
            conversationId: conversationId.current ?? undefined,
            message,
            customerExternalId: customerId.current,
          }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          patch(botId, { text: c.error, pending: false, failed: true })
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let acc = ''
        let sawDone = false

        const handleFrame = (frame: string) => {
          const line = frame.split(/\r?\n/).find((l) => l.startsWith('data:'))
          if (!line) return
          let evt: {
            type?: string
            text?: string
            reply?: string
            conversationId?: string
          }
          try {
            evt = JSON.parse(line.slice(5).trim())
          } catch {
            return
          }

          if (evt.type === 'delta' && typeof evt.text === 'string') {
            acc += evt.text
            patch(botId, { text: acc, pending: false })
          } else if (evt.type === 'done') {
            sawDone = true
            if (evt.conversationId) {
              conversationId.current = evt.conversationId
              writeConversation(evt.conversationId)
            }
            const final = (evt.reply ?? acc).trim()
            patch(botId, {
              text: final || c.error,
              pending: false,
              failed: final.length === 0,
            })
          }
        }

        // SSE framing: `data: {...}` then a blank line. Split on CRLF as well
        // as LF — a proxy that normalises line endings would otherwise make the
        // parser miss every frame boundary.
        const FRAME_SEP = /\r?\n\r?\n/
        for (;;) {
          const { value: chunk, done } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            break
          }
          buffer += decoder.decode(chunk, { stream: true })

          for (;;) {
            const m = FRAME_SEP.exec(buffer)
            if (!m) break
            const frame = buffer.slice(0, m.index)
            buffer = buffer.slice(m.index + m[0].length)
            handleFrame(frame)
          }
        }

        // Flush a trailing frame that arrived without its blank line — losing
        // it would drop the `done` event, and with it conversationId, so every
        // message would start a brand-new thread.
        if (buffer.trim()) handleFrame(buffer)

        // Stream ended without a `done` frame — the AI side treats that as a
        // lost connection, and so do we.
        if (!sawDone && !acc) {
          patch(botId, { text: c.offline, pending: false, failed: true })
        } else if (!sawDone) {
          patch(botId, { pending: false })
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          // Closing the panel (or unmounting) aborts the stream. Returning
          // without patching left the bubble spinning its typing dots forever,
          // with no `failed` flag so no retry button either.
          patch(botId, (prevText) =>
            prevText
              ? { pending: false }
              : { text: c.aborted, pending: false, failed: true }
          )
          return
        }
        patch(botId, { text: c.offline, pending: false, failed: true })
      } finally {
        setBusy(false)
        abort.current = null
      }
    },
    [baseUrl, widgetKey, busy, c.error, c.offline]
  )

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        analytics.chatOpen()
        if (msgs.length === 0) {
          setMsgs([{ id: nextId.current++, role: 'bot', text: c.greeting }])
        }
        // focus after the panel has painted
        setTimeout(() => input.current?.focus(), 60)
      } else {
        abort.current?.abort()
      }
      return next
    })
  }

  return (
    <>
      <button
        type="button"
        className={open ? 'dt-chat-fab is-open' : 'dt-chat-fab'}
        onClick={toggle}
        aria-label={open ? c.close : c.open}
        aria-expanded={open}
        aria-controls="dt-chat-panel"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-3.8-.8L3 21l1.9-5.2A8.2 8.2 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
          </svg>
        )}
      </button>

      <div
        id="dt-chat-panel"
        className={open ? 'dt-chat-panel is-open' : 'dt-chat-panel'}
        role="dialog"
        aria-modal="false"
        aria-label={heading}
        // Keep it out of the a11y tree AND out of tab order while closed.
        {...(open ? {} : { hidden: true })}
      >
        <header className="dt-chat-head">
          <span className="dt-chat-avatar" aria-hidden>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <rect x="4" y="7" width="16" height="12" rx="3.5" />
              <path d="M12 7V4M9 13h.01M15 13h.01" />
            </svg>
          </span>
          <span className="dt-chat-headtext">
            <strong>{heading}</strong>
            <small>{c.subtitle}</small>
          </span>
          <button
            type="button"
            className="dt-chat-x"
            onClick={() => setOpen(false)}
            aria-label={c.close}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="dt-chat-log" ref={scroller} aria-live="polite" aria-atomic="false">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={[
                'dt-chat-msg',
                m.role === 'user' ? 'is-user' : 'is-bot',
                m.failed ? 'is-failed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {m.pending && !m.text ? (
                <span className="dt-chat-typing" aria-label="…">
                  <i /><i /><i />
                </span>
              ) : (
                m.text
              )}
            </div>
          ))}
          {msgs.some((m) => m.failed) && !busy && lastSent.current ? (
            <button
              type="button"
              className="dt-chat-retry"
              onClick={() => {
                const text = lastSent.current
                // Drop the failed bot bubble AND the user bubble that produced
                // it — send() re-pushes the user message, so filtering only on
                // `failed` (which the user bubble never carries) left a
                // duplicate behind.
                setMsgs((prev) => {
                  const next = prev.filter((m) => !m.failed)
                  const lastUser = [...next]
                    .reverse()
                    .find((m) => m.role === 'user' && m.text === text)
                  return lastUser ? next.filter((m) => m.id !== lastUser.id) : next
                })
                void send(text)
              }}
            >
              {c.retry}
            </button>
          ) : null}
        </div>

        <form
          className="dt-chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            void send(value)
          }}
        >
          <textarea
            ref={input}
            className="dt-chat-input"
            rows={1}
            value={value}
            maxLength={4000}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(value)
              }
            }}
            placeholder={c.placeholder}
            aria-label={c.placeholder}
            disabled={busy}
          />
          <button
            type="submit"
            className="dt-chat-send"
            disabled={busy || value.trim().length === 0}
            aria-label={c.send}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.4l17.4-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.2L4.3 11 14 12l-9.7 1 -2.3 6.2a1 1 0 001.4 1.2z" />
            </svg>
          </button>
        </form>
        <p className="dt-chat-foot">{c.poweredBy}</p>
      </div>
    </>
  )
}
