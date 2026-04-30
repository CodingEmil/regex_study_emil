import type { Course } from '../types'

interface Props {
  course: Course
  onRestart: () => void
  onLoadNew: () => void
}

export default function CourseComplete({ course, onRestart, onLoadNew }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-2">Kurs abgeschlossen!</h1>
        <p className="text-gray-400 mb-2">
          Du hast alle <span className="text-white font-semibold">{course.tasks.length} Aufgaben</span> des Kurses
        </p>
        <p className="text-emerald-400 font-semibold text-lg mb-8">
          „{course.course.title}"
        </p>
        <p className="text-gray-500 mb-8">
          abgeschlossen. Super gemacht!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-white transition-colors"
          >
            ↩ Nochmal von vorne
          </button>
          <button
            onClick={onLoadNew}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-200 transition-colors"
          >
            Neuen Kurs laden
          </button>
        </div>
      </div>
    </div>
  )
}
