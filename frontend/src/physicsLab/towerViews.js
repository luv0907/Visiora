/** Fixed camera spots around the Free Fall Tower (browser coordinates). */
export const TOWER_X = 18.9
export const TUBE_CENTRE_Y = 5.1
export const PUMP = [18.33, 0.75, 1.3]

export const TOWER_VIEWS = {
  // From one side: a clock and roof beam hang on the tower's centre line and would hide the top of the tubes.
  full: { label: 'Whole tower', pos: [11.5, 4.9, 3.6], look: [TOWER_X, 4.6, 0] },
  top: { label: 'Top', pos: [17.2, 7.9, 1.2], look: [TOWER_X, 9.1, 0] },
  landing: { label: 'Landing', pos: [15.6, 1.7, 0], look: [TOWER_X, 1, 0] },
  pump: { label: 'Pump', pos: [15.8, 1.6, 2.6], look: PUMP },
}
