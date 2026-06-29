import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  Modal,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
} from '../../components/ui'
import { actionColumn, statusColumn } from './fix/fix-grid-bits'
import type { CroppingRecord, OperationRecord } from './fix/fix-records'
import { useFixState } from './fix/fix-state'

/* -------------------------------------------------------------------------- */
/* CommitStep — final read-only review before save                             */
/*                                                                             */
/* Mirrors the Fix-issues card layout (headline + four solid summary tiles)   */
/* and then shows the cropping + operations records as plain DataTables —    */
/* no filters, no edit affordances. Hitting "Save to Sandy" simulates the    */
/* commit and bounces the user home.                                          */
/* -------------------------------------------------------------------------- */

const MissingCell = () => <span className="text-text-secondary">—</span>

const CROPPING_COLUMNS: GridColDef<CroppingRecord>[] = [
  { field: 'farmName', headerName: 'Farm', flex: 1, minWidth: 150 },
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'harvestYear',
    headerName: 'Year',
    type: 'number',
    flex: 0.5,
    minWidth: 90,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'cropName', headerName: 'Crop', flex: 1, minWidth: 150 },
  {
    field: 'cropVariety',
    headerName: 'Variety',
    flex: 1,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.cropVariety === null ? <MissingCell /> : row.cropVariety,
  },
  {
    field: 'workingArea',
    headerName: 'Area (ha)',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.workingArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.workingArea.toFixed(1)}</span>
      ),
  },
  {
    field: 'yield',
    headerName: 'Yield (t/ha)',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.yield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.yield.toFixed(2)}</span>
      ),
  },
  {
    field: 'plantingDate',
    headerName: 'Planting',
    flex: 0.9,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.plantingDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.plantingDate}</span>
      ),
  },
  {
    field: 'harvestDate',
    headerName: 'Harvest',
    flex: 0.9,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.harvestDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.harvestDate}</span>
      ),
  },
]

const OPERATION_COLUMNS: GridColDef<OperationRecord>[] = [
  { field: 'farmName', headerName: 'Farm', flex: 1, minWidth: 150 },
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'harvestYear',
    headerName: 'Year',
    type: 'number',
    flex: 0.5,
    minWidth: 90,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'operationGroup', headerName: 'Group', flex: 1, minWidth: 140 },
  { field: 'operationType', headerName: 'Type', flex: 1, minWidth: 140 },
  {
    field: 'operationDate',
    headerName: 'Date',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.operationDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.operationDate}</span>
      ),
  },
  {
    field: 'productName',
    headerName: 'Product',
    flex: 1.1,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.productName === null ? <MissingCell /> : row.productName,
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.quantity === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.quantity.toFixed(2)}</span>
      ),
  },
  {
    field: 'unit',
    headerName: 'Unit',
    flex: 0.5,
    minWidth: 80,
    renderCell: ({ row }) => (row.unit === null ? <MissingCell /> : row.unit),
  },
  {
    field: 'appliedArea',
    headerName: 'Applied (ha)',
    type: 'number',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.appliedArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.appliedArea.toFixed(1)}</span>
      ),
  },
]

type CommitTab = 'cropping' | 'operations'

type Stage = 'review' | 'confirming' | 'committing' | 'done'

/**
 * Event the wizard top bar dispatches when the user clicks the global
 * "Save to Sandy" button. CommitStep listens for it and opens its own
 * confirmation modal — keeps the modal state co-located with the page even
 * though the trigger lives in the wizard chrome.
 */
const COMMIT_REQUEST_EVENT = 'data-upload:commit-request'

export const CommitStep = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<CommitTab>('cropping')
  const [stage, setStage] = useState<Stage>('review')
  // Latch — `setStage` from the event listener needs to see the latest
  // stage value so we don't re-trigger the modal while committing.
  const stageRef = useRef(stage)
  stageRef.current = stage

  const {
    croppingRecords,
    operationRecords,
    editedCroppingIds,
    editedOperationIds,
    removedCroppingIds,
    removedOperationIds,
  } = useFixState()

  // Prefix the cropping + operations grids with the same Status / Action
  // chrome the Fix-issues data table uses, so the commit review reads as
  // the same table the user just edited.
  const croppingCols = useMemo(
    () => [
      statusColumn<CroppingRecord>(removedCroppingIds),
      actionColumn<CroppingRecord>(editedCroppingIds, removedCroppingIds),
      ...CROPPING_COLUMNS,
    ],
    [editedCroppingIds, removedCroppingIds],
  )
  const operationCols = useMemo(
    () => [
      statusColumn<OperationRecord>(removedOperationIds),
      actionColumn<OperationRecord>(editedOperationIds, removedOperationIds),
      ...OPERATION_COLUMNS,
    ],
    [editedOperationIds, removedOperationIds],
  )

  // Headline stats — same shape as the Fix-issues summary tiles so the
  // commit step reads as the closing beat of the same conversation.
  const summary = useMemo(() => {
    const farms = new Set<string>()
    const fields = new Set<string>()
    for (const r of croppingRecords) {
      farms.add(r.farmName)
      fields.add(`${r.farmName}::${r.fieldName}`)
    }
    for (const r of operationRecords) {
      farms.add(r.farmName)
      fields.add(`${r.farmName}::${r.fieldName}`)
    }
    return {
      totalRecords: croppingRecords.length + operationRecords.length,
      croppingCount: croppingRecords.length,
      operationCount: operationRecords.length,
      farms: farms.size,
      fields: fields.size,
    }
  }, [croppingRecords, operationRecords])

  // The wizard's top-bar "Save to Sandy" button dispatches a custom
  // event — listen for it and open our confirmation modal. We ignore the
  // event whenever we're already past the review stage so a re-trigger
  // can't bounce the user out of the committing screen.
  useEffect(() => {
    const onRequest = () => {
      if (stageRef.current === 'review') setStage('confirming')
    }
    window.addEventListener(COMMIT_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(COMMIT_REQUEST_EVENT, onRequest)
  }, [])

  // Simulated commit: ~2.4s of fake "uploading", then a brief "done" beat
  // before we bounce home. Mirrors the FixLoader cadence so the two
  // surfaces feel like the same conversation.
  useEffect(() => {
    if (stage !== 'committing') return
    const t = window.setTimeout(() => setStage('done'), 2400)
    return () => window.clearTimeout(t)
  }, [stage])

  useEffect(() => {
    if (stage !== 'done') return
    // Linger on the success screen so the user has a beat to read it and
    // a chance to bounce out early via the Continue button. Auto-redirects
    // at the end of the window if they don't act.
    const t = window.setTimeout(() => navigate('/'), 10_000)
    return () => window.clearTimeout(t)
  }, [stage, navigate])

  if (stage === 'committing' || stage === 'done') {
    return (
      <CommitProgress
        stage={stage}
        totalRecords={summary.totalRecords}
        onContinue={() => navigate('/')}
      />
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-bg-primary">
      <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-8 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-text-primary">
            Here's what you're adding to Sandy.
          </h1>
          <p className="text-md text-text-secondary">
            Final review — nothing is saved to your farm record until you hit
            Save to Sandy.
          </p>
        </header>

        <Tabs<CommitTab> value={tab} onValueChange={setTab}>
          <TabBar>
            <Tab value="cropping">
              Cropping ({summary.croppingCount.toLocaleString()})
            </Tab>
            <Tab value="operations">
              Operations ({summary.operationCount.toLocaleString()})
            </Tab>
          </TabBar>
          <TabPanel value="cropping" className="pt-4">
            <DataTable<CroppingRecord>
              rows={croppingRecords}
              columns={croppingCols}
              selectable={false}
              defaultPageSize={25}
              pageSizeOptions={[25, 50, 100]}
            />
          </TabPanel>
          <TabPanel value="operations" className="pt-4">
            <DataTable<OperationRecord>
              rows={operationRecords}
              columns={operationCols}
              selectable={false}
              defaultPageSize={25}
              pageSizeOptions={[25, 50, 100]}
            />
          </TabPanel>
        </Tabs>
      </section>

      <Modal
        open={stage === 'confirming'}
        onOpenChange={(next) => {
          if (!next) setStage('review')
        }}
        title="Save to Sandy?"
        description={`We'll add ${summary.totalRecords.toLocaleString()} records (${summary.croppingCount.toLocaleString()} cropping, ${summary.operationCount.toLocaleString()} operations) to your farm record across ${summary.farms} ${summary.farms === 1 ? 'farm' : 'farms'}.`}
        maxWidth="480px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStage('review')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setStage('committing')}>
              Yes, save to Sandy
            </Button>
          </>
        }
      >
        <p className="text-md text-text-secondary">
          Once committed, the records become part of your live Sandy data —
          we'll bounce you back to your dashboard when it's done.
        </p>
      </Modal>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* CommitProgress — full-page loader + success state                          */
/*                                                                             */
/* Mirrors the styling of FixLoader / FixIntro on the Fix page so the commit  */
/* feels like the same conversation.                                          */
/* -------------------------------------------------------------------------- */

const CommitProgress = ({
  stage,
  totalRecords,
  onContinue,
}: {
  stage: 'committing' | 'done'
  totalRecords: number
  onContinue: () => void
}) => {
  if (stage === 'committing') {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-primary px-8 py-16">
        <div className="flex max-w-[480px] flex-col items-center gap-6 text-center">
          <ThinkingDots />
          <p
            aria-live="polite"
            className="commit-loader-message text-md text-text-secondary"
          >
            Saving {totalRecords.toLocaleString()} records to Sandy…
          </p>
          <style>{`
            @keyframes commit-loader-dot {
              0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
              40% { opacity: 1; transform: scale(1); }
            }
            .commit-loader-dot {
              animation: commit-loader-dot 1.2s ease-in-out infinite;
            }
            @keyframes commit-loader-fade {
              from { opacity: 0; transform: translateY(2px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .commit-loader-message {
              animation: commit-loader-fade 250ms ease-out;
            }
          `}</style>
        </div>
      </div>
    )
  }
  // done
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-primary px-8 py-16">
      <div className="flex max-w-[640px] flex-col items-center gap-10 text-center">
        <CompletedTick />
        <h1
          className="max-w-[560px] text-5xl font-medium leading-[1.05] tracking-tight text-text-primary animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          Saved to Sandy
        </h1>
        <p
          className="max-w-[460px] text-md leading-relaxed text-text-secondary animate-fade-up"
          style={{ animationDelay: '440ms' }}
        >
          {totalRecords.toLocaleString()} records are now part of your farm
          record. We'll bounce you back to your dashboard in a moment.
        </p>
        <div className="animate-fade-up" style={{ animationDelay: '560ms' }}>
          <Button variant="primary" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

const ThinkingDots = () => (
  <div className="flex items-center gap-2" aria-hidden="true">
    <span
      className="commit-loader-dot size-3 rounded-full bg-text-brand-dark"
      style={{ animationDelay: '0s' }}
    />
    <span
      className="commit-loader-dot size-3 rounded-full bg-text-brand-dark"
      style={{ animationDelay: '0.2s' }}
    />
    <span
      className="commit-loader-dot size-3 rounded-full bg-text-brand-dark"
      style={{ animationDelay: '0.4s' }}
    />
  </div>
)

const CompletedTick = () => (
  <span
    aria-hidden="true"
    className="grid size-20 place-items-center rounded-full bg-sandy-300 shadow-md animate-fade-up"
  >
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <title>Saved</title>
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="#0a0a0a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)
