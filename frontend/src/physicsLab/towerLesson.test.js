import { describe, it, expect } from 'vitest'
import { QUIZ, createLesson, firstToLand, lessonReducer, quizScore } from './towerLesson'
import { createTower, release, startPump, stepTower, PUMP_SECONDS } from './freeFallTower'
import { vacuumFallTime } from '../engine/dropTower'

const play = (actions, from = createLesson()) => actions.reduce(lessonReducer, from)
const landed = { ball: 1.33, feather: 1.33 }
const toQuiz = [
  { type: 'predict', choice: 'ball' },
  { type: 'finishRun', ...landed },
  { type: 'predict', choice: 'together' },
  { type: 'finishRun', ...landed },
  { type: 'startQuiz' },
]
const runTower = (t, seconds) => {
  for (let s = 0; s < seconds; s += 1 / 60) stepTower(t, 1 / 60)
  return t
}

describe('free fall lesson', () => {
  it('goes through every stage in order', () => {
    const steps = []
    let l = createLesson()
    for (const a of toQuiz) { l = lessonReducer(l, a); steps.push(l.step) }
    expect(steps).toEqual(['runAir', 'predictVacuum', 'runVacuum', 'explain', 'quiz'])
  })

  it('will not start a run until a prediction is made', () => {
    expect(play([{ type: 'finishRun', ...landed }]).step).toBe('predictAir')
    expect(play([{ type: 'predict', choice: 'nonsense' }]).step).toBe('predictAir')
  })

  it('will not move on until both objects have landed', () => {
    const l = play([{ type: 'predict', choice: 'ball' }, { type: 'finishRun', ball: 1.33, feather: null }])
    expect(l.step).toBe('runAir')
  })

  it('remembers each prediction and result', () => {
    const l = play(toQuiz)
    expect(l.predictions).toEqual({ air: 'ball', vacuum: 'together' })
    expect(l.results.air).toEqual(landed)
  })

  it('gets the winner right from the real tower, in air and in vacuum', () => {
    const air = runTower(release(createTower()), 15)
    expect(firstToLand(air.ball.firstImpact.t, air.feather.firstImpact.t)).toBe('ball')
    const vacuum = runTower(startPump(createTower()), PUMP_SECONDS + 1)
    runTower(release(vacuum), 3)
    expect(firstToLand(vacuum.ball.firstImpact.t, vacuum.feather.firstImpact.t)).toBe('together')
  })

  it('an answer cannot be changed once given, and is needed to move on', () => {
    let l = play(toQuiz)
    expect(lessonReducer(l, { type: 'nextQuestion' }).question).toBe(0)
    l = lessonReducer(l, { type: 'answer', option: 0 })
    l = lessonReducer(l, { type: 'answer', option: 1 })
    expect(l.answers).toEqual([0])
  })

  it('scores the quiz and can start over', () => {
    let l = play(toQuiz)
    QUIZ.forEach((q, i) => {
      l = lessonReducer(l, { type: 'answer', option: i === 0 ? (q.correct + 1) % q.options.length : q.correct })
      l = lessonReducer(l, { type: 'nextQuestion' })
    })
    expect(l.step).toBe('finished')
    expect(quizScore(l)).toBe(QUIZ.length - 1)
    expect(lessonReducer(l, { type: 'restart' })).toEqual(createLesson())
  })

  it('the calculation question is marked with the right answer', () => {
    const q = QUIZ[2]
    expect(q.options[q.correct]).toBe(`${vacuumFallTime(19.6, 9.8)} s`)
  })
})
