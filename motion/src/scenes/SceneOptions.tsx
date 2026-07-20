import React from 'react'
import {AbsoluteFill} from 'remotion'
import {Stage} from '../kit/Chrome'
import {Cursor} from '../kit/Cursor'
import {useAfter, useCursor} from '../kit/human'
import {Settings} from '../kit/Settings'

// The options page: the full settings card, and the cursor flipping two of the
// behaviour toggles — Include all windows, then Dark mode — to show that the
// defaults are all here and all remembered.

const LEFT = 150
const TOP = 150
// Toggle centres (card-relative + offset), measured from the Settings layout.
const T_WINDOWS = {x: 760, y: TOP + 568}
const T_DARK = {x: 760, y: TOP + 644}

export const SceneOptions: React.FC = () => {
  const windowsOn = useAfter(2.0)
  const darkOn = useAfter(4.2)

  const cur = useCursor(
    [
      {t: 0, x: 520, y: 300},
      {t: 1.0, x: T_WINDOWS.x, y: T_WINDOWS.y},
      {t: 3.2, x: T_DARK.x, y: T_DARK.y},
      {t: 6.4, x: T_DARK.x - 40, y: T_DARK.y + 180},
    ],
    [{t: 1.95}, {t: 4.15}],
  )
  const hotWindows = cur.pressed && Math.abs(cur.y - T_WINDOWS.y) < 30
  const hotDark = cur.pressed && Math.abs(cur.y - T_DARK.y) < 30

  return (
    <Stage aura>
      <AbsoluteFill>
        <div style={{position: 'absolute', left: LEFT, top: TOP}}>
          <Settings
            allWindowsOn={windowsOn}
            darkOn={darkOn}
            autoCopyOn
            hot={hotWindows ? 'windows' : hotDark ? 'dark' : undefined}
          />
        </div>
        <Cursor {...cur} />
      </AbsoluteFill>
    </Stage>
  )
}
