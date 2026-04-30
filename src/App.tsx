import { useState, useCallback } from 'react'
import type { Course } from './types'
import TaskLoader from './components/TaskLoader'
import TaskRunner from './components/TaskRunner'
import CourseComplete from './components/CourseComplete'

type Screen = 'loader' | 'task' | 'complete'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loader')
  const [course, setCourse] = useState<Course | null>(null)
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)

  const handleCourseLoaded = useCallback((loadedCourse: Course) => {
    setCourse(loadedCourse)
    setCurrentTaskIndex(0)
    setScreen('task')
  }, [])

  const handleNextTask = useCallback(() => {
    if (!course) return
    if (currentTaskIndex + 1 >= course.tasks.length) {
      setScreen('complete')
    } else {
      setCurrentTaskIndex((i) => i + 1)
    }
  }, [course, currentTaskIndex])

  const handleRestart = useCallback(() => {
    setCurrentTaskIndex(0)
    setScreen('task')
  }, [])

  const handleLoadNew = useCallback(() => {
    setCourse(null)
    setCurrentTaskIndex(0)
    setScreen('loader')
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {screen === 'loader' && (
        <TaskLoader onCourseLoaded={handleCourseLoaded} />
      )}
      {screen === 'task' && course && (
        <TaskRunner
          course={course}
          currentTaskIndex={currentTaskIndex}
          onNextTask={handleNextTask}
          onLoadNew={handleLoadNew}
        />
      )}
      {screen === 'complete' && course && (
        <CourseComplete
          course={course}
          onRestart={handleRestart}
          onLoadNew={handleLoadNew}
        />
      )}
    </div>
  )
}
