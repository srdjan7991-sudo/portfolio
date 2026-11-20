import { useRef } from 'react'
import type { CSSProperties } from 'react'
import limestone from '../../assets/hero-limestone-480.webp'
import { defaultSectionOrder, isSectionKey } from '../../sections'
import { useLanguage } from '../../i18n/language'
import type { Language } from '../../i18n/language'
import { en } from '../../i18n/en'
import { sr } from '../../i18n/sr'
import type { RequestResult } from './requestFlowApi'
import { CircuitChannel } from './RequestFlowCircuit'
import type { Channel, CircuitFrame } from './RequestFlowCircuit'
import { RequestFlowConnections } from './RequestFlowConnections'
import styles from './RequestFlowDiagram.module.css'

function SceneLabel(labels: Record<Language, string>) {
  const { language } = useLanguage()
  return <span className={styles.sceneLabel} data-en={labels.en} data-sr={labels.sr}><span>{labels[language]}</span></span>
}

function ScreenSurface({ loading }: { loading: boolean }) {
  return (
    <div className={styles.preview} aria-hidden="true" data-screen-preview>
      <div className={styles.previewBar}>
        <b>Srdjan Pajic</b>
        <span /><span />
      </div>
      <div className={styles.previewHero}>
        <div>
          <strong><SceneLabel en={en.hero.first} sr={sr.hero.first} /></strong>
          <em><SceneLabel en={en.hero.second} sr={sr.hero.second} /></em>
          <span />
        </div>
        <img src={limestone} alt="" width="480" height="640" decoding="async" />
      </div>
      {loading && <div className={styles.screenScan} />}
    </div>
  )
}

const processSignal = (start: number, end: number) => [{ phase: 2, start, end }]

const serverChannels: readonly Channel[] = [
  {
    name: 'server-inlet', path: 'M0 92H31',
    outbound: [{ phase: 1, start: 0.84, end: 1 }], returning: [{ phase: 5, start: 0.16, end: 0.22 }],
  },
  {
    name: 'inlet-branch', path: 'M31 92H67L81 79H85',
    outbound: processSignal(0, 0.22), returning: [{ phase: 5, start: 0, end: 0.16 }],
  },
  { name: 'inlet-fork', path: 'M81 79L64 66H31', outbound: processSignal(0.17, 0.36) },
  {
    name: 'upper-ring', path: 'M85 79A45 45 0 0 1 175 79',
    outbound: processSignal(0.22, 0.54), returning: [{ phase: 4, start: 0.76, end: 0.97 }],
  },
  {
    name: 'lower-ring', path: 'M85 79A45 45 0 0 0 175 79',
    outbound: processSignal(0.22, 0.54), returning: [{ phase: 4, start: 0.76, end: 0.97 }],
  },
  { name: 'top-tie', path: 'M130 34V21', outbound: processSignal(0.37, 0.52) },
  { name: 'bottom-tie', path: 'M130 124V137', outbound: processSignal(0.37, 0.52) },
  { name: 'upper-outlet', path: 'M175 79H179L196 66H229V79', outbound: processSignal(0.54, 0.7) },
  {
    name: 'lower-outlet', path: 'M175 79H179L193 92H229V79',
    outbound: processSignal(0.56, 0.7), returning: [{ phase: 4, start: 0.63, end: 0.76 }],
  },
  {
    name: 'server-outlet', path: 'M229 79H260',
    outbound: [{ phase: 3, start: 0, end: 0.1 }], returning: [{ phase: 4, start: 0.55, end: 0.63 }],
  },
  { name: 'inlet-marks', path: 'M54 52H67M54 57H63', outbound: processSignal(0.3, 0.46) },
  { name: 'ring-marks', path: 'M98 123H112M148 35H162', outbound: processSignal(0.44, 0.57) },
  { name: 'outlet-marks', path: 'M193 102H206M197 107H206', outbound: processSignal(0.6, 0.7) },
]

function ServerCore({ frame }: { frame: CircuitFrame }) {
  return (
    <svg className={styles.core} viewBox="0 0 260 171" fill="none" aria-hidden="true">
      <ellipse className={styles.coreShadow} cx="130" cy="153" rx="92" ry="12" />
      <path className={styles.coreHeel} d="M56 29H204L229 54V120L204 145H56L31 120V54Z" />
      <path className={styles.corePlate} d="M56 21H204L229 46V112L204 137H56L31 112V46Z" />
      <path className={styles.coreEdge} d="M62 29H198L220 51V107L198 129H62L40 107V51Z" />
      <circle className={styles.coreRing} cx="130" cy="79" r="45" />
      <circle className={styles.coreDial} cx="130" cy="79" r="34" />
      {serverChannels.map(channel => {
        const edge = channel.name === 'server-inlet' || channel.name === 'server-outlet'
        const ring = channel.name === 'upper-ring' || channel.name === 'lower-ring'
        return (
          <g key={channel.name} data-dock={edge ? channel.name : undefined}>
            <CircuitChannel channel={channel} frame={frame}
              className={edge ? styles.dock : ring ? styles.ringChannel : styles.coreTrace} />
          </g>
        )
      })}
      <path key={frame.revision} className={styles.coreRotor}
        d="M103 64 A31 31 0 0 1 144 52 M157 94 A31 31 0 0 1 116 106" />
      <path className={styles.coreChip} d="M119 64H141L148 71V87L141 94H119L112 87V71Z" />
      <path className={styles.coreSymbol} d="M127 74 122 79 127 84 M133 74 138 79 133 84" />
      <g className={styles.coreDiodes}>
        <circle cx="64" cy="66" r="3" />
        <circle cx="130" cy="43" r="3" />
        <circle cx="196" cy="66" r="3" />
      </g>
    </svg>
  )
}

const databaseArrival = 0.75
const databaseInlet: Channel = {
  name: 'database-inlet',
  path: 'M0 106H7C18 106 25 93 44 93',
  outbound: [{ phase: 3, start: 0.65, end: databaseArrival }], returning: [{ phase: 4, start: 0, end: 0.1 }],
}

const databaseRightInlet: Channel = {
  ...databaseInlet,
  path: 'M238 106H231C220 106 213 93 194 93',
}

const databaseLayers = [
  { name: 'lower', y: 94 },
  { name: 'middle', y: 64 },
  { name: 'upper', y: 34 },
]

function DataStack({ frame }: { frame: CircuitFrame }) {
  return (
    <svg className={styles.dataArt} viewBox="0 0 238 170" fill="none" aria-hidden="true">
      <ellipse className={styles.coreShadow} cx="119" cy="150" rx="85" ry="13" />
      <g data-dock="database-left" className={styles.databaseLeftDock}>
        <CircuitChannel channel={databaseInlet} frame={frame} className={styles.dock} />
      </g>
      <g data-dock="database-right" className={styles.databaseRightDock}>
        <CircuitChannel channel={databaseRightInlet} frame={frame} className={styles.dock} />
      </g>
      {databaseLayers.map(({ name, y }) => (
        <g key={name} transform={'translate(0 ' + y + ')'}>
          <g className={styles.dataLayer} data-database-layer={name}>
            <path className={styles.dataSide} d="M30 27 119 57 208 27V37L119 67 30 37Z" />
            <path className={styles.dataTop} d="M30 27 119 0 208 27 119 57Z" />
            <path className={styles.dataSeam} d="M119 57V67 M44 26 119 3 194 26 M159 48 195 36 M159 44 195 32" />
            <path className={styles.dataIndex} d="M50 39 97 55 M50 35 74 43" />
            <g transform="translate(187 39)">
              <circle className={styles.dataPort} r="2.6" />
              <g className={styles.dataPlug}>
                <path d="M0 0L4.5 1.5" />
                <circle r="2.6" />
              </g>
            </g>
          </g>
        </g>
      ))}
    </svg>
  )
}

function BrowserContent({ result }: { result: RequestResult }) {
  const { text: { flow: { screen }, sections } } = useLanguage()
  if (result.kind === 'error') return <output>{screen.failed}</output>
  if (result.kind === 'pending') return <output>{screen.waiting}</output>
  if (result.kind === 'idle') return <p>{screen.idle}</p>
  if (result.kind === 'guided') {
    return (
      <div className={styles.cards}>
        <p>{screen.example}</p>
        {defaultSectionOrder.slice(0, 3).map(key => <article key={key}>{sections[key].title}</article>)}
      </div>
    )
  }
  if (result.rows.length === 0) return <output>{screen.empty}</output>
  return (
    <div className={styles.cards} aria-live="polite">
      {result.rows.slice(0, 3).map(item => {
        const key = item.key.toLowerCase()
        const title = isSectionKey(key) && item.title === en.sections[key].title
          ? sections[key].title : item.title
        return <article key={item.key}><strong>{title}</strong><p>{item.body}</p></article>
      })}
      {result.rows.length > 3 && <p>{screen.shown(result.rows.length)}</p>}
    </div>
  )
}

function ResponsePreview({ result }: { result: RequestResult }) {
  const { text: { flow: { response } } } = useLanguage()
  if (result.kind === 'success') {
    const first = result.rows[0]
    return (
      <>
        <p className={styles.responseStatus}>HTTP {result.status} · {response.count(result.rows.length)}</p>
        {first && <p>{response.first}</p>}
        <pre>{JSON.stringify(first ? {
          key: first.key,
          title: first.title,
          body: first.body.length > 100 ? first.body.slice(0, 100) + '…' : first.body,
        } : [], null, 2)}</pre>
      </>
    )
  }
  if (result.kind === 'error') {
    return <p className={styles.responseStatus}>{result.status ? 'HTTP ' + result.status + ' · ' : ''}{response.unavailable}</p>
  }
  return <p className={styles.responseStatus}>{result.kind === 'guided' ? response.jsonList + ' · key, title, body' : response.notArrived}</p>
}

type Props = {
  index: number
  result: RequestResult
  playing: boolean
  moving: boolean
  revision: number
  finished: boolean
  start: () => void
  live: boolean
}

export function RequestFlowDiagram({ index, result, playing, moving, revision, finished, start, live }: Props) {
  const { text: { flow } } = useLanguage()
  const { screen, response } = flow
  const scene = useRef<HTMLDivElement>(null)
  const started = result.kind !== 'idle'
  const loading = started && index < 5
  const active = finished ? undefined : index < 2 || index === 5 ? 'browser' : index === 3 ? 'database' : 'server'
  const canStart = !started || index === 5
  const action = loading ? 'loading' : started ? 'reload' : 'load'
  const frame = { index, revision, started, moving: moving && !finished }

  return (
    <div ref={scene} className={styles.scene} data-live={live}
      data-playing={playing} data-phase={index} data-motion-started={frame.moving}
      data-processed={started && index >= 2} data-data-found={started && index >= 3}>
      <div className={styles.node} data-active={active === 'browser'} data-system="screen">
        <h4 className={styles.nodeTitle}><SceneLabel en={en.flow.systems[0].name} sr={sr.flow.systems[0].name} /></h4>
        <div className={styles.screen} data-screen data-loading={loading}>
          <ScreenSurface loading={loading} />
          <div className={styles.screenBody}>
            <strong><SceneLabel en={en.flow.screen.heading} sr={sr.flow.screen.heading} /></strong>
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Enable keyboard scrolling for results. */}
            <section className={styles.screenContents} aria-label={screen.label} tabIndex={index === 5 && result.kind === 'success' ? 0 : undefined}>
              {index === 5 ? <BrowserContent result={result} /> : (
                <p>{loading ? (result.kind === 'guided' ? screen.following : screen.loading) : screen.idle}</p>
              )}
            </section>
            <button type="button" className={styles.browserButton} aria-disabled={!canStart}
              onClick={() => { if (canStart) start() }}>
              {loading && <span className={styles.loading} aria-hidden="true" />}
              <SceneLabel en={en.flow.screen[action]} sr={sr.flow.screen[action]} />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.connectionSlot} aria-hidden="true" />
      <div className={styles.node} data-active={active === 'server'} data-system="server">
        <h4 className={styles.nodeTitle}><SceneLabel en={en.flow.systems[1].name} sr={sr.flow.systems[1].name} /></h4>
        <ServerCore frame={frame} />
        <ol className={styles.serverJobs}>
          {en.flow.jobs.map((job, index) => (
            <li key={job}>
              <span className={styles.jobIndicator} aria-hidden="true" />
              <SceneLabel en={job} sr={sr.flow.jobs[index]} />
            </li>
          ))}
        </ol>
        <div className={styles.responseSlot}>
          {index === 4 && (
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Enable keyboard scrolling of the API response.
            <section className={styles.response} aria-label={response.label} tabIndex={live ? 0 : undefined}>
              <ResponsePreview result={result} />
            </section>
          )}
        </div>
      </div>
      <div className={styles.connectionSlot} aria-hidden="true" />
      <div className={styles.node} data-active={active === 'database'} data-system="database"
        style={{ '--database-arrival': databaseArrival } as CSSProperties}>
        <h4 className={styles.nodeTitle}><SceneLabel en={en.flow.systems[2].name} sr={sr.flow.systems[2].name} /></h4>
        <DataStack frame={frame} />
        <div className={styles.dataFields}>
          <code>Sections</code>
          <p>Key · Title · Body</p>
          <div className={styles.dataReadout}>
            {index === 3 && <p className={styles.filter}><code>IsEnabled = 1</code></p>}
            {index === 3 && result.kind === 'success' && <p>{response.found(result.rows.length)}</p>}
          </div>
        </div>
      </div>
      <RequestFlowConnections scene={scene} frame={frame} playing={playing} />
    </div>
  )
}
