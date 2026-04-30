interface Props {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const percent = total > 0 ? ((current) / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 whitespace-nowrap">
        Aufgabe <span className="text-white font-semibold">{current + 1}</span> von <span className="text-white font-semibold">{total}</span>
      </span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden min-w-[80px]">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{Math.round(percent)}%</span>
    </div>
  )
}
