/**
 * VISIORA — the whole lab: come in through the door, see every experiment, tap one and the
 * camera glides over to it. Phones and desktops get their own list and camera spots, while
 * the room and the experiments are shared.
 *
 * The chosen experiment lives in the URL (?station=…), so the phone's back button returns
 * to the room, and coming back from an experiment's screen lands where the student left.
 */
import React, { Suspense, useReducer, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useSearchParams } from 'react-router-dom'
import * as THREE from 'three'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { CameraRig, exposeForTests, LabScenery, LAB_CAMERA, LAB_GL, Marker, Opening, TapArea, TowerControls, TowerPanel, TowerViewButtons, useTowerLab } from './TowerPreview'
import { BenchPanelBody, BenchRunner, canRun, createBenchStates, runBench } from './LabBenches'
import { LAB_ENTRANCE, LAB_OVERVIEW, STATIONS, findStation } from './labStations'
import { TOWER_VIEWS } from './towerViews'

// Keep in step with the small-screen rule for .pv-root in physicsLab.css.
const SMALL_SCREEN = '(max-width: 900px), (orientation: portrait)'

// On a phone, a pin for a bench on a side wall would fall off the edge of the screen,
// so it is kept just inside, on the side where the bench is.
const PIN_MARGIN = 26
const onScreen = new THREE.Vector3()
function keepInside(el, camera, size) {
  onScreen.setFromMatrixPosition(el.matrixWorld).project(camera)
  const x = (onScreen.x + 1) * size.width / 2
  const y = (1 - onScreen.y) * size.height / 2
  return [Math.min(size.width - PIN_MARGIN, Math.max(PIN_MARGIN, x)), y]
}

function StationPin({ station, number, small, onOpen }) {
  return (
    <Html position={station.pin} center zIndexRange={[4, 0]} calculatePosition={small ? keepInside : undefined}>
      <button className={`lx-pin ${small ? 'is-small' : ''}`} aria-label={`Go to ${station.name}`} onClick={() => onOpen(station.id)}>
        <span className="lx-num">{number}</span>{!small && station.name}
      </button>
    </Html>
  )
}

function StationCard({ station, number, onOpen }) {
  return (
    <button className="lx-card" onClick={() => onOpen(station.id)}>
      <span className="lx-num">{number}</span>
      <span className="lx-card-text">
        <strong>{station.name}</strong>
        <span>{station.topic} · {station.grade}</span>
      </span>
    </button>
  )
}

// Desktop: a tall list beside the room. Every experiment is in view at once.
function DesktopList({ onOpen, onExit }) {
  return (
    <section className="pv-panel" aria-label="Experiments in the lab">
      <button className="lx-link" onClick={onExit}>← Leave the lab</button>
      <h1 className="pv-title">Physics Lab</h1>
      <p className="pv-lede">Pick an experiment. Tap it in the room or in this list.</p>
      <div className="lx-list">
        {STATIONS.map((s, i) => <StationCard key={s.id} station={s} number={i + 1} onOpen={onOpen} />)}
      </div>
    </section>
  )
}

// Phone: the room stays large, with a row of cards to swipe along under it.
function MobileStrip({ onOpen, onExit }) {
  return (
    <section className="lx-sheet" aria-label="Experiments in the lab">
      <div className="lx-sheet-head">
        <h1 className="pv-title">Physics Lab</h1>
        <button className="lx-link" onClick={onExit}>Leave</button>
      </div>
      <div className="lx-strip">
        {STATIONS.map((s, i) => <StationCard key={s.id} station={s} number={i + 1} onOpen={onOpen} />)}
      </div>
    </section>
  )
}

function StationPanel({ station, state, update, onBack }) {
  return (
    <section className="pv-panel lx-detail" aria-label={station.name}>
      <button className="lx-link" onClick={onBack}>← All experiments</button>
      <p className="pl-label pv-stage-label">{station.grade} · {station.topic}</p>
      <h1 className="pv-title">{station.name}</h1>
      <p className="pv-lede lx-about">{station.about}</p>
      <BenchPanelBody id={station.id} state={state} update={update} />
    </section>
  )
}

export default function LabExplorer({ onExit }) {
  const lab = useTowerLab()
  const small = useMediaQuery(SMALL_SCREEN)
  const device = small ? 'mobile' : 'desktop'
  const benches = useRef(null)
  if (!benches.current) benches.current = createBenchStates()
  const [, refresh] = useReducer(x => x + 1, 0)
  const [params, setParams] = useSearchParams()
  const station = findStation(params.get('station'))
  const atTower = station?.inRoom

  const open = id => { lab.setView('full'); setParams({ station: id }) }
  const back = () => setParams({})
  const benchId = station && !atTower ? station.id : null
  const benchState = benchId && benches.current[benchId]
  const startBench = () => { runBench(benchId, benchState); refresh() }
  const benchReady = benchId && canRun(benchId) && !benchState.running

  const pose = atTower ? TOWER_VIEWS[lab.view] : station ? station[device] : LAB_OVERVIEW[device]

  return (
    <div className="pl-root pv-root">
      <div className="pv-stage">
        <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ ...LAB_CAMERA, position: LAB_ENTRANCE.pos }} gl={LAB_GL} onCreated={exposeForTests}>
          <Suspense fallback={null}>
            <LabScenery lab={lab} />
            <BenchRunner states={benches.current} activeId={benchId} onTick={refresh} />
            {atTower && <TowerControls lab={lab} />}
            {station?.tap && <TapArea position={station.tap.position} size={station.tap.size} label={station.id} onTap={startBench} enabled={benchReady} />}
            {station?.tap && benchReady && <Marker position={station.pin} onClick={startBench}>Start</Marker>}
            {!station && STATIONS.map((s, i) => <StationPin key={s.id} station={s} number={i + 1} small={small} onOpen={open} />)}
          </Suspense>
          <CameraRig pose={pose} start={station ? undefined : LAB_ENTRANCE} />
        </Canvas>
        {!lab.parts && <Opening />}
        {atTower && <TowerViewButtons lab={lab} />}
      </div>

      {atTower && <TowerPanel lab={lab} onBack={back} />}
      {station && !atTower && <StationPanel station={station} state={benchState} update={refresh} onBack={back} />}
      {!station && (small ? <MobileStrip onOpen={open} onExit={onExit} /> : <DesktopList onOpen={open} onExit={onExit} />)}
    </div>
  )
}
