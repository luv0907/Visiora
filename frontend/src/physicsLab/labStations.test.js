import { describe, it, expect } from 'vitest'
import { LAB_ENTRANCE, LAB_OVERVIEW, STATIONS, findStation } from './labStations'
import { TOWER_VIEWS } from './towerViews'
import { BENCHES } from './LabBenches'

const CEILING = 7.7

const insideRoom = ([x, y, z]) => {
  const hall = x > -15 && x < 15 && Math.abs(z) < 8
  const bay = x >= 15 && x < 22.5 && Math.abs(z) < 3.5
  return (hall || bay) && y > 0 && (bay || y < CEILING)
}

const poses = [
  ['entrance', LAB_ENTRANCE],
  ['overview desktop', LAB_OVERVIEW.desktop],
  ['overview mobile', LAB_OVERVIEW.mobile],
  ...Object.entries(TOWER_VIEWS).map(([k, v]) => [`tower ${k}`, v]),
  ...STATIONS.filter(s => !s.inRoom).flatMap(s => [[`${s.id} desktop`, s.desktop], [`${s.id} mobile`, s.mobile]]),
]

describe('lab stations', () => {
  it('lists all seven experiments in the room, each once', () => {
    expect(STATIONS).toHaveLength(7)
    expect(new Set(STATIONS.map(s => s.id)).size).toBe(7)
  })

  it.each(poses)('%s: the camera stands inside the room', (_, pose) => {
    expect(insideRoom(pose.pos)).toBe(true)
  })

  it('every station except the tower has a bench that runs in the room', () => {
    for (const s of STATIONS.filter(st => !st.inRoom)) expect(BENCHES[s.id]).toBeTruthy()
    expect(Object.keys(BENCHES)).toHaveLength(6)
  })

  it('finds a station by id, and returns nothing for an unknown one', () => {
    expect(findStation('freefall').inRoom).toBe(true)
    expect(findStation('nope')).toBeNull()
  })
})
