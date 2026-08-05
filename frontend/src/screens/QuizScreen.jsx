/**
 * VISIORA — QuizScreen
 * Mobile-first quiz with animated correct/wrong feedback.
 * Cream + Teal palette.
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchQuiz, submitAnswer } from '../api/client'
import { useProgressStore } from '../store/useProgressStore'
import { SCENE_META } from '../config/physics'
import { useMediaQuery } from '../hooks/useMediaQuery'
import TutorPanel from '../components/tutor/TutorPanel'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

export default function QuizScreen() {
  const { conceptId } = useParams()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const submitQuizStore = useProgressStore(state => state.submitQuiz)

  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [grading, setGrading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [answerError, setAnswerError] = useState(null)
  const [answers, setAnswers] = useState([])

  const [quizResult, setQuizResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Animation states
  const [answerAnim, setAnswerAnim] = useState(null) // 'correct' | 'wrong'

  const meta = SCENE_META[conceptId]

  useEffect(() => { loadQuiz() }, [conceptId])

  const loadQuiz = async () => {
    setLoading(true); setLoadError(null); setCurrentIndex(0)
    setSelectedIdx(null); setGrading(false); setFeedback(null)
    setAnswerError(null); setAnswers([]); setQuizResult(null)
    setSubmitError(null); setAnswerAnim(null)
    try {
      const data = await fetchQuiz(conceptId)
      setQuestions(data?.questions || [])
    } catch (err) {
      setLoadError(err.message || 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const currentQ = questions?.[currentIndex]

  const handleSelect = async (optIdx) => {
    if (selectedIdx !== null || grading) return
    setSelectedIdx(optIdx)
    setGrading(true)
    setAnswerError(null)
    const newAnswers = [...answers]
    newAnswers[currentIndex] = optIdx
    setAnswers(newAnswers)
    try {
      const result = await submitAnswer(conceptId, currentQ.id, optIdx)
      setFeedback(result)
      setAnswerAnim(optIdx === result.correctIndex ? 'correct' : 'wrong')
    } catch (err) {
      setAnswerError('Could not load feedback. Your answer is saved.')
    } finally {
      setGrading(false)
    }
  }

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
      setSelectedIdx(null); setFeedback(null)
      setAnswerError(null); setAnswerAnim(null)
    } else {
      await finishQuiz([...answers])
    }
  }

  const finishQuiz = async (submittedAnswers) => {
    setSubmitting(true); setSubmitError(null)
    try {
      const result = await submitQuizStore(conceptId, submittedAnswers)
      setQuizResult(result)
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit. Tap Retry.')
    } finally {
      setSubmitting(false)
    }
  }

  const pct = questions ? Math.round(((currentIndex) / questions.length) * 100) : 0

  // ── Option color logic ──
  const getOptionStyle = (optIdx) => {
    let bg = 'var(--color-surface)'
    let border = '1.5px solid var(--color-border)'
    let color = 'var(--color-text)'
    let anim = ''
    let shadow = 'var(--shadow-xs)'

    if (feedback) {
      if (optIdx === feedback.correctIndex) {
        bg = 'var(--color-success-bg)'; border = '2px solid var(--color-success)'; color = 'var(--color-success)'
        if (optIdx === selectedIdx) anim = 'correctFlash 0.6s ease'
      } else if (optIdx === selectedIdx) {
        bg = 'var(--color-error-bg)'; border = '2px solid var(--color-error)'; color = 'var(--color-error)'
        anim = 'shake 0.5s ease'
      }
    } else if (optIdx === selectedIdx) {
      bg = 'var(--navy-50)'; border = '2px solid var(--color-primary)'; shadow = 'var(--shadow-glow)'
    }

    return { bg, border, color, anim, shadow }
  }

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--navy-100)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading quiz…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
        <div style={{ fontSize: 40 }}>😕</div>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>{loadError}</p>
        <button onClick={loadQuiz} style={{ padding: 'var(--space-3) var(--space-8)', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-full)', fontWeight: 'var(--weight-bold)', boxShadow: 'var(--shadow-navy)' }}>
          Try Again
        </button>
      </div>
    )
  }

  // ── RESULT SCREEN ──
  if (quizResult) {
    const score = quizResult.score ?? 0
    const pctScore = Math.round(score * 100)
    const newBadges = quizResult.newBadges || []
    const mastery = quizResult.mastery ?? 0
    const isPassing = pctScore >= 60

    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-6))' }}>
        <div className="card" style={{
          width: '100%', maxWidth: 400, textAlign: 'center',
          animation: 'scaleInBounce 0.6s var(--ease-bounce)',
        }}>
          {/* Trophy */}
          <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', animation: 'float 3s ease-in-out infinite' }}>
            {isPassing ? '🏆' : '💪'}
          </div>

          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-extrabold)', marginBottom: 'var(--space-2)' }}>
            {isPassing ? 'Well Done!' : 'Keep Practicing!'}
          </h1>

          {/* Score ring */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%', margin: 'var(--space-5) auto',
            background: `conic-gradient(var(--color-primary) ${pctScore * 3.6}deg, var(--navy-50) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-navy)',
            position: 'relative',
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'var(--color-surface)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary)', lineHeight: 1 }}>{pctScore}%</span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Score</span>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            Topic Mastery: <strong style={{ color: 'var(--color-primary)' }}>{Math.min(100, Math.max(0, Math.round(mastery)))}%</strong>
          </p>

          {/* New badges */}
          {newBadges.length > 0 && (
            <div style={{ backgroundColor: 'var(--navy-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)', border: '1px solid var(--navy-100)' }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🎉 New Badge{newBadges.length > 1 ? 's' : ''} Unlocked!
              </p>
              {newBadges.map(b => (
                <div key={b} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-primary)' }}>🏆 {b}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              onClick={loadQuiz}
              style={{ padding: 'var(--space-4)', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-full)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-base)', boxShadow: 'var(--shadow-navy)' }}
            >
              Retry Quiz
            </button>
            <button
              onClick={() => navigate('/progress')}
              style={{ padding: 'var(--space-4)', background: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--navy-200)', borderRadius: 'var(--radius-full)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)' }}
            >
              View Progress
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── QUIZ QUESTION ──
  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-4))' }}>
      <div style={isDesktop ? {
        display: 'grid',
        gridTemplateColumns: '240px 1fr 280px',
        gap: 'var(--space-6)',
        maxWidth: 1280,
        margin: '0 auto',
        width: '100%',
        flex: 1,
        padding: 'var(--space-5)',
      } : {
        maxWidth: 1024, width: '100%', margin: '0 auto', padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column'
      }}>
        
        {/* ── Left Rail (Desktop) ── */}
        {isDesktop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 className="section-header">Quiz Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {questions?.map((q, idx) => {
                let color = 'var(--cream-300)'
                if (idx < currentIndex) color = 'var(--color-success)'
                if (idx === currentIndex) color = 'var(--color-primary)'
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: idx === currentIndex ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                    <span style={{ fontWeight: idx === currentIndex ? 'var(--weight-bold)' : 'var(--weight-medium)' }}>
                      Question {idx + 1}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {/* Context/Hints if needed */}
            <div style={{ marginTop: 'auto', padding: 'var(--space-4)', background: 'var(--navy-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--navy-100)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Stuck on a question? You can ask the AI Tutor for a hint without losing your streak.
              </p>
            </div>
          </div>
        )}

        {/* ── Center Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* ── Top Bar ── */}
        <div style={{ paddingTop: 'calc(var(--space-2) + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: 'unset', boxShadow: 'var(--shadow-xs)' }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-muted)' }}>
                {meta?.icon} {meta?.label}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>
                {currentIndex + 1} / {questions?.length}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--navy-50)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((currentIndex) / (questions?.length || 1)) * 100}%`,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary)',
                transition: 'width 0.4s var(--ease-decelerate)',
              }} />
            </div>
          </div>
        </div>

        {/* ── Question Card ── */}
        <div className="card" style={{
          animation: 'slideUp var(--duration-base) var(--ease-spring)',
        }}>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', lineHeight: 1.45, color: 'var(--color-text)' }}>
            {currentQ?.question}
          </p>
        </div>

        {/* ── Options ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1 }}>
          {currentQ?.options?.map((opt, i) => {
            const { bg, border, color, anim, shadow } = getOptionStyle(i)
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selectedIdx !== null || grading}
                style={{
                  width: '100%',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: bg,
                  border,
                  color,
                  textAlign: 'left',
                  fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 'var(--weight-medium)',
                  cursor: selectedIdx !== null ? 'default' : 'pointer',
                  minHeight: 56,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  lineHeight: 1.4,
                  boxShadow: shadow,
                  transition: 'background-color 0.2s, border 0.2s',
                  animation: anim || 'none',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)',
                  background: feedback && i === feedback.correctIndex
                    ? 'var(--color-success)'
                    : feedback && i === selectedIdx
                    ? 'var(--color-error)'
                    : i === selectedIdx
                    ? 'var(--color-primary)'
                    : 'var(--cream-200)',
                  color: (feedback && (i === feedback.correctIndex || i === selectedIdx)) || i === selectedIdx
                    ? 'white'
                    : 'var(--color-text-muted)',
                }}>
                  {feedback
                    ? i === feedback.correctIndex ? '✓' : i === selectedIdx ? '✗' : String.fromCharCode(65 + i)
                    : String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>

        {/* ── Feedback Banner ── */}
        {feedback && (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: answerAnim === 'correct' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            border: `1.5px solid ${answerAnim === 'correct' ? 'var(--color-success)' : 'var(--color-error)'}`,
            animation: 'slideUp var(--duration-base) var(--ease-spring)',
          }}>
            <p style={{ fontWeight: 'var(--weight-bold)', color: answerAnim === 'correct' ? 'var(--color-success)' : 'var(--color-error)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              {answerAnim === 'correct' ? '✓ Correct!' : '✗ Not quite'}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
              {feedback.explanation}
            </p>
          </div>
        )}

        {answerError && (
          <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {answerError}
          </p>
        )}

        {/* ── CTA ── */}
        {(feedback || answerError) && (
          <button
            onClick={handleNext}
            disabled={submitting}
            style={{
              marginTop: 'var(--space-4)',
              width: '100%',
              padding: 'var(--space-4)',
              backgroundColor: submitting ? 'var(--navy-300)' : 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 'var(--text-base)',
              boxShadow: 'var(--shadow-navy)',
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting
              ? 'Submitting…'
              : currentIndex < (questions?.length ?? 0) - 1
              ? 'Next Question →'
              : 'Finish Quiz 🎯'}
          </button>
        )}

        {grading && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse-navy 1s infinite' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Checking…</span>
          </div>
        )}

        {submitError && (
          <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>{submitError}</p>
            <button onClick={() => finishQuiz([...answers])} style={{ color: 'var(--color-primary)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', minHeight: 'unset' }}>
              Retry Submit
            </button>
          </div>
        )}

        </div>

        {/* ── Right Rail (Desktop) ── */}
        {isDesktop && (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '80vh', position: 'sticky', top: 'var(--space-5)' }}>
            <ErrorBoundary section="quiz-tutor" minHeight="150px">
              <TutorPanel />
            </ErrorBoundary>
          </div>
        )}

      </div>
    </div>
  )
}
