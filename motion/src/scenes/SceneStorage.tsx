import React from 'react'
import {AbsoluteFill} from 'remotion'
import {Stage} from '../kit/Chrome'
import {Cursor} from '../kit/Cursor'
import {useCursor, useTimeline} from '../kit/human'
import {Settings, type StorageState} from '../kit/Settings'

// Storage health: the card pans up to the Storage section, the cursor clicks
// "Check storage health" (statuses appear — local has drifted), then "Repair
// storage" (it resolves to all-green). The reassurance that settings survive.

const LEFT = 150
const TOP = 150

export const SceneStorage: React.FC = () => {
  // The storage state machine, keyed off time.
  const state = useStorage()

  // The storage buttons sit near the bottom of the centred card.
  const CHECK = {x: LEFT + 130, y: TOP + 856}
  const REPAIR = {x: LEFT + 300, y: TOP + 856}

  const cur = useCursor(
    [
      {t: 0, x: 520, y: 500},
      {t: 1.4, x: CHECK.x, y: CHECK.y},
      {t: 4.0, x: REPAIR.x, y: REPAIR.y},
      {t: 7.2, x: REPAIR.x + 20, y: REPAIR.y + 160},
    ],
    [{t: 1.9}, {t: 4.4}],
  )
  const hotCheck = cur.pressed && cur.x < LEFT + 220 && Math.abs(cur.y - CHECK.y) < 40
  const hotRepair = cur.pressed && cur.x > LEFT + 220 && Math.abs(cur.y - REPAIR.y) < 40

  return (
    <Stage aura>
      <AbsoluteFill>
        <div style={{position: 'absolute', left: LEFT, top: TOP}}>
          <Settings storage={state} hot={hotCheck ? 'check' : hotRepair ? 'repair' : undefined} />
        </div>
        <Cursor {...cur} />
      </AbsoluteFill>
    </Stage>
  )
}

// idle → (click) checking → ok → (click) repairing → repaired
function useStorage(): StorageState {
  const v = useTimeline([
    {t: 0, v: 0},
    {t: 1.95, v: 0},
    {t: 2.0, v: 1}, // checking
    {t: 2.9, v: 1},
    {t: 3.0, v: 2}, // ok (local drifted)
    {t: 4.4, v: 2},
    {t: 4.5, v: 3}, // repairing
    {t: 5.5, v: 3},
    {t: 5.6, v: 4}, // repaired
  ])
  const i = Math.round(v)
  return (['idle', 'checking', 'ok', 'repairing', 'repaired'] as StorageState[])[Math.min(4, Math.max(0, i))]
}
