import { useState, useEffect } from 'react'

const HINTS_DELAY_SECONDS = 60

interface Props {
  hints: string[]
  taskStartTime: number
}

export default function HintsPanel({ hints, taskStartTime }: Props) {
  const [now, setNow] = useState(Date.now())
  const [expandedHints, setExpandedHints] = useState<Set<number>>(new Set())

  useEffect(() => {
    setExpandedHints(new Set())
  }, [taskStartTime])

  useEffect(() => {
    const elapsed = (now - taskStartTime) / 1000
    if (elapsed >= HINTS_DELAY_SECONDS) return

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [taskStartTime, now])

  const elapsed = (now - taskStartTime) / 1000
  const hintsUnlocked = elapsed >= HINTS_DELAY_SECONDS
  const secondsRemaining = Math.max(0, Math.ceil(HINTS_DELAY_SECONDS - elapsed))

  const toggleHint = (i: number) => {
    setExpandedHints((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (!hints.length) return null

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <span className="text-sm font-medium text-gray-300">
          💡 Hinweise ({hints.length})
        </span>
        {!hintsUnlocked && (
          <span className="text-xs text-gray-500 tabular-nums">
            verfügbar in {secondsRemaining}s
          </span>
        )}
        {hintsUnlocked && (
          <span className="text-xs text-emerald-500">Verfügbar</span>
        )}
      </div>

      {!hintsUnlocked && (
        <div className="px-4 py-4 bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-600 rounded-full transition-all duration-1000"
                style={{ width: `${(elapsed / HINTS_DELAY_SECONDS) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 tabular-nums w-10 text-right">{secondsRemaining}s</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Versuche es erst selbst! Hinweise werden nach {HINTS_DELAY_SECONDS} Sekunden freigeschaltet.
          </p>
        </div>
      )}

      {hintsUnlocked && (
        <div className="divide-y divide-gray-800">
          {hints.map((hint, i) => (
            <div key={i} className="bg-gray-950">
              <button
                onClick={() => toggleHint(i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-900/50 transition-colors"
              >
                <span className="text-sm text-gray-400">
                  <span className="text-gray-600 mr-2">#{i + 1}</span>
                  {expandedHints.has(i) ? hint : 'Hinweis anzeigen...'}
                </span>
                <span className={`text-gray-600 text-xs transition-transform ${expandedHints.has(i) ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>
              {expandedHints.has(i) && (
                <div className="px-4 pb-3">
                  <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-lg px-3 py-2 text-yellow-200 text-sm">
                    {hint}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
