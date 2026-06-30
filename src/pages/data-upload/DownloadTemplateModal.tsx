import { useEffect, useState } from 'react'
import {
  Button,
  Modal,
  MultiSelect,
  Select,
  Spinner,
} from '../../components/ui'
import { FARMS } from '../../data'

/* -------------------------------------------------------------------------- */
/* DownloadTemplateModal — pick enterprise + farms, then "generate" the file  */
/*                                                                             */
/* Triggered from the empty hero on /data-upload/add-files. Lets the user     */
/* request a Sandy import template pre-filled for one enterprise and one or  */
/* more of their existing farms. A short fake "we're generating your file"   */
/* delay then drives a download.                                              */
/* -------------------------------------------------------------------------- */

const ENTERPRISES: { value: string; label: string }[] = [
  { value: 'arable', label: 'Arable' },
  { value: 'perennials', label: 'Perennials' },
  { value: 'permanent-grassland', label: 'Permanent grassland' },
]

const ALL_FARMS_VALUE = '__all__'

export type DownloadTemplateModalProps = {
  open: boolean
  onClose: () => void
  /**
   * Mode drives the title, body copy + footer button label. `blank` is the
   * empty-hero flow (start a fresh template). `issues` is the Fix-issues
   * flow (pre-fill the template with the records + columns Sandy flagged).
   */
  mode?: 'blank' | 'issues'
  /** Pre-selected enterprise. Falls back to the first option when omitted. */
  defaultEnterprise?: string | null
  /** Pre-selected farm ids. Falls back to all farms when omitted. */
  defaultFarmIds?: string[]
  /** Issues-mode summary line — "Includes X records with Y issues". */
  issueSummary?: { records: number; issues: number }
}

export const DownloadTemplateModal = ({
  open,
  onClose,
  mode = 'blank',
  defaultEnterprise = null,
  defaultFarmIds,
  issueSummary,
}: DownloadTemplateModalProps) => {
  const [enterprise, setEnterprise] = useState<string | null>(defaultEnterprise)
  const [farmIds, setFarmIds] = useState<string[]>(
    defaultFarmIds ?? FARMS.map((f) => f.id),
  )
  const [allFarms, setAllFarms] = useState(
    !defaultFarmIds || defaultFarmIds.length === FARMS.length,
  )
  const [phase, setPhase] = useState<'pick' | 'generating' | 'done'>('pick')

  // Reset to a clean state every time the modal opens so a previous session
  // doesn't bleed forward. Defaults come from the caller; "all farms" is
  // still the typical fallback for the empty-hero blank-template flow.
  useEffect(() => {
    if (!open) return
    setEnterprise(defaultEnterprise)
    const seeded = defaultFarmIds ?? FARMS.map((f) => f.id)
    setFarmIds(seeded)
    setAllFarms(seeded.length === FARMS.length)
    setPhase('pick')
  }, [open, defaultEnterprise, defaultFarmIds])

  // Simulated file generation — ~1.6s spinner, then a download trigger and
  // a brief "Done" beat before the modal closes itself.
  useEffect(() => {
    if (phase !== 'generating') return
    const generateTimer = window.setTimeout(() => {
      // Mint a fake .xlsx blob and trigger a download. The contents are a
      // placeholder; a real generator would lean on the picked enterprise +
      // farm ids to build a per-enterprise sheet.
      const filename = `sandy-${enterprise ?? 'template'}.xlsx`
      const blob = new Blob([`Sandy template (${filename})`], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setPhase('done')
    }, 1600)
    return () => window.clearTimeout(generateTimer)
  }, [phase, enterprise])

  useEffect(() => {
    if (phase !== 'done') return
    const t = window.setTimeout(() => onClose(), 900)
    return () => window.clearTimeout(t)
  }, [phase, onClose])

  const farmsPicked = allFarms ? FARMS.length : farmIds.length
  const canDownload = !!enterprise && farmsPicked > 0 && phase === 'pick'

  const title =
    mode === 'issues'
      ? 'Download a fix-list template'
      : 'Download a Sandy template'
  const description =
    mode === 'issues'
      ? 'We\u2019ll pre-fill the template with every record Sandy flagged so you can edit and re-upload in one go.'
      : "Pick an enterprise and the farms you want covered — we'll generate a template ready to import."

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && phase !== 'generating') onClose()
      }}
      title={title}
      description={description}
      maxWidth="540px"
      footer={
        phase === 'pick' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canDownload}
              onClick={() => setPhase('generating')}
            >
              Download
            </Button>
          </>
        ) : phase === 'generating' ? (
          <Button variant="primary" disabled>
            Generating…
          </Button>
        ) : (
          <Button variant="primary" disabled>
            Downloaded
          </Button>
        )
      }
    >
      {phase === 'pick' ? (
        <div className="flex flex-col gap-5">
          <Select<string>
            label="Enterprise"
            items={ENTERPRISES}
            value={enterprise}
            onValueChange={(next) => setEnterprise(next ?? null)}
            placeholder="Pick an enterprise"
            clearable={false}
          />
          <div className="flex flex-col gap-2">
            <MultiSelect<string>
              label="Farms"
              items={[
                { value: ALL_FARMS_VALUE, label: 'All farms' },
                ...FARMS.map((f) => ({ value: f.id, label: f.name })),
              ]}
              value={
                allFarms
                  ? [ALL_FARMS_VALUE, ...FARMS.map((f) => f.id)]
                  : farmIds
              }
              // Collapse the trigger label to a single "All farms" chip when
              // every farm is selected — otherwise the default "N selected"
              // copy hides the fact that the picker is in all-farms mode.
              formatSelected={(selected) => {
                const hasAll = selected.some((o) => o.value === ALL_FARMS_VALUE)
                if (hasAll) return 'All farms'
                const farms = selected.filter(
                  (o) => o.value !== ALL_FARMS_VALUE,
                )
                if (farms.length === 0) return ''
                if (farms.length === 1) return farms[0].label
                return `${farms.length} farms selected`
              }}
              onValueChange={(next) => {
                // Toggling "All farms" snaps the picker to every farm at
                // once; selecting any single farm exits the all-farms mode.
                const includesAll = next.includes(ALL_FARMS_VALUE)
                if (includesAll && !allFarms) {
                  setAllFarms(true)
                  setFarmIds(FARMS.map((f) => f.id))
                  return
                }
                if (!includesAll && allFarms) {
                  setAllFarms(false)
                  setFarmIds([])
                  return
                }
                setAllFarms(false)
                setFarmIds(next.filter((v) => v !== ALL_FARMS_VALUE))
              }}
              placeholder="Pick farms"
            />
          </div>
          {mode === 'issues' && issueSummary ? (
            <p className="rounded-lg bg-bg-tertiary px-4 py-3 text-sm text-text-secondary">
              Includes{' '}
              <span className="font-semibold text-text-primary">
                {issueSummary.records.toLocaleString()}
              </span>{' '}
              {issueSummary.records === 1 ? 'record' : 'records'} with{' '}
              <span className="font-semibold text-text-primary">
                {issueSummary.issues.toLocaleString()}
              </span>{' '}
              {issueSummary.issues === 1 ? 'issue' : 'issues'} flagged for
              review.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Spinner size={28} className="text-text-secondary" />
          <p className="text-md font-medium text-text-primary">
            {phase === 'generating'
              ? 'Generating your Sandy template…'
              : 'Template ready — your download has started.'}
          </p>
          <p className="max-w-[360px] text-sm text-text-secondary">
            {phase === 'generating'
              ? "We're pre-filling your enterprise + farms so the file is ready to import the moment it lands."
              : 'Drop the completed template back into Sandy when you have your data filled in.'}
          </p>
        </div>
      )}
    </Modal>
  )
}
