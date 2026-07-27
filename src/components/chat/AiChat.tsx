'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { analytics } from '@/lib/analytics'
import { WHATSAPP_NUMBER } from '@/lib/cart'
import { useChatPanel } from '@/lib/chat-panel'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import './ai-chat.css'

/**
 * D-Tech AI customer chat — bubble + panel, present on ALL THREE skins.
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
 *
 * ROUND 17 — the launcher is ALWAYS mounted, even before an admin has pasted
 * the base URL + widget key. Without them the panel opens in handoff mode
 * (human contact card: WhatsApp / phone) instead of not existing at all: a
 * visitor who clicks "chat" must never meet a dead bubble, and the icon must
 * not blink in and out of three headers depending on a settings row. Opening
 * is driven by `useChatPanel`, so every skin's header icon and the floating
 * bubble control the same panel.
 */

const STORAGE_ID = 'dt-ai-chat-id'
const STORAGE_CONV = 'dt-ai-chat-conv'
/** Resume the same thread for a day, then start clean. */
const CONV_TTL_MS = 24 * 60 * 60 * 1000
/** Below this the panel becomes a bottom sheet (and a real modal). */
const SHEET_MQ = '(max-width: 560px)'

const PHONE_TEL = '+213560990506'
const PHONE_LABEL = '0560 99 05 06'

interface Msg {
  id: number
  role: 'user' | 'bot'
  text: string
  pending?: boolean
  failed?: boolean
}

interface Chip {
  label: string
  prompt: string
}

interface Copy {
  title: string
  status: string
  statusOff: string
  placeholder: string
  send: string
  open: string
  close: string
  reset: string
  greeting: string
  greetingOff: string
  error: string
  retry: string
  offline: string
  aborted: string
  poweredBy: string
  chipsIntro: string
  chips: Chip[]
  waCta: string
  callCta: string
  orHuman: string
}

const COPY: Record<string, Copy> = {
  fr: {
    title: 'Assistant D-Tech',
    status: 'En ligne · réponse immédiate',
    statusOff: 'Notre équipe vous répond sur WhatsApp',
    placeholder: 'Écrivez votre message…',
    send: 'Envoyer',
    open: 'Discuter avec l’assistant D-Tech',
    close: 'Fermer le chat',
    reset: 'Nouvelle conversation',
    greeting:
      'Bonjour 👋 Je suis l’assistant D-Tech. Posez-moi une question sur nos produits, la disponibilité ou la livraison.',
    greetingOff:
      'Bonjour 👋 L’assistant IA est en cours d’activation. En attendant, notre équipe vous répond tout de suite sur WhatsApp ou par téléphone.',
    error: "Je n'ai pas pu répondre. Réessayez dans un instant.",
    retry: 'Réessayer',
    offline: 'Connexion perdue. Vérifiez votre réseau.',
    aborted: 'Message interrompu. Réessayez.',
    poweredBy: 'Assistant IA · D-Tech Algérie',
    chipsIntro: 'Questions fréquentes',
    chips: [
      { label: 'PC portables', prompt: 'Quels PC portables recommandez-vous ?' },
      { label: 'Imprimantes', prompt: 'Quelles imprimantes proposez-vous ?' },
      { label: 'Livraison', prompt: 'Comment se passe la livraison en Algérie ?' },
      { label: 'Nous trouver', prompt: 'Où se trouve votre showroom ?' },
    ],
    waCta: 'Continuer sur WhatsApp',
    callCta: `Appeler ${PHONE_LABEL}`,
    orHuman: 'Parler à un conseiller',
  },
  en: {
    title: 'D-Tech Assistant',
    status: 'Online · instant answers',
    statusOff: 'Our team replies on WhatsApp',
    placeholder: 'Type your message…',
    send: 'Send',
    open: 'Chat with the D-Tech assistant',
    close: 'Close chat',
    reset: 'New conversation',
    greeting:
      'Hi 👋 I’m the D-Tech assistant. Ask me anything about our products, availability or delivery.',
    greetingOff:
      'Hi 👋 The AI assistant is being switched on. In the meantime our team answers right away on WhatsApp or by phone.',
    error: "I couldn't answer that. Please try again in a moment.",
    retry: 'Retry',
    offline: 'Connection lost. Check your network.',
    aborted: 'Message interrupted. Try again.',
    poweredBy: 'AI assistant · D-Tech Algeria',
    chipsIntro: 'Popular questions',
    chips: [
      { label: 'Laptops', prompt: 'Which laptops do you recommend?' },
      { label: 'Printers', prompt: 'Which printers do you carry?' },
      { label: 'Delivery', prompt: 'How does delivery work in Algeria?' },
      { label: 'Find us', prompt: 'Where is your showroom located?' },
    ],
    waCta: 'Continue on WhatsApp',
    callCta: `Call ${PHONE_LABEL}`,
    orHuman: 'Talk to an advisor',
  },
  ar: {
    title: 'مساعد D-Tech',
    status: 'متصل · إجابة فورية',
    statusOff: 'فريقنا يجاوبك على واتساب',
    placeholder: 'اكتب رسالتك…',
    send: 'إرسال',
    open: 'تحدث مع مساعد D-Tech',
    close: 'أغلق المحادثة',
    reset: 'محادثة جديدة',
    greeting: 'مرحبا 👋 أنا مساعد D-Tech. اسألني على المنتجات، التوفر ولا التوصيل.',
    greetingOff:
      'مرحبا 👋 المساعد الذكي في طور التفعيل. في الأثناء، فريقنا يجاوبك مباشرة على واتساب ولا بالهاتف.',
    error: 'ما قدرتش نجاوب. عاود المحاولة بعد لحظة.',
    retry: 'أعد المحاولة',
    offline: 'انقطع الاتصال. تحقق من الشبكة.',
    aborted: 'تم إيقاف الرسالة. عاود المحاولة.',
    poweredBy: 'مساعد ذكي · D-Tech الجزائر',
    chipsIntro: 'أسئلة متكررة',
    chips: [
      { label: 'حواسيب محمولة', prompt: 'أي حواسيب محمولة تنصحون بها؟' },
      { label: 'طابعات', prompt: 'ما هي الطابعات المتوفرة لديكم؟' },
      { label: 'التوصيل', prompt: 'كيف يتم التوصيل في الجزائر؟' },
      { label: 'موقعنا', prompt: 'أين يقع معرضكم؟' },
    ],
    waCta: 'المتابعة على واتساب',
    callCta: `اتصل بـ ${PHONE_LABEL}`,
    orHuman: 'التحدث إلى مستشار',
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

function BotMark({ s = 18 }: { s?: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="7.5" width="17" height="12" rx="4" />
      <path d="M12 7.5V4.4M9.6 13h.01M14.4 13h.01M9.6 16.3c1.5.8 3.3.8 4.8 0" />
      <circle cx="12" cy="3.1" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WaMark({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.34M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.38a9.86 9.86 0 0 1-1.51-5.26C2.16 6.45 6.6 2.01 12.05 2.01c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.4" />
    </svg>
  )
}

export function AiChat({
  baseUrl,
  widgetKey,
  title,
}: {
  baseUrl?: string | null
  widgetKey?: string | null
  title?: string | null
}) {
  const locale = useLocale()
  const c = COPY[locale] ?? COPY.fr!
  const heading = title?.trim() || c.title
  /** The AI backend is reachable only when BOTH settings are present. */
  const live = Boolean(baseUrl && widgetKey)

  const open = useChatPanel((s) => s.open)
  const setOpen = useChatPanel((s) => s.setOpen)
  const toggle = useChatPanel((s) => s.toggle)

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [sheet, setSheet] = useState(false)

  const conversationId = useRef<string | null>(null)
  const customerId = useRef<string>('')
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLTextAreaElement | null>(null)
  const nextId = useRef(1)
  const lastSent = useRef<string>('')
  const wasOpen = useRef(false)

  const waHref = useMemo(() => {
    const text = locale === 'ar' ? 'سلام، عندي سؤال' : 'Bonjour, j’ai une question'
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
  }, [locale])

  useEffect(() => {
    customerId.current = readId()
    conversationId.current = readConversation()
  }, [])

  // The bottom-sheet layout IS a modal (focus trap + scroll lock); the desktop
  // panel is not, so it must never steal focus or lock the page behind it.
  useEffect(() => {
    const mq = window.matchMedia(SHEET_MQ)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- viewport probe after SSR
    const sync = () => setSheet(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Abort any in-flight stream on unmount so we stop billing for a reply
  // nobody will read.
  useEffect(() => () => abort.current?.abort(), [])

  useEffect(() => {
    if (!open) return
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [open, msgs])

  // Open/close side effects — analytics, focus, aborting a dangling stream.
  useEffect(() => {
    if (open === wasOpen.current) return
    wasOpen.current = open
    if (open) {
      analytics.chatOpen()
      const timer = window.setTimeout(() => input.current?.focus(), 90)
      return () => window.clearTimeout(timer)
    }
    abort.current?.abort()
    return
  }, [open])

  const close = useCallback(() => setOpen(false), [setOpen])

  // Escape closes from anywhere on desktop (the sheet gets it from the trap).
  useEffect(() => {
    if (!open || sheet) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sheet, close])

  const trapRef = useFocusTrap<HTMLDivElement>(open && sheet, close)

  useEffect(() => {
    if (!open || !sheet) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, sheet])

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
      if (!message || busy || !baseUrl || !widgetKey) return

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
    [baseUrl, widgetKey, busy, c.error, c.offline, c.aborted]
  )

  const reset = () => {
    abort.current?.abort()
    conversationId.current = null
    try {
      localStorage.removeItem(STORAGE_CONV)
    } catch {
      /* private mode */
    }
    lastSent.current = ''
    setMsgs([])
    setValue('')
    input.current?.focus()
  }

  /** The greeting is derived, never seeded into state — so it always matches
   *  the current locale and live/handoff mode, and "new conversation" stays a
   *  plain `setMsgs([])`. */
  const empty = msgs.length === 0
  const thread: Msg[] = empty
    ? [{ id: 0, role: 'bot', text: live ? c.greeting : c.greetingOff }]
    : msgs
  const canRetry =
    live && !busy && Boolean(lastSent.current) && msgs.some((m) => m.failed)

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
        <span className="dt-chat-fab-ico" aria-hidden="true">
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <BotMark s={23} />
          )}
        </span>
        {!open ? <span className="dt-chat-halo" aria-hidden="true" /> : null}
        <span className="dt-chat-tip" aria-hidden="true">
          {c.title}
        </span>
      </button>

      {sheet && open ? (
        <div className="dt-chat-scrim" role="presentation" onPointerDown={close} />
      ) : null}

      <div
        id="dt-chat-panel"
        ref={trapRef}
        className={open ? 'dt-chat-panel is-open' : 'dt-chat-panel'}
        role="dialog"
        aria-modal={sheet && open ? true : undefined}
        aria-label={heading}
        // Keep it out of the a11y tree AND out of tab order while closed.
        {...(open ? {} : { hidden: true })}
      >
        <header className="dt-chat-head">
          <span className="dt-chat-grab" aria-hidden="true" />
          <span className="dt-chat-avatar" aria-hidden="true">
            <BotMark s={19} />
            <i className={live ? 'dt-chat-live' : 'dt-chat-live is-off'} />
          </span>
          <span className="dt-chat-headtext">
            <strong>{heading}</strong>
            <small>{live ? c.status : c.statusOff}</small>
          </span>
          {!empty ? (
            <button
              type="button"
              className="dt-chat-hbtn"
              onClick={reset}
              aria-label={c.reset}
              title={c.reset}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className="dt-chat-hbtn"
            onClick={close}
            aria-label={c.close}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="dt-chat-log" ref={scroller} aria-live="polite" aria-atomic="false">
          {thread.map((m) => (
            <div
              key={m.id}
              className={[
                'dt-chat-row',
                m.role === 'user' ? 'is-user' : 'is-bot',
                m.failed ? 'is-failed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {m.role === 'bot' ? (
                <span className="dt-chat-mini" aria-hidden="true">
                  <BotMark s={14} />
                </span>
              ) : null}
              <div className="dt-chat-msg">
                {m.pending && !m.text ? (
                  <span className="dt-chat-typing" aria-label="…">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}

          {live && empty ? (
            <div className="dt-chat-chips">
              <p className="dt-chat-chips-t">{c.chipsIntro}</p>
              <div className="dt-chat-chips-row">
                {c.chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="dt-chat-chip"
                    onClick={() => void send(chip.prompt)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {canRetry ? (
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

        {live ? (
          <>
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
            <p className="dt-chat-foot">
              <a
                className="dt-chat-footlink"
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.contactClick('whatsapp')}
              >
                {c.orHuman}
              </a>
              <span>{c.poweredBy}</span>
            </p>
          </>
        ) : (
          <div className="dt-chat-handoff">
            <a
              className="dt-chat-wa"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.contactClick('whatsapp')}
            >
              <WaMark s={17} />
              {c.waCta}
            </a>
            <a
              className="dt-chat-call"
              href={`tel:${PHONE_TEL}`}
              onClick={() => analytics.contactClick('phone')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z" />
              </svg>
              {c.callCta}
            </a>
          </div>
        )}
      </div>
    </>
  )
}
