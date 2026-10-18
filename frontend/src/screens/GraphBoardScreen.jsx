/**
 * VISIORA — Graph Board
 * Students type any formula and see it plotted exactly on a clean x/y plane,
 * with a slider for every other letter. A second tab gives draggable 2D vectors
 * with components and resultants. All values are computed, never estimated.
 *
 * Deep links: /board?f=s%3Du*t%2B1%2F2*a*t%5E2&f=...&deg=0
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ZoomIn, ZoomOut, Scan, House, LineChart, MoveUpRight } from 'lucide-react'
import BoardCanvas from '../components/board/BoardCanvas'
import { visibleRange, zoomAt } from '../components/board/view'
import { FormulaRow, ParamSlider, KeyPointList, VectorCard, Toggle, AddButton } from '../components/board/BoardPanels'
import { parseFormula, paramDefaults, findKeyPoints, formatNumber, displayName } from '../engine/formula'
import { magnitude, angleDeg, add, dot, angleBetween } from '../engine/vectors'
import '../components/board/board.css'

const COLORS = ['#1251B8', '#E11D48', '#059669', '#D97706', '#4F46E5', '#0D9488']
const MAX_FORMULAS = 6
const MAX_VECTORS = 4

const EXAMPLES = [
  { label: 'Straight line', text: 'y = 2x + 3', x: [-10, 10] },
  { label: 'Distance–time', text: 's = u*t + 1/2*a*t^2', x: [0, 10] },
  { label: 'Velocity–time', text: 'v = u + a*t', x: [0, 10] },
  { label: 'Free fall', text: 'h(t) = H - 1/2*g*t^2', x: [0, 3] },
  { label: 'Projectile path', text: 'y = x*tan(θ) - g*x^2/(2*u^2*cos(θ)^2)', x: [0, 45], degrees: true, params: { u: 20, theta: 45 } },
  { label: "Ohm's law", text: 'I = V/R', x: [0, 24] },
  { label: 'Hooke’s law', text: 'F = k*x', x: [0, 10] },
  { label: 'Wave', text: 'y = A*sin(360*f*t + φ)', x: [0, 2], degrees: true },
  { label: 'Parabola', text: 'y = x^2', x: [-5, 5] },
  { label: 'Inverse', text: 'y = 1/x', x: [-5, 5] },
]

let uid = 0
const newId = p => `${p}${++uid}`

function initialFormulas(searchParams) {
  const fromUrl = searchParams.getAll('f').filter(Boolean).slice(0, MAX_FORMULAS)
  const texts = fromUrl.length ? fromUrl : ['y = 2x + 3']
  return texts.map((text, i) => ({ id: newId('f'), text, color: COLORS[i % COLORS.length], visible: true, indep: null }))
}

const INITIAL_VECTORS = [
  { id: 'A', label: 'A', color: COLORS[0], x: 3, y: 4, ox: 0, oy: 0 },
  { id: 'B', label: 'B', color: COLORS[1], x: 4, y: -1, ox: 0, oy: 0 },
]

/** Fit the y-axis to a curve over [x0, x1], ignoring spikes near asymptotes. */
function fitView(fn, x0, x1, size) {
  const ys = []
  for (let i = 0; i <= 400; i++) {
    const y = fn(x0 + ((x1 - x0) * i) / 400)
    if (Number.isFinite(y)) ys.push(y)
  }
  const w = size.w || 600
  const h = size.h || 400
  const sx = w / ((x1 - x0) * 1.1)
  if (!ys.length) return { cx: (x0 + x1) / 2, cy: 0, sx, sy: sx }
  ys.sort((a, b) => a - b)
  let lo = Math.min(0, ys[Math.floor(ys.length * 0.02)])
  let hi = Math.max(0, ys[Math.ceil(ys.length * 0.98) - 1])
  if (hi - lo < 1e-9) { lo -= 1; hi += 1 }
  const sy = h / ((hi - lo) * 1.25)
  return { cx: (x0 + x1) / 2, cy: (lo + hi) / 2, sx, sy }
}

export default function GraphBoardScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState('graph')
  const [formulas, setFormulas] = useState(() => initialFormulas(searchParams))
  const [activeId, setActiveId] = useState(() => formulas[0].id)
  const [paramCfg, setParamCfg] = useState({})
  const [degrees, setDegrees] = useState(() => searchParams.get('deg') !== '0')
  const [playing, setPlaying] = useState(null)
  const [trace, setTrace] = useState(null)

  const [vectors, setVectors] = useState(INITIAL_VECTORS)
  const [showComponents, setShowComponents] = useState(true)
  const [showResultant, setShowResultant] = useState(false)
  const [snap, setSnap] = useState(true)

  const [view, setView] = useState({ cx: 0, cy: 0, sx: 40, sy: 40 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sizeRef = useRef(size)
  sizeRef.current = size

  // ── Formulas → functions ─────────────────────────────────────
  const parsedList = useMemo(
    () => formulas.map(f => ({ formula: f, parsed: parseFormula(f.text, f.indep) })),
    [formulas]
  )

  const paramNames = useMemo(() => {
    const names = []
    for (const { formula, parsed } of parsedList) {
      if (!formula.visible || !parsed.ok) continue
      for (const p of parsed.params) if (!names.includes(p)) names.push(p)
    }
    return names
  }, [parsedList])

  const getParam = useCallback(name => paramCfg[name] || paramDefaults(name), [paramCfg])
  const values = useMemo(() => Object.fromEntries(paramNames.map(n => [n, getParam(n).value])), [paramNames, getParam])

  const curves = useMemo(() => parsedList.map(({ formula, parsed }) => ({
    id: formula.id,
    color: formula.color,
    visible: formula.visible,
    fn: parsed.ok ? x => parsed.evaluate(x, values, { degrees }) : null,
  })), [parsedList, values, degrees])

  const active = parsedList.find(p => p.formula.id === activeId) || parsedList[0]
  const activeCurve = curves.find(c => c.id === active.formula.id)
  const xName = displayName(active.parsed.ok ? active.parsed.independent : 'x')
  const yName = displayName(active.parsed.ok ? active.parsed.output.replace(/\(.*\)/, '') : 'y')

  const keyPoints = useMemo(() => {
    if (tab !== 'graph' || !size.w || !activeCurve?.fn || !activeCurve.visible) return []
    const r = visibleRange(view, size)
    return findKeyPoints(activeCurve.fn, r.x0, r.x1, 600, r.y1 - r.y0)
      .filter(p => p.y >= r.y0 && p.y <= r.y1)
      .slice(0, 10)
  }, [tab, view, size, activeCurve])

  // ── Parameter animation (sweeps min → max → min every 4 s) ───
  useEffect(() => {
    if (!playing) return
    let raf
    let last = performance.now()
    let dir = 1
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      setParamCfg(prev => {
        const cfg = prev[playing] || paramDefaults(playing)
        const span = cfg.max - cfg.min
        let v = cfg.value + dir * (span / 2) * dt
        if (v >= cfg.max) { v = cfg.max; dir = -1 }
        if (v <= cfg.min) { v = cfg.min; dir = 1 }
        return { ...prev, [playing]: { ...cfg, value: v } }
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(() => {
    if (playing && !paramNames.includes(playing)) setPlaying(null)
  }, [playing, paramNames])

  // ── Actions ──────────────────────────────────────────────────
  const updateFormula = (id, patch) => setFormulas(fs => fs.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const fitActive = useCallback(() => {
    if (!activeCurve?.fn) return
    const r = visibleRange(view, sizeRef.current)
    setView(fitView(activeCurve.fn, r.x0, r.x1, sizeRef.current))
  }, [activeCurve, view])

  const resetView = () => {
    if (tab === 'vectors') return fitVectors()
    setView({ cx: 0, cy: 0, sx: 40, sy: 40 })
  }

  const zoom = k => setView(v => zoomAt(v, [sizeRef.current.w / 2, sizeRef.current.h / 2], k, sizeRef.current))

  const applyExample = ex => {
    const target = active.formula.id
    updateFormula(target, { text: ex.text, indep: null, visible: true })
    if (ex.degrees != null) setDegrees(ex.degrees)
    if (ex.params) {
      setParamCfg(prev => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(ex.params)) next[k] = { ...paramDefaults(k), ...prev[k], value: v }
        return next
      })
    }
    const parsed = parseFormula(ex.text)
    if (!parsed.ok) return
    const vals = {}
    for (const p of parsed.params) vals[p] = ex.params?.[p] ?? getParam(p).value
    const deg = ex.degrees ?? degrees
    setView(fitView(x => parsed.evaluate(x, vals, { degrees: deg }), ex.x[0], ex.x[1], sizeRef.current))
    setTrace(null)
  }

  const addFormula = () => {
    if (formulas.length >= MAX_FORMULAS) return
    const used = new Set(formulas.map(f => f.color))
    const f = { id: newId('f'), text: '', color: COLORS.find(c => !used.has(c)) || COLORS[0], visible: true, indep: null }
    setFormulas(fs => [...fs, f])
    setActiveId(f.id)
  }

  const removeFormula = id => {
    setFormulas(fs => {
      const next = fs.filter(f => f.id !== id)
      if (id === activeId && next.length) setActiveId(next[0].id)
      return next
    })
  }

  const updateVector = useCallback((id, patch) => {
    setVectors(vs => vs.map(v => (v.id === id ? { ...v, ...patch } : v)))
  }, [])

  const addVector = () => {
    if (vectors.length >= MAX_VECTORS) return
    const labels = ['A', 'B', 'C', 'D', 'E', 'F']
    const label = labels.find(l => !vectors.some(v => v.label === l))
    const used = new Set(vectors.map(v => v.color))
    setVectors(vs => [...vs, { id: label, label, color: COLORS.find(c => !used.has(c)), x: -2, y: 3, ox: 0, oy: 0 }])
  }

  const fitVectors = useCallback(() => {
    const pts = [[0, 0]]
    let rx = vectors[0]?.ox ?? 0
    let ry = vectors[0]?.oy ?? 0
    for (const v of vectors) {
      pts.push([v.ox, v.oy], [v.ox + v.x, v.oy + v.y])
      rx += v.x
      ry += v.y
    }
    pts.push([rx, ry])
    const xs = pts.map(p => p[0])
    const ys = pts.map(p => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const { w, h } = sizeRef.current
    const s = Math.min((w || 600) / ((x1 - x0 || 1) * 1.5), (h || 400) / ((y1 - y0 || 1) * 1.5))
    setView({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sx: s, sy: s })
  }, [vectors])

  const switchTab = t => {
    setTab(t)
    setTrace(null)
    if (t === 'vectors') fitVectors()
  }

  const onResize = useCallback(s => setSize(s), [])

  const resultant = vectors.reduce((acc, v) => add(acc, v), { x: 0, y: 0 })
  const isGraph = tab === 'graph'

  return (
    <div className="gb-root">
      <section className="gb-stage">
        <BoardCanvas
          view={view}
          onViewChange={setView}
          onResize={onResize}
          curves={isGraph ? curves : []}
          activeCurveId={active.formula.id}
          keyPoints={keyPoints}
          xLabel={isGraph ? xName : 'x'}
          yLabel={isGraph ? yName : 'y'}
          vectors={isGraph ? [] : vectors}
          showComponents={showComponents}
          showResultant={showResultant}
          snap={snap}
          onVectorChange={updateVector}
          trace={isGraph ? trace : null}
          onTrace={setTrace}
        />
        <button className="gb-back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="gb-zoom" role="toolbar" aria-label="View controls">
          <button onClick={() => zoom(1.4)} aria-label="Zoom in" title="Zoom in"><ZoomIn size={17} strokeWidth={2.4} /></button>
          <button onClick={() => zoom(1 / 1.4)} aria-label="Zoom out" title="Zoom out"><ZoomOut size={17} strokeWidth={2.4} /></button>
          {isGraph && <button onClick={fitActive} aria-label="Fit graph" title="Fit graph to screen"><Scan size={17} strokeWidth={2.4} /></button>}
          <button onClick={resetView} aria-label="Reset view" title="Reset view"><House size={17} strokeWidth={2.4} /></button>
        </div>
        <p className="gb-hint">
          {isGraph ? 'Drag to move · scroll or pinch to zoom · tap to read a value' : 'Drag an arrow tip to change it · drag the tail dot to move it'}
        </p>
      </section>

      <aside className="gb-panel">
        <header className="gb-head">
          <div>
            <h1>Graph Board</h1>
            <p>Type a formula. Move the sliders. Watch it change.</p>
          </div>
          <div className="gb-tabs" role="tablist">
            <button role="tab" aria-selected={isGraph} className={isGraph ? 'is-on' : ''} onClick={() => switchTab('graph')}>
              <LineChart size={15} strokeWidth={2.5} /> Graph
            </button>
            <button role="tab" aria-selected={!isGraph} className={!isGraph ? 'is-on' : ''} onClick={() => switchTab('vectors')}>
              <MoveUpRight size={15} strokeWidth={2.5} /> Vectors
            </button>
          </div>
        </header>

        <div className="gb-scroll">
          {isGraph ? (
            <>
              <section className="gb-section">
                {parsedList.map(({ formula, parsed }) => (
                  <FormulaRow
                    key={formula.id}
                    formula={formula}
                    parsed={parsed}
                    active={formula.id === active.formula.id}
                    canRemove={formulas.length > 1}
                    onSelect={() => setActiveId(formula.id)}
                    onChange={text => updateFormula(formula.id, { text })}
                    onToggle={() => updateFormula(formula.id, { visible: !formula.visible })}
                    onRemove={() => removeFormula(formula.id)}
                    onIndep={indep => updateFormula(formula.id, { indep })}
                    onSubmit={fitActive}
                  />
                ))}
                <div className="gb-row">
                  <AddButton onClick={addFormula} disabled={formulas.length >= MAX_FORMULAS}>Add formula</AddButton>
                  <div className="gb-seg" role="radiogroup" aria-label="Angle unit">
                    <button role="radio" aria-checked={degrees} className={degrees ? 'is-on' : ''} onClick={() => setDegrees(true)}>Degrees</button>
                    <button role="radio" aria-checked={!degrees} className={!degrees ? 'is-on' : ''} onClick={() => setDegrees(false)}>Radians</button>
                  </div>
                </div>
              </section>

              {paramNames.length > 0 && (
                <section className="gb-section">
                  <h2>Change the numbers</h2>
                  {paramNames.map(name => (
                    <ParamSlider
                      key={name}
                      name={name}
                      cfg={getParam(name)}
                      playing={playing === name}
                      onTogglePlay={() => setPlaying(p => (p === name ? null : name))}
                      onChange={patch => setParamCfg(prev => ({ ...prev, [name]: { ...getParam(name), ...prev[name], ...patch } }))}
                    />
                  ))}
                </section>
              )}

              {active.parsed.ok && active.formula.visible && (
                <section className="gb-section">
                  <h2>Key points <span className="gb-badge">exact</span></h2>
                  <KeyPointList points={keyPoints} xName={xName} yName={yName} />
                  {trace != null && activeCurve?.fn && (
                    <p className="gb-trace">
                      At {xName} = <b>{formatNumber(trace, 4)}</b>, {yName} = <b>{formatNumber(activeCurve.fn(trace), 4)}</b>
                    </p>
                  )}
                </section>
              )}

              <section className="gb-section">
                <h2>Try one</h2>
                <div className="gb-chips">
                  {EXAMPLES.map(ex => (
                    <button key={ex.label} className="gb-chip" onClick={() => applyExample(ex)} title={ex.text}>{ex.label}</button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="gb-section">
                {vectors.map(vec => (
                  <VectorCard
                    key={vec.id}
                    vec={vec}
                    canRemove={vectors.length > 1}
                    onChange={patch => updateVector(vec.id, patch)}
                    onRemove={() => setVectors(vs => vs.filter(v => v.id !== vec.id))}
                  />
                ))}
                <AddButton onClick={addVector} disabled={vectors.length >= MAX_VECTORS}>Add vector</AddButton>
              </section>

              <section className="gb-section">
                <Toggle checked={showComponents} onChange={setShowComponents}>Show x and y parts</Toggle>
                <Toggle checked={showResultant} onChange={setShowResultant}>Add them (resultant)</Toggle>
                <Toggle checked={snap} onChange={setSnap}>Snap to grid</Toggle>
              </section>

              {vectors.length >= 2 && (
                <section className="gb-section">
                  <h2>Result <span className="gb-badge">exact</span></h2>
                  <dl className="gb-facts">
                    <dt>{vectors.map(v => v.label).join(' + ')}</dt>
                    <dd>({formatNumber(resultant.x, 3)}, {formatNumber(resultant.y, 3)})</dd>
                    <dt>Size |R|</dt>
                    <dd>{formatNumber(magnitude(resultant), 4)}</dd>
                    <dt>Direction</dt>
                    <dd>{formatNumber(angleDeg(resultant), 2)}°</dd>
                    {vectors.length === 2 && (
                      <>
                        <dt>Angle between</dt>
                        <dd>{formatNumber(angleBetween(vectors[0], vectors[1]), 2)}°</dd>
                        <dt>{vectors[0].label} · {vectors[1].label}</dt>
                        <dd>{formatNumber(dot(vectors[0], vectors[1]), 4)}</dd>
                      </>
                    )}
                  </dl>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
