import clsx from 'clsx'
import type { SVGProps } from 'react'

/**
 * Sidebar icon set, extracted verbatim from the Figma source (file krXsJxN2J4...).
 * Each icon renders at the 24×24 design grid and uses `currentColor` so callers
 * can colour them through the text-colour token (e.g. `text-icon-brand`).
 */

type FigmaIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  title?: string
}

const FigmaIcon = ({
  size = 24,
  title,
  className,
  children,
  ...rest
}: FigmaIconProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icons set aria-hidden; consumers pass `title` when meaningful
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    focusable="false"
    className={clsx('shrink-0', className)}
    {...rest}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
)

export type IconProps = FigmaIconProps

/* Arrow-style chrome icons — kept as stroke marks for the header's back button etc. */

export const IconArrowLeft = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconArrowRight = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M4 11H16.17L10.58 5.41L12 4L20 12L12 20L10.59 18.59L16.17 13H4V11Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconPlus = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" fill="currentColor" />
  </FigmaIcon>
)

export const IconMinus = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path d="M5 11H19V13H5V11Z" fill="currentColor" />
  </FigmaIcon>
)

export const IconChevronDown = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M7.0275 8L12 12.9447L16.9725 8L18.5 9.52227L12 16L5.5 9.52227L7.0275 8Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconChevronUp = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M7.0275 16L12 11.0553L16.9725 16L18.5 14.4777L12 8L5.5 14.4777L7.0275 16Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconClose = (props: IconProps) => (
  <FigmaIcon {...props}>
    {/* Heavier-weight cross — drawn as two stroked diagonals so the icon
        reads boldly across modal close buttons. */}
    <path
      d="M6 6L18 18M18 6L6 18"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </FigmaIcon>
)

export const IconSearch = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11 6C13.7614 6 16 8.23858 16 11C16 12.0191 15.6944 12.9664 15.1709 13.7568L17.707 16.293L16.293 17.707L13.7568 15.1709C12.9664 15.6944 12.0191 16 11 16C8.23858 16 6 13.7614 6 11C6 8.23858 8.23858 6 11 6ZM11 8C9.34315 8 8 9.34315 8 11C8 12.6569 9.34315 14 11 14C12.6569 14 14 12.6569 14 11C14 9.34315 12.6569 8 11 8Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Inverted of the collapse icon — arrow pointing left, used when the menu is expanded. */
export const IconMenuHide = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M21 11H6.83L12.42 5.41L11 4L3 12L11 20L12.41 18.59L6.83 13H21V11Z"
      fill="currentColor"
    />
    <rect x="14" y="7" width="7" height="2" fill="currentColor" />
    <rect x="14" y="15" width="7" height="2" fill="currentColor" />
  </FigmaIcon>
)

/* -------------------------------------------------------------------------- */
/* Sidebar / menu icons — inlined from the Figma assets.                       */
/* -------------------------------------------------------------------------- */

export const IconMenuCollapse = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M3 11H17.17L11.58 5.41L13 4L21 12L13 20L11.59 18.59L17.17 13H3V11Z"
      fill="currentColor"
    />
    <rect x="3" y="7" width="7" height="2" fill="currentColor" />
    <rect x="3" y="15" width="7" height="2" fill="currentColor" />
  </FigmaIcon>
)

export const IconMenuHome = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 12.8L12 2L24 12.8H20.4V22.4H13.2V15.2H10.8V22.4H3.6V12.8H0ZM18.0001 10.628L12.0001 5.228L6.00012 10.628V20H8.40012V12.8H15.6001V20H18.0001V10.628Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconMenuFarm = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13 2H11V5H13V2ZM12 9C11.4477 9 11 9.44771 11 10H9C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10H13C13 9.44772 12.5523 9 12 9ZM13 12H2V14H11L9 16H2V18H7L5 20H2V22H3H6L10 18L14 14H17L9 22H12L20 14L22 12H20H19H16H13ZM22 15L15 22H18L22 18V15ZM17 8H20V10H17V8ZM16.8536 3.23223L14.7322 5.35355L16.1465 6.76776L18.2678 4.64644L16.8536 3.23223ZM4 8H7V10H4V8ZM9.26777 5.35356L7.14645 3.23224L5.73224 4.64645L7.85356 6.76777L9.26777 5.35356Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconMenuSustainability = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 4C14.33 4 16.42 5.02 17.88 6.62L15.5 9H21.5V3L19.3 5.2C17.48 3.24 14.89 2 12 2C7.51872 2 3.73078 4.94488 2.45796 8.99999H4.58986C5.77665 6.07137 8.6514 4 12 4ZM12 15.45C11.18 14.2 10.14 13.11 8.94 12.25C8.88546 12.2122 8.82915 12.178 8.77257 12.1436C8.69429 12.096 8.61545 12.048 8.54 11.99C8.61358 12.0409 8.69035 12.0887 8.76489 12.135C8.82205 12.1705 8.87793 12.2053 8.93 12.24C6.98 10.83 4.59 10 2 10C2 15.32 5.36 19.82 10.03 21.49C10.66 21.72 11.32 21.89 12 22C12.68 21.88 13.33 21.71 13.97 21.49C18.64 19.82 22 15.32 22 10C17.82 10 14.15 12.17 12 15.45ZM13.32 19.6C12.88 19.75 12.44 19.87 11.99 19.97C11.55 19.88 11.12 19.76 10.71 19.61C7.41999 18.43 5.00999 15.62 4.25999 12.26C5.35999 12.52 6.40999 12.97 7.37999 13.59L7.35999 13.6C7.48999 13.69 7.61999 13.78 7.74999 13.85L7.81999 13.89C8.80999 14.61 9.65999 15.5 10.33 16.54L12 19.1L13.67 16.55C14.36 15.5 15.22 14.6 16.2 13.89L16.27 13.84C16.36 13.79 16.4499 13.73 16.5399 13.6701L16.53 13.65C17.51 13 18.6 12.52 19.74 12.25C18.99 15.62 16.59 18.43 13.32 19.6Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconMenuFinancial = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.5 12C3.5 7.30843 7.30843 3.5 12 3.5C16.6916 3.5 20.5 7.30843 20.5 12C20.5 16.6916 16.6916 20.5 12 20.5C7.30843 20.5 3.5 16.6916 3.5 12ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM9.97004 9.47C9.97004 10.2 10.54 10.69 12.31 11.14C14.07 11.6 15.96 12.36 15.97 14.56C15.96 16.17 14.76 17.04 13.24 17.33V19H10.9V17.3C9.40004 16.99 8.14004 16.03 8.04004 14.33H9.76004C9.85004 15.25 10.48 15.97 12.08 15.97C13.79 15.97 14.18 15.11 14.18 14.58C14.18 13.86 13.79 13.17 11.84 12.71C9.67004 12.19 8.18004 11.29 8.18004 9.5C8.18004 7.99 9.39004 7.01 10.9 6.69V5H13.23V6.71C14.85 7.11 15.67 8.34 15.72 9.68H14.01C13.97 8.7 13.45 8.04 12.07 8.04C10.76 8.04 9.97004 8.63 9.97004 9.47Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconMenuOpportunities = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.82 4H19C20.1 4 21 4.9 21 6V20C21 21.1 20.1 22 19 22H5C4.86 22 4.73 21.99 4.6 21.97C4.21 21.89 3.86 21.69 3.59 21.42C3.41 21.23 3.26 21.02 3.16 20.78C3.06 20.54 3 20.27 3 20V6C3 5.72 3.06 5.46 3.16 5.23C3.26 4.99 3.41 4.77 3.59 4.59C3.86 4.32 4.21 4.12 4.6 4.04C4.73 4.01 4.86 4 5 4H9.18C9.6 2.84 10.7 2 12 2C13.3 2 14.4 2.84 14.82 4ZM16.59 8.58L18 10L10 18L6 14L7.41 12.59L10 15.17L16.59 8.58ZM12 3.75C12.41 3.75 12.75 4.09 12.75 4.5C12.75 4.91 12.41 5.25 12 5.25C11.59 5.25 11.25 4.91 11.25 4.5C11.25 4.09 11.59 3.75 12 3.75ZM5 20H19V6H5V20Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Bullet-list icon. */
export const IconList = (props: IconProps) => (
  <FigmaIcon {...props}>
    <rect x="3" y="5" width="2" height="2" rx="1" fill="currentColor" />
    <rect x="3" y="11" width="2" height="2" rx="1" fill="currentColor" />
    <rect x="3" y="17" width="2" height="2" rx="1" fill="currentColor" />
    <rect x="8" y="5" width="13" height="2" rx="1" fill="currentColor" />
    <rect x="8" y="11" width="13" height="2" rx="1" fill="currentColor" />
    <rect x="8" y="17" width="13" height="2" rx="1" fill="currentColor" />
  </FigmaIcon>
)

/** Pin / map marker icon. */
export const IconMap = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2Zm0 2.5 6 2v13l-6-2v-13Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Right chevron — for row "open" affordances. */
export const IconChevronRight = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M9.06 6L7.5 7.56 11.94 12 7.5 16.44 9.06 18l6-6-6-6Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Grid / data table icon. */
export const IconTable = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M4 4h16v4H4V4Zm0 6h7v4H4v-4Zm9 0h7v4h-7v-4Zm-9 6h7v4H4v-4Zm9 0h7v4h-7v-4Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Decorative palette icon — used for the design-system route only. */
export const IconPalette = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M12 3c-4.97 0-9 3.58-9 8 0 4.42 4.03 8 9 8 .83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.27-.36-.62-.36-1 0-.83.67-1.5 1.5-1.5h1.77c2.76 0 5-2.24 5-5 0-3.31-3.58-6-7.02-6Zm-6.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.5 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconMenuUtilities = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4292 2H15.163L14.163 9H16.52C16.8014 9 17.3885 9.05451 17.7604 9.56445C18.1682 10.1236 17.9841 10.7455 17.8257 11.0839L17.8081 11.1214L17.7875 11.1574C15.8127 14.6021 14.3328 17.1869 13.3467 18.9104C12.8537 19.7721 12.4841 20.4186 12.2377 20.8495L11.8688 21.4952L11.5805 22H8.84699L9.84699 15H7.5C7.1784 15 6.72457 14.9383 6.37584 14.5949C5.98746 14.2124 5.97713 13.7369 6.01958 13.4663C6.0784 13.0913 6.29235 12.7569 6.34753 12.6783C7.59792 10.4687 9.44927 7.22349 11.9001 2.92747L12.4292 2ZM11.3972 18.2904C11.4656 18.1708 11.5368 18.0464 11.6108 17.9171C12.5156 16.3358 13.8358 14.0297 15.5724 11H11.857L12.6118 5.71606C10.882 8.74855 9.49958 11.1736 8.46391 13H12.153L11.3972 18.2904Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/* Trend-direction icons — Material-style up/down arrows used by TrendBadge. */

export const IconTrendUp = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

export const IconTrendDown = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M16 18L18.29 15.71L13.41 10.83L9.41 14.83L2 7.41L3.41 6L9.41 12L13.41 8L19.71 14.29L22 12V18H16Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/**
 * Diagonal arrow pointing up-and-right — used as a trailing hint on stat
 * cards that link to a deeper view.
 */
export const IconArrowUpRight = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M5 17.59L15.59 7H10V5H19V14H17V8.41L6.41 19L5 17.59Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Generic file/document glyph — page with a folded corner. */
export const IconFile = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 2.41L17.59 9H15a1 1 0 0 1-1-1V5.41Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Download arrow — used as an affordance on file-row download links. */
export const IconDownload = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42L11 13.6V4a1 1 0 0 1 1-1Zm-8 16a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Trend glyph — line chart climbing into an arrowhead. Used as the leading
 *  affordance on trend / regional comparison anomaly cards. */
export const IconTrend = (props: IconProps) => (
  <FigmaIcon {...props}>
    <path
      d="M3 19h18v1.5H3V19Zm0-2.5 5-5 4 4 7-7 1.5 1.5v-3.5h-3.5L18 8 12 14l-4-4-6 6 1 1.5Z"
      fill="currentColor"
    />
  </FigmaIcon>
)

/** Spot-check glyph — magnifying glass over a small grid of spreadsheet
 *  cells. Used as the leading affordance on spot-anomaly cards. */
export const IconSpotCheck = (props: IconProps) => (
  <FigmaIcon {...props}>
    {/* Cell grid — two-by-two underneath the lens. */}
    <path
      d="M3 4h8v3.5H3V4Zm0 5.5h8V13H3V9.5Z"
      fill="currentColor"
      opacity="0.45"
    />
    {/* Magnifying glass */}
    <path
      d="M14.5 9a4.5 4.5 0 1 0-1.65 3.46l3.85 3.84 1.41-1.41-3.84-3.84A4.48 4.48 0 0 0 14.5 9Zm-4.5 2.5A2.5 2.5 0 1 1 12.5 9 2.5 2.5 0 0 1 10 11.5Z"
      fill="currentColor"
    />
  </FigmaIcon>
)
