import { Link } from 'react-router-dom'
import { AppShell } from '../../components/shell/AppShell'
import { Button, Card } from '../../components/ui'
import { UPLOAD_HISTORY } from './upload-history'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

const formatNumber = (n: number): string => n.toLocaleString()

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

/** Column template shared by the header row and each link row so they stay
 *  visually aligned regardless of which markup wraps them. */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_180px_160px_120px_100px] items-center gap-4 px-6 py-4'

/**
 * /data-upload/past — directory of upload "transactions". Each row is a
 * single commit against the Sandy database; click through for the per-record
 * change summary.
 */
export const PastUploadsPage = () => (
  <AppShell
    header={{
      title: 'Upload history',
      showBack: true,
      backTo: '/data-upload',
      actions: (
        <Button variant="primary" to="/data-upload">
          Start a new upload
        </Button>
      ),
    }}
  >
    <p className="text-md text-text-secondary">
      Every upload is a single transaction. Click an entry to see the records it
      changed.
    </p>

    <Card className="p-0 overflow-hidden mt-2">
      <div
        className={`${ROW_GRID} bg-bg-secondary text-sm font-semibold text-text-secondary`}
      >
        <span>Upload</span>
        <span>Committed</span>
        <span>By</span>
        <span className="text-right">Records</span>
        <span className="text-right">Files</span>
      </div>
      <ul className="flex flex-col">
        {UPLOAD_HISTORY.map((entry, i) => (
          <li
            key={entry.id}
            className={
              i === UPLOAD_HISTORY.length - 1
                ? ''
                : 'border-b-2 border-border-tertiary'
            }
          >
            <Link
              to={`/data-upload/past/${entry.id}`}
              className={`${ROW_GRID} text-md text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:bg-bg-secondary`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-md font-semibold text-text-primary">
                  {entry.title}
                </p>
                <p className="truncate text-sm text-text-secondary">
                  {entry.summary}
                </p>
              </div>
              <div className="flex flex-col text-sm text-text-secondary">
                <span>{formatDate(entry.committedAt)}</span>
                <span>{formatTime(entry.committedAt)}</span>
              </div>
              <span className="truncate text-sm text-text-secondary">
                {entry.committedBy}
              </span>
              <span className="text-right tabular-nums">
                {formatNumber(entry.records)}
              </span>
              <span className="text-right tabular-nums">{entry.files}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  </AppShell>
)
