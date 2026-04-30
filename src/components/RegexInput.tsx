import { useState, useEffect } from 'react'

interface Props {
  value: string
  flags: string
  onChange: (value: string, flags: string) => void
  isValid: boolean
  allPassing: boolean
  errorMessage?: string
  matchCount: number
}

export default function RegexInput({ value, flags, onChange, isValid, allPassing, errorMessage, matchCount }: Props) {
  const [localFlags, setLocalFlags] = useState(flags)

  useEffect(() => {
    setLocalFlags(flags)
  }, [flags])

  const borderColor = !value
    ? 'border-gray-700 focus-within:border-gray-500'
    : !isValid
    ? 'border-red-600 focus-within:border-red-500'
    : allPassing
    ? 'border-emerald-500 focus-within:border-emerald-400'
    : 'border-yellow-600 focus-within:border-yellow-500'

  const handleFlagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFlags = e.target.value.replace(/[^gimsuy]/g, '').slice(0, 6)
    setLocalFlags(newFlags)
    onChange(value, newFlags)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Dein Regulärer Ausdruck
      </label>

      {/* Regex input with slash delimiters */}
      <div className={`flex items-center bg-gray-900 border-2 ${borderColor} rounded-xl overflow-hidden transition-colors`}>
        <span className="pl-4 pr-1 text-gray-500 font-mono text-lg select-none">/</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value, localFlags)}
          placeholder="dein.*regex"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent px-1 py-3 font-mono text-base text-emerald-300 placeholder-gray-700 focus:outline-none"
        />
        <span className="px-1 text-gray-500 font-mono text-lg select-none">/</span>
        <input
          type="text"
          value={localFlags}
          onChange={handleFlagsChange}
          placeholder="gi"
          spellCheck={false}
          className="w-14 bg-transparent pr-4 py-3 font-mono text-base text-purple-400 placeholder-gray-700 focus:outline-none"
        />
      </div>

      {/* Status line */}
      <div className="mt-2 h-5 flex items-center">
        {!value ? (
          <span className="text-xs text-gray-600">Gib einen regulären Ausdruck ein</span>
        ) : !isValid ? (
          <span className="text-xs text-red-400">⚠ Ungültiger Regex: {errorMessage}</span>
        ) : allPassing ? (
          <span className="text-xs text-emerald-400 font-medium">✓ Alle Tests bestanden!</span>
        ) : (
          <span className="text-xs text-yellow-500">
            {matchCount} {matchCount === 1 ? 'Treffer' : 'Treffer'} — nicht alle Tests bestanden
          </span>
        )}
      </div>
    </div>
  )
}
