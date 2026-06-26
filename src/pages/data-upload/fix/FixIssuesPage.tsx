import { useSearchParams } from 'react-router-dom'
import { SegmentedControl } from '../../../components/ui'
import { CroppingTableView } from './CroppingTableView'
import { FieldView } from './FieldView'
import { IssuesView } from './IssuesView'

/* -------------------------------------------------------------------------- */
/* FixIssuesPage — tabbed shell wrapping three views of the same data         */
/* -------------------------------------------------------------------------- */

type FixView = 'issue' | 'cropping' | 'field'

const VIEW_OPTIONS = [
  { value: 'issue' as const, label: 'Issue Type' },
  { value: 'cropping' as const, label: 'Cropping Table' },
  { value: 'field' as const, label: 'Field' },
]

const DEFAULT_VIEW: FixView = 'issue'

const isFixView = (v: string | null): v is FixView =>
  v === 'issue' || v === 'cropping' || v === 'field'

export const FixIssuesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('view')
  const view: FixView = isFixView(raw) ? raw : DEFAULT_VIEW
  const setView = (next: FixView) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b-2 border-border-tertiary bg-bg-primary px-8 py-3">
        <span className="text-sm font-medium text-text-secondary">
          Group issues by:
        </span>
        <SegmentedControl<FixView>
          ariaLabel="Group issues by"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={setView}
        />
      </div>
      <div className="flex flex-1 min-h-0 flex-col">
        {view === 'issue' ? (
          <div className="flex-1 overflow-auto">
            <IssuesView />
          </div>
        ) : null}
        {view === 'cropping' ? (
          <div className="flex-1 overflow-auto">
            <CroppingTableView />
          </div>
        ) : null}
        {view === 'field' ? <FieldView /> : null}
      </div>
    </div>
  )
}
