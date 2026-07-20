import React from 'react'
import {Composition, Still} from 'remotion'
import './kit/fonts' // fetch Newsreader / Geist / Geist Mono before any frame renders
import {MARQUEE, PANEL, PROMO, SHOT, WIDE} from './kit/theme'
import {HeroDemo} from './scenes/HeroDemo'
import {SceneAutocopy} from './scenes/SceneAutocopy'
import {SceneContext} from './scenes/SceneContext'
import {SceneCopy} from './scenes/SceneCopy'
import {SceneDark} from './scenes/SceneDark'
import {SceneOptions} from './scenes/SceneOptions'
import {SceneShortcuts} from './scenes/SceneShortcuts'
import {SceneStorage} from './scenes/SceneStorage'
import {SceneWindows} from './scenes/SceneWindows'
import {StepFormat} from './scenes/StepFormat'
import {StepPaste} from './scenes/StepPaste'
import {Marquee} from './stills/Marquee'
import {Promo} from './stills/Promo'
import {Shot01, Shot02, Shot03, Shot04, Shot05} from './stills/Shots'

// Composition ids are the site's clip basenames (umbrella-docs/components/shot.tsx
// loads /motion/<id>.mp4). Keep durations in lockstep with scripts/render-all.ts.

export const RemotionRoot: React.FC = () => (
  <>
    {/* Wide (16/9) clips — the browser-in-frame scenes */}
    <Composition id="hero-demo" component={HeroDemo} durationInFrames={13 * WIDE.fps} {...WIDE} />
    <Composition id="tour-formats" component={StepFormat} durationInFrames={7 * WIDE.fps} {...WIDE} />
    <Composition id="tour-paste" component={StepPaste} durationInFrames={7 * WIDE.fps} {...WIDE} />
    <Composition id="tour-shortcuts" component={SceneShortcuts} durationInFrames={8 * WIDE.fps} {...WIDE} />
    <Composition id="tour-context" component={SceneContext} durationInFrames={8 * WIDE.fps} {...WIDE} />

    {/* Panel (4/5) clips — the popup / settings scenes */}
    <Composition id="tour-copy" component={SceneCopy} durationInFrames={9 * PANEL.fps} {...PANEL} />
    <Composition id="tour-autocopy" component={SceneAutocopy} durationInFrames={8 * PANEL.fps} {...PANEL} />
    <Composition id="tour-windows" component={SceneWindows} durationInFrames={9 * PANEL.fps} {...PANEL} />
    <Composition id="tour-options" component={SceneOptions} durationInFrames={8 * PANEL.fps} {...PANEL} />
    <Composition id="tour-storage" component={SceneStorage} durationInFrames={9 * PANEL.fps} {...PANEL} />
    <Composition id="tour-dark" component={SceneDark} durationInFrames={8 * PANEL.fps} {...PANEL} />

    {/* Store stills */}
    <Still id="marquee" component={Marquee} width={MARQUEE.width} height={MARQUEE.height} />
    <Still id="promo" component={Promo} width={PROMO.width} height={PROMO.height} />
    <Still id="shot-01-copy" component={Shot01} width={SHOT.width} height={SHOT.height} />
    <Still id="shot-02-formats" component={Shot02} width={SHOT.width} height={SHOT.height} />
    <Still id="shot-03-paste" component={Shot03} width={SHOT.width} height={SHOT.height} />
    <Still id="shot-04-shortcuts" component={Shot04} width={SHOT.width} height={SHOT.height} />
    <Still id="shot-05-settings" component={Shot05} width={SHOT.width} height={SHOT.height} />
  </>
)
