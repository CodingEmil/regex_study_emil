import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Course } from '../types'
import ProgressBar from './ProgressBar'
import RegexInput from './RegexInput'
import TestCasesPanel from './TestCasesPanel'
import HintsPanel from './HintsPanel'

interface Props {
  course: Course
  currentTaskIndex: number
  onNextTask: () => void
  onLoadNew: () => void
}

function buildRegex(pattern: string, flags: string): { regex: RegExp | null; error: string | null } {
  if (!pattern) return { regex: null, error: null }
  try {
    // Sanitize flags: only valid JS regex flags
    const validFlags = flags.replace(/[^gimsuy]/g, '')
    return { regex: new RegExp(pattern, validFlags), error: null }
  } catch (e) {
    return { regex: null, error: e instanceof Error ? e.message : 'Ungültiger Regex' }
  }
}

function countMatches(text: string, regex: RegExp): number {
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
  return (text.match(r) || []).length
}

export default function TaskRunner({ course, currentTaskIndex, onNextTask, onLoadNew }: Props) {
  const task = course.tasks[currentTaskIndex]!
  const [userPattern, setUserPattern] = useState('')
  const [userFlags, setUserFlags] = useState(task.flags ?? '')
  const [taskStartTime, setTaskStartTime] = useState(Date.now())
  const [showExplanation, setShowExplanation] = useState(false)

  // Reset state when task changes
  useEffect(() => {
    setUserPattern('')
    setUserFlags(task.flags ?? '')
    setTaskStartTime(Date.now())
    setShowExplanation(false)
  }, [task, currentTaskIndex])

  const handleRegexChange = useCallback((pattern: string, flags: string) => {
    setUserPattern(pattern)
    setUserFlags(flags)
  }, [])

  const { regex, error } = buildRegex(userPattern, userFlags)
  const isValid = error === null

  // Evaluate test cases
  const testResults = task.testCases.map((tc) => {
    if (!regex || !isValid) return null
    const r = new RegExp(regex.source, regex.flags.replace('g', '').replace('y', ''))
    const matched = r.test(tc.text)
    return matched === tc.shouldMatch
  })
  const allPassing = testResults.length > 0 && testResults.every((r) => r === true)

  // Count total matches across all test texts
  const totalMatchCount = regex && isValid
    ? task.testCases.reduce((sum, tc) => sum + countMatches(tc.text, regex), 0)
    : 0

  // Reveal explanation when all tests pass
  useEffect(() => {
    if (allPassing) setShowExplanation(true)
  }, [allPassing])

  const handleSkip = () => {
    onNextTask()
  }

  const isLastTask = currentTaskIndex + 1 >= course.tasks.length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="font-mono font-bold text-emerald-400 text-lg hidden sm:block">/regex/</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 truncate mb-1">{course.course.title}</div>
            <ProgressBar current={currentTaskIndex} total={course.tasks.length} />
          </div>
          <button
            onClick={onLoadNew}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
          >
            Neuer Kurs
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Task header */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-xl font-bold text-white">{task.title}</h1>
            <span className="text-xs text-gray-600 font-mono flex-shrink-0 mt-1">#{String(task.id)}</span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300">
            <ReactMarkdown>{task.description}</ReactMarkdown>
          </div>
        </div>

        {/* Regex Input */}
        <RegexInput
          value={userPattern}
          flags={userFlags}
          onChange={handleRegexChange}
          isValid={isValid}
          allPassing={allPassing}
          errorMessage={error ?? undefined}
          matchCount={totalMatchCount}
        />

        {/* Test Cases */}
        <TestCasesPanel
          testCases={task.testCases}
          regex={regex}
          isRegexValid={isValid}
        />

        {/* Success banner */}
        {allPassing && (
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-4 flex items-center justify-between">
            <div className="text-emerald-300 font-semibold">
              {isLastTask ? '🎉 Kurs abgeschlossen!' : '✓ Richtig!'}
            </div>
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium text-white transition-colors"
            >
              {isLastTask ? 'Abschließen →' : 'Weiter →'}
            </button>
          </div>
        )}

        {/* Explanation (shown when all pass) */}
        {showExplanation && task.explanation && (
          <div className="bg-blue-950/30 border border-blue-900/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Erklärung</h3>
            <div className="prose prose-invert prose-sm max-w-none text-blue-200">
              <ReactMarkdown>{task.explanation}</ReactMarkdown>
            </div>
            {task.solution && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-blue-400">Musterlösung:</span>
                <code className="text-xs font-mono bg-blue-900/40 px-2 py-1 rounded text-emerald-300">
                  /{task.solution}/{task.flags ?? ''}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Hints */}
        <HintsPanel hints={task.hints} taskStartTime={taskStartTime} />

        {/* Bottom navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <button
            onClick={() => setShowExplanation((s) => !s)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showExplanation ? 'Erklärung verbergen' : 'Erklärung anzeigen'}
          </button>
          <button
            onClick={handleSkip}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {isLastTask ? 'Kurs abschließen →' : 'Aufgabe überspringen →'}
          </button>
        </div>
      </main>
    </div>
  )
}
