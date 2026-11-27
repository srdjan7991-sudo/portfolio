import { useId } from 'react'
import styles from './LivingArchitecture.module.css'

export function ArchitectureStill() {
  const shadow = useId()
  return (
    <svg className={styles.still} viewBox="0 0 760 530" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={shadow}>
          <stop offset="0" stopColor="var(--ink)" stopOpacity=".25" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" stroke="var(--line)" strokeWidth=".85" opacity=".65">
        <path d="M69 393 378 527M113 375l309 134M157 357l309 134M201 339l309 134M245 321l309 134M289 303l309 134M333 285l309 134M377 267l309 134M421 249l309 134" />
        <path d="M69 393 421 249M110 411l352-144M151 429l352-144M192 447l352-144M233 465l352-144M274 483l352-144M315 501l352-144M356 519l352-144" />
      </g>
      <ellipse cx="400" cy="403" rx="256" ry="83" fill={`url(#${shadow})`} />
      <g strokeLinejoin="round">
        <path d="m120 351 237 103 286-116v16L357 470 120 368Z" fill="var(--surface-raised)" stroke="var(--line-glass)" />
        <path d="m120 351 286-116 237 103-286 116Z" fill="var(--surface)" stroke="var(--line-glass)" />
        <path d="m168 349 199 86 228-93-199-86Z" fill="none" stroke="var(--line)" />
        <path d="m160 292 203 88 240-97v14l-240 97-203-88Z" fill="var(--control-edge)" stroke="var(--quiet)" />
        <path d="m160 292 240-97 203 88-240 97Z" fill="var(--surface-raised)" stroke="var(--quiet)" />
        <g fill="var(--accent-soft)" stroke="var(--quiet)" strokeWidth=".8">
          <path d="m218 286 31 13 62-25-31-14Z" />
          <path d="m270 309 31 13 62-25-31-14Z" />
          <path d="m322 331 31 13 62-25-31-14Z" />
          <path d="m374 354 31 13 62-25-31-14Z" />
        </g>
        <path d="m165 239 202 87 234-95v10l-234 95-202-87Z" fill="var(--surface-raised)" stroke="var(--line-glass)" />
        <path d="m165 239 234-95 202 87-234 95Z" fill="var(--surface)" stroke="var(--line-glass)" />
        <g fill="var(--accent-soft)" stroke="var(--accent-edge)" strokeWidth="1">
          <path d="m235 225 57 25 72-29-57-25Z" />
          <path d="m319 261 57 25 124-50-57-25Z" />
          <path d="m346 219 25 11 52-21-25-11Z" />
        </g>
        <path d="m159 182 210 91 234-95v5l-234 95-210-91Z" fill="var(--accent-edge)" />
        <path d="m159 182 234-95 210 91-234 95Z" fill="var(--accent-soft)" fillOpacity=".83" stroke="var(--accent-edge)" />
        <g fill="none" stroke="var(--accent)" strokeWidth="1.2">
          <path d="m186 184 206-84 185 80-208 84Z" />
          <path d="m233 188 46 19 43-17 43 19 111-45M309 214l-17 7 82 36m24-132 39 17-42 17 52 23 31-12" />
        </g>
        <path d="m179 126 197 85 213-87-197-85Z" fill="var(--surface)" fillOpacity=".78" stroke="var(--quiet)" />
        <path d="m194 127 182 78 198-81-183-79Z" fill="none" stroke="var(--accent-edge)" />
        <g transform="matrix(1 .43 -1 .408 390 53)">
          <path d="M0 0h156v155H0z" fill="none" stroke="var(--line)" />
          <path d="M10 10h28v137H10zM48 10h96v79H48zm0 91h44v46H48zm54 0h42v46h-42z" fill="var(--accent-soft)" fillOpacity=".75" stroke="var(--accent-edge)" />
          <path d="M54 71l19-12 17 4 17-23 16 7 15-19M16 25h16m-16 10h16m-16 10h16m24 77h22m32 0h22" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        </g>
        <g fill="none" stroke="var(--accent)" strokeWidth="1.05" opacity=".82">
          <path d="M207 313v-55l18-8v-67l33-14v-40M512 319v-46l29-12v-70l-25-10v-30M359 432v-54l17-7v-44l-19-8v-47" />
          <path d="m147 215-44 18H54m531 45 44 19h56M420 112l43-18h77" opacity=".52" />
        </g>
        <g fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.2">
          <circle cx="258" cy="129" r="3" /><circle cx="516" cy="151" r="3" />
          <circle cx="207" cy="313" r="3" /><circle cx="512" cy="319" r="3" />
          <circle cx="357" cy="272" r="3" />
        </g>
      </g>
    </svg>
  )
}
