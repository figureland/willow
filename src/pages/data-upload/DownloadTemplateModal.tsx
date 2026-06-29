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
}

export const DownloadTemplateModal = ({
  open,
  onClose,
}: DownloadTemplateModalProps) => {
  const [enterprise, setEnterprise] = useState<string | null>(null)
  const [farmIds, setFarmIds] = useState<string[]>([])
  const [allFarms, setAllFarms] = useState(false)
  const [phase, setPhase] = useState<'pick' | 'generating' | 'done'>('pick')

  // Reset to a clean state every time the modal opens so a previous session
  // doesn't bleed forward. Default to "all farms" — most exports want a
  // template that covers the whole organisation, so the user can just pick
  // an enterprise and hit Download without touching the farm picker.
  useEffect(() => {
    if (!open) return
    setEnterprise(null)
    setFarmIds(FARMS.map((f) => f.id))
    setAllFarms(true)
    setPhase('pick')
  }, [open])

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

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && phase !== 'generating') onClose()
      }}
      title="Download a Sandy template"
      description="Pick an enterprise and the farms you want covered — we'll generate a template ready to import."
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
