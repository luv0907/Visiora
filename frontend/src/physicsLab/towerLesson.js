/**
 * VISIORA — the Free Fall Tower lesson: predict, try it in air, predict, try it in a
 * vacuum, see why, then a short quiz. Only the rules live here, so they can be tested
 * without the 3D scene.
 */

export const PREDICTIONS = [
  { id: 'ball', label: 'The steel ball' },
  { id: 'feather', label: 'The feather' },
  { id: 'together', label: 'They land together' },
]

export const QUIZ = [
  {
    question: 'In a vacuum, the steel ball is swapped for one twice as heavy. When does it land?',
    options: ['In half the time', 'At the same time as before', 'In twice the time'],
    correct: 1,
    why: 'Mass is not in t = √(2h/g), so without air a heavier object takes the same time.',
  },
  {
    question: 'Why does the feather fall so slowly in air?',
    options: ['Gravity does not pull on feathers', 'Air resistance is large compared with its small weight', 'The tube pushes it upward'],
    correct: 1,
    why: 'Gravity still pulls the feather, but its weight is so small that air resistance nearly balances it.',
  },
  {
    question: 'A stone is dropped from 19.6 m. Ignoring air and taking g = 9.8 m/s², how long does it take to land?',
    options: ['1 s', '2 s', '4 s'],
    correct: 1,
    why: 't = √(2h/g) = √(2 × 19.6 ÷ 9.8) = √4 = 2 s.',
  },
]

/** Which object landed first, given the two landing times in seconds. */
export function firstToLand(ballTime, featherTime) {
  if (Math.abs(ballTime - featherTime) < 0.01) return 'together'
  return ballTime < featherTime ? 'ball' : 'feather'
}

export const createLesson = () => ({
  step: 'predictAir', // predictAir → runAir → predictVacuum → runVacuum → explain → quiz → finished → free
  predictions: { air: null, vacuum: null },
  results: { air: null, vacuum: null },
  question: 0,
  answers: [],
})

/** The numbered stage a step belongs to, for the "Step 2 of 4" label. */
export const STAGES = { predictAir: 1, runAir: 1, predictVacuum: 2, runVacuum: 2, explain: 3, quiz: 4, finished: 4 }
export const STAGE_COUNT = 4

export const quizScore = lesson => lesson.answers.filter((a, i) => a === QUIZ[i].correct).length

const validPrediction = choice => PREDICTIONS.some(p => p.id === choice)

export function lessonReducer(lesson, action) {
  switch (action.type) {
    case 'predict':
      if (!validPrediction(action.choice)) return lesson
      if (lesson.step === 'predictAir') return { ...lesson, step: 'runAir', predictions: { ...lesson.predictions, air: action.choice } }
      if (lesson.step === 'predictVacuum') return { ...lesson, step: 'runVacuum', predictions: { ...lesson.predictions, vacuum: action.choice } }
      return lesson
    case 'finishRun': {
      // A run only counts once both objects have landed.
      const { ball, feather } = action
      if (ball == null || feather == null) return lesson
      if (lesson.step === 'runAir') return { ...lesson, step: 'predictVacuum', results: { ...lesson.results, air: { ball, feather } } }
      if (lesson.step === 'runVacuum') return { ...lesson, step: 'explain', results: { ...lesson.results, vacuum: { ball, feather } } }
      return lesson
    }
    case 'startQuiz':
      return lesson.step === 'explain' ? { ...lesson, step: 'quiz' } : lesson
    case 'answer':
      if (lesson.step !== 'quiz' || lesson.answers[lesson.question] !== undefined) return lesson
      return { ...lesson, answers: [...lesson.answers, action.option] }
    case 'nextQuestion':
      if (lesson.step !== 'quiz' || lesson.answers[lesson.question] === undefined) return lesson
      return lesson.question + 1 < QUIZ.length ? { ...lesson, question: lesson.question + 1 } : { ...lesson, step: 'finished' }
    case 'explore':
      return lesson.step === 'finished' ? { ...lesson, step: 'free' } : lesson
    case 'restart':
      return createLesson()
    default:
      return lesson
  }
}
