import { useState, useRef } from 'react'
import type { Course } from '../types'

interface Props {
  onCourseLoaded: (course: Course) => void
}

const LLM_PROMPT = `Erstelle einen Regex-Kurs im folgenden JSON-Format. Der Kurs soll Lernenden helfen, reguläre Ausdrücke zu verstehen.

JSON-Format:
\`\`\`json
{
  "course": {
    "title": "Kursname",
    "description": "Kurzbeschreibung",
    "author": "Autor (optional)"
  },
  "tasks": [
    {
      "id": "task-1",
      "title": "Aufgabentitel",
      "description": "Aufgabenbeschreibung mit **Markdown** support. Erkläre, was die Aufgabe erfordert.",
      "testCases": [
        { "text": "Testtext der matchen soll", "shouldMatch": true },
        { "text": "Testtext der NICHT matchen soll", "shouldMatch": false }
      ],
      "hints": [
        "Erster Hinweis (allgemein)",
        "Zweiter Hinweis (konkreter)",
        "Dritter Hinweis (sehr konkret)"
      ],
      "solution": "regulaerer_ausdruck_hier",
      "explanation": "Erklärung warum diese Lösung funktioniert",
      "flags": "gi"
    }
  ]
}
\`\`\`

Wichtige Regeln:
- Jede Aufgabe braucht mindestens 4 Testfälle (2x shouldMatch:true, 2x shouldMatch:false)
- hints Array: 2-4 Hinweise, vom allgemeinen zum konkreten
- solution: nur der Regex-Ausdruck, ohne Schrägstriche
- flags: optional, z.B. "gi" für global+case-insensitive
- description: darf Markdown verwenden (**fett**, \`code\`, etc.)
- ids müssen eindeutig sein

Erstelle einen Kurs mit [ANZAHL] Aufgaben zum Thema [THEMA].
Schwierigkeitsniveau: [ANFÄNGER/FORTGESCHRITTEN/EXPERTE]
Sprache der Beschreibungen: [DEUTSCH/ENGLISCH]`

export default function TaskLoader({ onCourseLoaded }: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCourse = (raw: unknown): Course => {
    if (typeof raw !== 'object' || raw === null) throw new Error('Ungültiges JSON-Format')
    const obj = raw as Record<string, unknown>
    if (!obj.course || !Array.isArray(obj.tasks)) {
      throw new Error('JSON muss "course" und "tasks" enthalten')
    }
    return raw as Course
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        onCourseLoaded(parseCourse(data))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei')
      }
    }
    reader.readAsText(file)
  }

  const handleUrl = async () => {
    if (!urlInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(urlInput.trim())
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      onCourseLoaded(parseCourse(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der URL')
    } finally {
      setLoading(false)
    }
  }

  const handleExample = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/example-tasks.json')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      onCourseLoaded(parseCourse(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Beispiels')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(LLM_PROMPT)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    } catch {
      setPromptCopied(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl font-mono font-bold text-emerald-400 mb-2">
            /regex/
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Regex Lernplattform</h1>
          <p className="text-gray-400">Lerne reguläre Ausdrücke durch interaktive Übungen</p>
        </div>

        {/* Load Options */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">

          {/* Example */}
          <div>
            <button
              onClick={handleExample}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>▶</span>
              )}
              Beispielkurs laden
            </button>
            <p className="text-xs text-gray-500 mt-1 text-center">7 Aufgaben · Grundlagen bis Fortgeschritten</p>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-sm">oder</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">JSON-Datei hochladen</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 hover:border-emerald-600 rounded-xl p-6 text-center cursor-pointer transition-colors"
            >
              <div className="text-2xl mb-1">📂</div>
              <div className="text-gray-400 text-sm">Klicken oder Datei hierher ziehen</div>
              <div className="text-gray-600 text-xs mt-1">.json Dateien</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kurs-URL laden</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrl()}
                placeholder="https://example.com/kurs.json"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              <button
                onClick={handleUrl}
                disabled={loading || !urlInput.trim()}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
              >
                Laden
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-3 text-red-300 text-sm">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* LLM Prompt Template */}
        <div className="mt-4 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <button
            onClick={() => setShowPrompt((s) => !s)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
          >
            <div>
              <span className="font-medium text-gray-200">KI-Prompt-Template</span>
              <span className="text-gray-500 text-sm ml-2">Erstelle eigene Kurse mit ChatGPT, Claude & Co.</span>
            </div>
            <span className={`text-gray-400 transition-transform ${showPrompt ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {showPrompt && (
            <div className="px-6 pb-6">
              <p className="text-gray-400 text-sm mb-3">
                Kopiere diesen Prompt und ersetze die Platzhalter in eckigen Klammern:
              </p>
              <div className="relative">
                <pre className="bg-gray-950 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-auto max-h-64 whitespace-pre-wrap border border-gray-800">
                  {LLM_PROMPT}
                </pre>
                <button
                  onClick={handleCopyPrompt}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
                >
                  {promptCopied ? '✓ Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
