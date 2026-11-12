import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '../utils/useMediaQuery'
import { MONTHS, MONTHS_SHORT, toISO, fromISO, formatISO, addDays } from '../utils/dates'

// A glass-styled date picker that replaces the browser's native <input
// type="date"> popup (which can't be themed). Values are local-calendar
// strings "YYYY-MM-DD" — the same format the native input used — so callers
// didn't need to change their data.

export interface DatePreset {
  label: string
  value: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Shows a "Clear" action; called instead of onChange(''). */
  onClear?: () => void
  clearLabel?: string
  presets?: DatePreset[]
  /** Shade the days between these two (inclusive) — for range pickers. */
  rangeStart?: string
  rangeEnd?: string
  /** Days outside this span render dimmed (still selectable). */
  hintMin?: string
  hintMax?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** 6×7 grid of dates for the month containing `view`, Monday first. */
function monthGrid(view: Date): Date[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const start = addDays(first, -lead)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

const POP_W = 296

export default function DatePicker({
  value, onChange, placeholder = 'Pick a date', onClear, clearLabel = 'Clear',
  presets, rangeStart, rangeEnd, hintMin, hintMax, disabled, ariaLabel, className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'days' | 'months'>('days')
  const [view, setView] = useState(() => fromISO(value) ?? new Date())
  const [focus, setFocus] = useState(() => value || toISO(new Date()))
  const [pos, setPos] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const today = toISO(new Date())
  // Phones get a bottom sheet instead of an anchored popover.
  const sheet = useIsMobile()

  function openPicker() {
    const start = fromISO(value) ?? new Date()
    setView(start)
    setFocus(toISO(start))
    setMode('days')
    setOpen(true)
  }

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function pick(v: string) {
    onChange(v)
    close()
  }

  // Fixed-position popover anchored to the trigger; flips above when there
  // isn't room below, and stays inside the viewport horizontally.
  useLayoutEffect(() => {
    if (!open || sheet) return
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      const h = popRef.current?.offsetHeight ?? 380
      if (!r) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const left = Math.max(8, Math.min(r.left, vw - POP_W - 8))
      const fitsBelow = r.bottom + 8 + h <= vh - 8
      const fitsAbove = r.top - 8 - h >= 8
      // Prefer below; go above only if that's the side it fits on. If it fits
      // nowhere (short phone screens), pin it inside the viewport.
      const top = fitsBelow || !fitsAbove ? r.bottom + 8 : r.top - h - 8
      setPos({ left, top: Math.max(8, Math.min(top, vh - h - 8)) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, mode, sheet])

  // Outside click closes.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Keep keyboard focus on the active day while navigating.
  useEffect(() => {
    if (!open || mode !== 'days') return
    popRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus()
  }, [open, mode, focus, view])

  function moveFocus(days: number) {
    const next = addDays(fromISO(focus) ?? new Date(), days)
    setFocus(toISO(next))
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) setView(next)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (mode !== 'days') return
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in moves) { e.preventDefault(); moveFocus(moves[e.key]) }
    else if (e.key === 'PageUp') { e.preventDefault(); shiftMonth(-1) }
    else if (e.key === 'PageDown') { e.preventDefault(); shiftMonth(1) }
  }

  function shiftMonth(n: number) {
    const v = new Date(view.getFullYear(), view.getMonth() + n, 1)
    setView(v)
    const f = fromISO(focus) ?? v
    const last = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate()
    setFocus(toISO(new Date(v.getFullYear(), v.getMonth(), Math.min(f.getDate(), last))))
  }

  const lo = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : ''
  const hi = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : ''

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`dp-trigger${open ? ' is-open' : ''}${value ? '' : ' is-empty'}${className ? ` ${className}` : ''}`}
        onClick={() => (open ? close() : openPicker())}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="dp-trigger-icon">
          <path fillRule="evenodd" d="M7 2h2v2h6V2h2v2h2.5A1.5 1.5 0 0 1 21 5.5v14a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-14A1.5 1.5 0 0 1 4.5 4H7Zm-2 7v10h14V9Zm2 2.5h3v3H7Z" />
        </svg>
        <span className="dp-trigger-text">{value ? formatISO(value) : placeholder}</span>
      </button>

      {open && createPortal(
        <>
        {sheet && <div className="dp-backdrop" aria-hidden="true" />}
        <div
          ref={popRef}
          className={`dp-pop${sheet ? ' dp-sheet' : ''}`}
          role="dialog"
          aria-modal={sheet || undefined}
          aria-label={ariaLabel ?? 'Choose date'}
          style={sheet ? undefined : { ...pos, width: POP_W }}
          onKeyDown={onKeyDown}
        >
          {sheet && <div className="dp-grabber" aria-hidden="true" />}
          <div className="dp-head">
            <button
              type="button"
              className="dp-title"
              onClick={() => setMode(m => (m === 'days' ? 'months' : 'days'))}
              aria-label={mode === 'days' ? 'Choose month and year' : 'Back to days'}
            >
              {mode === 'days' ? `${MONTHS[view.getMonth()]} ${view.getFullYear()}` : view.getFullYear()}
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" className={mode === 'months' ? 'flip' : ''}>
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="dp-nav">
              <button type="button" aria-label={mode === 'days' ? 'Previous month' : 'Previous year'}
                onClick={() => (mode === 'days' ? shiftMonth(-1) : setView(new Date(view.getFullYear() - 1, view.getMonth(), 1)))}>
                <Chevron dir="left" />
              </button>
              <button type="button" aria-label={mode === 'days' ? 'Next month' : 'Next year'}
                onClick={() => (mode === 'days' ? shiftMonth(1) : setView(new Date(view.getFullYear() + 1, view.getMonth(), 1)))}>
                <Chevron dir="right" />
              </button>
            </div>
          </div>

          {mode === 'days' ? (
            <div className="dp-grid" role="grid">
              {WEEKDAYS.map(w => <span key={w} className="dp-dow" role="columnheader">{w}</span>)}
              {monthGrid(view).map(d => {
                const iso = toISO(d)
                const outside = d.getMonth() !== view.getMonth()
                const selected = iso === value
                const inRange = lo && iso >= lo && iso <= hi
                const edge = iso === lo || iso === hi
                const dim = (hintMin && iso < hintMin) || (hintMax && iso > hintMax)
                const cls = ['dp-day',
                  outside && 'is-outside',
                  iso === today && 'is-today',
                  inRange && 'in-range',
                  inRange && iso === lo && 'range-start',
                  inRange && iso === hi && 'range-end',
                  (selected || (inRange && edge)) && 'is-selected',
                  dim && 'is-dim',
                ].filter(Boolean).join(' ')
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    className={cls}
                    data-day={iso}
                    tabIndex={iso === focus ? 0 : -1}
                    aria-selected={selected}
                    aria-label={formatISO(iso)}
                    onClick={() => pick(iso)}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="dp-months">
              {MONTHS_SHORT.map((m, i) => {
                const isView = fromISO(value)
                const sel = isView && isView.getFullYear() === view.getFullYear() && isView.getMonth() === i
                return (
                  <button
                    key={m}
                    type="button"
                    className={`dp-month${sel ? ' is-selected' : ''}`}
                    onClick={() => { setView(new Date(view.getFullYear(), i, 1)); setMode('days') }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          )}

          {presets && presets.length > 0 && (
            <div className="dp-presets">
              {presets.map(p => (
                <button key={p.label} type="button" className={`dp-preset${p.value === value ? ' is-active' : ''}`} onClick={() => pick(p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="dp-foot">
            {onClear
              ? <button type="button" className="dp-link" onClick={() => { onClear(); close() }}>{clearLabel}</button>
              : <span />}
            <button type="button" className="dp-link dp-link-strong" onClick={() => pick(today)}>Today</button>
          </div>
        </div>
        </>,
        document.body,
      )}
    </>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 5 8 12l7 7' : 'm9 5 7 7-7 7'} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
