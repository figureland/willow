import { useNavigate } from 'react-router-dom'
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

/**
 * /data-upload/past — directory of upload "transactions". Each row is a
 * single commit against the Sandy database; click through for the per-record
 * change summary.
 */
export const PastUploadsPage = () => {
  const navigate = useNavigate()

  return (
    <AppShell
      header={{
        title: 'Upload history',
        showBack: true,
        onBack: () => navigate('/data-upload'),
        actions: (
          <Button variant="primary" onClick={() => navigate('/data-upload')}>
            Start a new upload
          </Button>
        ),
      }}
    >
      <p className="text-md text-text-secondary">
        Every upload is a single transaction. Click an entry to see the records
        it changed.
      </p>

      <Card className="p-0 overflow-hidden mt-2">
        <table className="w-full text-md text-text-primary">
          <thead className="bg-bg-secondary text-sm text-text-secondary">
            <tr>
              <th className="text-left font-semibold px-6 py-3">Upload</th>
              <th className="text-left font-semibold px-6 py-3 w-[180px]">
                Committed
              </th>
              <th className="text-left font-semibold px-6 py-3 w-[160px]">
                By
              </th>
              <th className="text-right font-semibold px-6 py-3 w-[120px]">
                Records
              </th>
              <th className="text-right font-semibold px-6 py-3 w-[100px]">
                Files
              </th>
            </tr>
          </thead>
          <tbody>
            {UPLOAD_HISTORY.map((entry, i) => (
              <tr
                key={entry.id}
                onClick={() => navigate(`/data-upload/past/${entry.id}`)}
                className={`cursor-pointer transition-colors hover:bg-bg-secondary ${
                  i === UPLOAD_HISTORY.length - 1
                    ? ''
                    : 'border-b-2 border-border-tertiary'
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-md font-semibold text-text-primary">
                      {entry.title}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {entry.summary}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  <div className="flex flex-col">
                    <span>{formatDate(entry.committedAt)}</span>
                    <span>{formatTime(entry.committedAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {entry.committedBy}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {formatNumber(entry.records)}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {entry.files}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  )
}
