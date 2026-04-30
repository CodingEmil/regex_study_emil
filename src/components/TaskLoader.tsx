import { useState, useRef } from 'react'
import type { Course } from '../types'

interface Props {
  onCourseLoaded: (course: Course) => void
}

interface ValidationIssue {
  taskId: string | number
  taskTitle: string
  message: string
}

const TRIVIAL_PATTERNS = [
  '\\d', '\\d+', '\\d*', '\\w', '\\w+', '\\w*',
  '.', '.+', '.*', '\\s', '\\s+',
  '[a-z]', '[A-Z]', '[a-zA-Z]', '[a-zA-Z]+',
  '[a-zA-Z0-9]', '[a-zA-Z0-9]+', '[a-zA-Z0-9_]', '[a-zA-Z0-9_]+',
]

function passesAllTests(pattern: string, flags: string, testCases: { text: string; shouldMatch: boolean }[]): boolean {
  try {
    const r = new RegExp(pattern, flags.replace('g', ''))
    return testCases.every((tc) => r.test(tc.text) === tc.shouldMatch)
  } catch {
    return false
  }
}

function validateCourse(course: Course): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const task of course.tasks) {
    if (!task.solution) {
      issues.push({ taskId: task.id, taskTitle: task.title, message: 'Kein solution-Feld vorhanden.' })
      continue
    }
    const flags = (task.flags ?? '').replace(/[^gimsuy]/g, '')
    let regex: RegExp
    try {
      regex = new RegExp(task.solution, flags)
    } catch {
      issues.push({ taskId: task.id, taskTitle: task.title, message: `Ungültiger Regex: /${task.solution}/` })
      continue
    }

    // Check 1: solution must pass all test cases
    let solutionFailed = false
    for (const tc of task.testCases) {
      const r = new RegExp(regex.source, regex.flags.replace('g', ''))
      const matched = r.test(tc.text)
      if (matched !== tc.shouldMatch) {
        const expected = tc.shouldMatch ? 'matchen' : 'nicht matchen'
        const got = matched ? 'matcht' : 'matcht nicht'
        issues.push({
          taskId: task.id,
          taskTitle: task.title,
          message: `solution /${task.solution}/ ${got} "${tc.text}", soll aber ${expected}.`,
        })
        solutionFailed = true
      }
    }
    if (solutionFailed) continue

    // Check 2: no trivial pattern should pass all tests (unless it IS the solution)
    const trivialThatPasses = TRIVIAL_PATTERNS.filter(
      (p) => p !== task.solution && passesAllTests(p, flags, task.testCases),
    )
    if (trivialThatPasses.length > 0) {
      issues.push({
        taskId: task.id,
        taskTitle: task.title,
        message: `Triviale Regex bestehen alle Tests: ${trivialThatPasses.map((p) => `/${p}/`).join(', ')} — Testfälle zu schwach.`,
      })
    }
  }
  return issues
}

const LLM_PROMPT = `Du erstellst einen Regex-Lernkurs als JSON. Befolge alle Regeln exakt.

═══════════════════════════════
JSON-FORMAT (exakt so einhalten)
═══════════════════════════════
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
      "description": "Aufgabenbeschreibung. Erkläre das Regex-Konzept und was die Aufgabe verlangt. Markdown erlaubt.",
      "testCases": [
        { "text": "Text der matchen soll",       "shouldMatch": true  },
        { "text": "Text der NICHT matchen soll",  "shouldMatch": false }
      ],
      "hints": [
        "Allgemeiner Hinweis",
        "Konkreterer Hinweis",
        "Fast die Lösung"
      ],
      "solution": "nur_der_regex_ohne_slashes",
      "explanation": "Warum diese Lösung funktioniert",
      "flags": ""
    }
  ]
}

═══════════════════════════════════
PFLICHTREGELN – KEINE AUSNAHMEN
═══════════════════════════════════
1. SOLUTION MUSS KORREKT SEIN
   Bevor du eine Aufgabe schreibst, prüfe mental jeden Testfall:
   - Für jeden shouldMatch:true  → new RegExp(solution).test(text) muss true  ergeben
   - Für jeden shouldMatch:false → new RegExp(solution).test(text) muss false ergeben
   Wenn auch nur EIN Testfall falsch ist, korrigiere solution ODER testCases.

2. TESTFÄLLE: MINDESTENS 8 PRO AUFGABE
   - Mindestens 3x shouldMatch:true
   - Mindestens 4x shouldMatch:false
   - Davon mindestens 2x bewusst gewählte "Fallen" (siehe Regel 3)

3. ★ ANTI-TRIVIAL-PFLICHT (WICHTIGSTE REGEL) ★
   Deine Testfälle MÜSSEN folgende triviale Falsch-Antworten ausschließen:
     /\\d/  /\\d+/  /\\w/  /\\w+/  /./  /.+/  /.*/  /[a-z]/  /[a-zA-Z]+/  /[a-zA-Z0-9]+/

   Wenn auch nur EINE dieser trivialen Regex alle deine Tests besteht,
   ist deine Aufgabe WERTLOS und muss überarbeitet werden.

   Konkrete Anti-Trivial-Strategien:
   a) Mindestens ein shouldMatch:true OHNE Ziffern → /\\d/ scheitert
   b) Mindestens ein shouldMatch:true mit NUR Ziffern (falls erlaubt)
      ODER ein shouldMatch:false das NUR Buchstaben enthält → /\\w+/ scheitert
   c) Mindestens ein shouldMatch:false mit GENAU EINEM Zeichen → /./ scheitert
   d) Bei Längen-Validierung: Grenzfall-Tests (genau Min, Min-1, genau Max, Max+1)
   e) Bei Anker-basierten Lösungen (^...$): Mindestens ein shouldMatch:false
      das das Pattern nur als TEILSTRING enthält
      Beispiel: solution=^\\w{3,16}$, dann muss "user@name" ein false-Fall sein
      (denn "user" ist ein gültiger Substring, aber das Gesamtwort nicht).

4. VARIATIONS-PFLICHT
   Jeder shouldMatch:true muss eine ANDERE Variante der gültigen Form testen.
   Beispiel Username (3-16 Wortzeichen):
     "Max"               (Mindestlänge, nur Buchstaben — verhindert /\\d/)
     "user_name"         (mit Underscore)
     "ABCDEFGHIJKLMNOP"  (Maximallänge)
     "abc123"            (Buchstaben+Ziffern Mix)

5. ABKÜRZUNGS-FALLEN
   Wenn solution den Substring "abc" matcht, füge "ab" als shouldMatch:false ein.
   Wenn solution \\w{3,16} ist, füge "ab" (zu kurz) als shouldMatch:false ein.

6. NUR JAVASCRIPT-KOMPATIBLER REGEX
   Verboten: variable-length lookbehind (?<=a+), atomic groups, \\p{...} ohne u-Flag
   Erlaubt: (?=...) (?!...) (?<=...) mit fixer Länge, alle Standard-Quantoren

7. KEIN g-FLAG
   Lass flags leer ("") oder nutze nur i, m, s — niemals g (bricht .test()).

8. JSON-ESCAPING
   Backslashes verdoppeln: \\\\d \\\\w \\\\s \\\\b \\\\. usw.
   Anführungszeichen innerhalb von Strings: nutze \\\\" oder andere Zeichen.

9. IDS EINDEUTIG: task-1, task-2, task-3 ...

═══════════════════════════════════
QUALITÄTS-CHECKLISTE (PFLICHT VOR AUSGABE)
═══════════════════════════════════
Gehe jede Aufgabe explizit durch und beantworte:

[ ] Besteht solution ALLE testCases korrekt?
[ ] Scheitert /\\d/ an meinen Tests? (Falls solution ≠ /\\d/)
[ ] Scheitert /\\w+/ an meinen Tests? (Falls solution ≠ /\\w+/)
[ ] Scheitert /./ an meinen Tests?
[ ] Scheitert /.*/ und /.+/ an meinen Tests?
[ ] Habe ich Grenzfälle drin (zu kurz / zu lang)?
[ ] Habe ich einen "Teilstring-aber-ungültig"-Fall (für Anker-Lösungen)?
[ ] Sind Backslashes mit \\\\d statt \\d kodiert?
[ ] Ist kein g-Flag gesetzt?

Wenn auch nur EIN [ ] mit "nein" beantwortet wird: ÜBERARBEITE die Aufgabe.

═══════════════════════════════════
ANFRAGE
═══════════════════════════════════
Erstelle einen Kurs mit [ANZAHL] Aufgaben zum Thema [THEMA].
Schwierigkeitsniveau: [ANFÄNGER / FORTGESCHRITTEN / EXPERTE]
Sprache der Beschreibungen: [DEUTSCH / ENGLISCH]

Antworte NUR mit dem JSON-Objekt, kein Text davor oder danach.`

export default function TaskLoader({ onCourseLoaded }: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [pendingCourse, setPendingCourse] = useState<Course | null>(null)
  const [pasteInput, setPasteInput] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCourse = (raw: unknown): Course => {
    if (typeof raw !== 'object' || raw === null) throw new Error('Ungültiges JSON-Format')
    const obj = raw as Record<string, unknown>
    if (!obj.course || !Array.isArray(obj.tasks)) {
      throw new Error('JSON muss "course" und "tasks" enthalten')
    }
    return raw as Course
  }

  const loadCourse = (course: Course) => {
    const issues = validateCourse(course)
    if (issues.length > 0) {
      setValidationIssues(issues)
      setPendingCourse(course)
    } else {
      onCourseLoaded(course)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setValidationIssues([])
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        loadCourse(parseCourse(data))
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
    setValidationIssues([])
    try {
      const resp = await fetch(urlInput.trim())
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      loadCourse(parseCourse(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der URL')
    } finally {
      setLoading(false)
    }
  }

  const handleExample = async () => {
    setLoading(true)
    setError(null)
    setValidationIssues([])
    try {
      const resp = await fetch('/example-tasks.json')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      loadCourse(parseCourse(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Beispiels')
    } finally {
      setLoading(false)
    }
  }

  const handlePasteLoad = () => {
    if (!pasteInput.trim()) return
    setError(null)
    setValidationIssues([])
    try {
      const data = JSON.parse(pasteInput.trim())
      loadCourse(parseCourse(data))
      setPasteInput('')
      setShowPaste(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ungültiges JSON')
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

          {/* JSON Paste */}
          <div>
            <button
              onClick={() => setShowPaste((s) => !s)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className={`transition-transform text-xs ${showPaste ? 'rotate-90' : ''}`}>▶</span>
              JSON direkt einfügen
            </button>
            {showPaste && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handlePasteLoad()}
                  placeholder={'{\n  "course": { "title": "..." },\n  "tasks": [...]\n}'}
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono resize-y"
                />
                <button
                  onClick={handlePasteLoad}
                  disabled={!pasteInput.trim()}
                  className="w-full py-2 px-4 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  Laden — Strg+Enter
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-3 text-red-300 text-sm">
              ⚠ {error}
            </div>
          )}

          {/* Validation warnings */}
          {validationIssues.length > 0 && pendingCourse && (
            <div className="bg-yellow-950/60 border border-yellow-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-lg">⚠</span>
                <div>
                  <p className="text-yellow-300 font-semibold text-sm">
                    {validationIssues.length} Problem{validationIssues.length > 1 ? 'e' : ''} gefunden
                  </p>
                  <p className="text-yellow-500 text-xs mt-0.5">
                    Die solution-Regex einiger Aufgaben besteht nicht alle Testfälle.
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {validationIssues.map((issue, i) => (
                  <li key={i} className="text-xs text-yellow-300 bg-yellow-900/30 rounded-lg px-3 py-2">
                    <span className="font-semibold text-yellow-200">{issue.taskTitle}:</span>{' '}
                    <span className="font-mono">{issue.message}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setValidationIssues([]); setPendingCourse(null) }}
                  className="flex-1 py-2 px-3 rounded-lg border border-yellow-700 text-yellow-400 text-sm hover:bg-yellow-900/30 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => { onCourseLoaded(pendingCourse); setValidationIssues([]); setPendingCourse(null) }}
                  className="flex-1 py-2 px-3 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium transition-colors"
                >
                  Trotzdem laden
                </button>
              </div>
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
