import type { TestCase } from '../types'

interface MatchSegment {
  text: string
  isMatch: boolean
}

function highlightMatches(text: string, regex: RegExp | null): MatchSegment[] {
  if (!regex) return [{ text, isMatch: false }]

  const segments: MatchSegment[] = []
  let lastIndex = 0

  // Reset lastIndex for global regexes
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')

  let match: RegExpExecArray | null
  while ((match = r.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isMatch: false })
    }
    segments.push({ text: match[0] || '', isMatch: true })
    lastIndex = r.lastIndex
    if (match[0] === '') {
      r.lastIndex++
    }
    if (lastIndex > text.length) break
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false })
  }
  return segments
}

interface Props {
  testCases: TestCase[]
  regex: RegExp | null
  isRegexValid: boolean
}

function getTestResult(testCase: TestCase, regex: RegExp | null): boolean | null {
  if (!regex) return null
  // Use a fresh regex without sticky to test match existence
  const r = new RegExp(regex.source, regex.flags.replace('g', '').replace('y', ''))
  const matched = r.test(testCase.text)
  return matched === testCase.shouldMatch
}

export default function TestCasesPanel({ testCases, regex, isRegexValid }: Props) {
  const results = testCases.map((tc) => getTestResult(tc, isRegexValid ? regex : null))
  const allPassing = results.every((r) => r === true)
  const anyTested = results.some((r) => r !== null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-300">Testfälle</label>
        {anyTested && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            allPassing
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
              : 'bg-yellow-900/40 text-yellow-400 border border-yellow-800'
          }`}>
            {results.filter((r) => r === true).length}/{testCases.length} bestanden
          </span>
        )}
      </div>

      {allPassing && anyTested && (
        <div className="mb-3 p-3 bg-emerald-900/30 border border-emerald-700 rounded-xl text-emerald-300 text-sm font-medium text-center">
          ✓ Alle Tests bestanden!
        </div>
      )}

      <div className="space-y-2">
        {testCases.map((tc, i) => {
          const result = results[i]
          const segments = isRegexValid && regex ? highlightMatches(tc.text, regex) : null
          const hasMatch = segments?.some((s) => s.isMatch)

          let rowBg = 'bg-gray-900 border-gray-800'
          let icon = '○'
          let iconColor = 'text-gray-600'
          if (result === true) {
            rowBg = 'bg-emerald-950/40 border-emerald-900'
            icon = '✓'
            iconColor = 'text-emerald-400'
          } else if (result === false) {
            rowBg = 'bg-red-950/40 border-red-900'
            icon = '✗'
            iconColor = 'text-red-400'
          }

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${rowBg} transition-colors`}
            >
              {/* Pass/fail icon */}
              <span className={`font-mono font-bold text-sm flex-shrink-0 ${iconColor}`}>{icon}</span>

              {/* Text with highlighted matches */}
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm break-all">
                  {segments
                    ? segments.map((seg, j) =>
                        seg.isMatch ? (
                          <mark key={j} className="bg-emerald-500/30 text-emerald-300 rounded px-0.5">
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={j} className="text-gray-300">{seg.text}</span>
                        )
                      )
                    : <span className="text-gray-300">{tc.text}</span>
                  }
                </span>
                {tc.description && (
                  <span className="text-xs text-gray-600 ml-2">{tc.description}</span>
                )}
              </div>

              {/* Should match badge */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {isRegexValid && regex && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    hasMatch ? 'bg-emerald-900/60 text-emerald-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {hasMatch ? 'match' : 'kein match'}
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  tc.shouldMatch
                    ? 'bg-blue-900/40 text-blue-400 border border-blue-900'
                    : 'bg-gray-800/60 text-gray-500 border border-gray-700'
                }`}>
                  {tc.shouldMatch ? 'soll matchen' : 'kein match'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
