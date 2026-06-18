import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Card,
  DataTable,
  type GridColDef,
  IconList,
  IconMap,
  IconSearch,
  type MapPolygon,
  MapView,
  MultiSelect,
  SegmentedControl,
  SideSheet,
  TextInput,
} from '../../components/ui'
import { getFarm, getField, getFieldsForFarm } from '../../data'
import type { PolygonRing } from '../../types'
import { FieldDetail } from './FieldDetail'
import { FieldShape } from './FieldShape'

type FieldRow = {
  id: string
  name: string
  area: number
  crop: string
  rings: PolygonRing[]
}

type ViewMode = 'list' | 'map'

const isViewMode = (v: string | null): v is ViewMode =>
  v === 'list' || v === 'map'

/**
 * /my-farms/:orgId/:farmId/fields-and-crops — searchable, filterable list of
 * the farm's fields with a list/map toggle. The active view is persisted in
 * the URL (`?view=map`) so back/forward and refresh keep the state. Row +
 * polygon click open the field detail in a 75 vw SideSheet.
 */
export const FarmFieldsAndCrops = () => {
  const { orgId, farmId, fieldId } = useParams<{
    orgId: string
    farmId: string
    fieldId?: string
  }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const farm = farmId ? getFarm(farmId) : undefined
  const fields = useMemo(() => (farm ? getFieldsForFarm(farm.id) : []), [farm])

  const view: ViewMode = isViewMode(searchParams.get('view'))
    ? (searchParams.get('view') as ViewMode)
    : 'list'
  const query = searchParams.get('q') ?? ''
  const cropFilter = searchParams.getAll('crop')

  const setView = (next: ViewMode) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'list') p.delete('view')
        else p.set('view', next)
        return p
      },
      { replace: true },
    )
  }
  const setQuery = (next: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('q', next)
        else p.delete('q')
        return p
      },
      { replace: true },
    )
  }
  const setCropFilter = (next: string[]) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('crop')
        for (const c of next) p.append('crop', c)
        return p
      },
      { replace: true },
    )
  }

  const cropOptions = useMemo(() => {
    const set = new Set<string>()
    for (const f of fields) set.add(f.crop)
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }))
  }, [fields])

  const visibleFields = useMemo(() => {
    const q = query.trim().toLowerCase()
    return fields.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) return false
      if (cropFilter.length > 0 && !cropFilter.includes(f.crop)) return false
      return true
    })
  }, [fields, query, cropFilter])

  const rows = useMemo<FieldRow[]>(
    () =>
      visibleFields.map((field) => ({
        id: field.id,
        name: field.name,
        area: field.area,
        crop: field.crop,
        rings: field.boundary,
      })),
    [visibleFields],
  )

  const columns = useMemo<GridColDef<FieldRow>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Field',
        flex: 2,
        minWidth: 220,
        renderCell: ({ row }) => (
          <span className="flex items-center gap-3">
            <FieldShape rings={row.rings} size={24} />
            <span>{row.name}</span>
          </span>
        ),
      },
      {
        field: 'area',
        headerName: 'Area (ha)',
        type: 'number',
        flex: 1,
        minWidth: 140,
        renderCell: ({ row }) => (
          <span className="tabular-nums">{row.area.toFixed(1)}</span>
        ),
      },
      {
        field: 'crop',
        headerName: 'Crop',
        flex: 2,
        minWidth: 220,
      },
    ],
    [],
  )

  const openField = fieldId && farm ? getField(fieldId) : undefined
  const sheetFarm = openField ? getFarm(openField.farmId) : undefined

  // Preserve the current query string when navigating to/from the field
  // detail so the filters survive opening + closing the SideSheet.
  const closeSheet = () =>
    navigate(
      {
        pathname: `/my-farms/${orgId}/${farmId}/fields-and-crops`,
        search: searchParams.toString(),
      },
      { replace: true },
    )
  const openSheetForField = (id: string) =>
    navigate({
      pathname: `/my-farms/${orgId}/${farmId}/fields-and-crops/${id}`,
      search: searchParams.toString(),
    })

  if (!farm) return null

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="shrink-0">
          <SegmentedControl<ViewMode>
            ariaLabel="Switch view"
            value={view}
            onValueChange={setView}
            options={[
              { value: 'list', label: 'List', leadingIcon: <IconList /> },
              { value: 'map', label: 'Map', leadingIcon: <IconMap /> },
            ]}
          />
        </div>
        <div className="flex-1 min-w-[260px]">
          <TextInput
            placeholder="Search by field name"
            aria-label="Search fields"
            value={query}
            onValueChange={setQuery}
            leadingIcon={<IconSearch />}
          />
        </div>
        <div className="w-[260px]">
          <MultiSelect
            placeholder="All crops"
            aria-label="Filter by crop"
            value={cropFilter}
            onValueChange={setCropFilter}
            items={cropOptions}
            searchable={false}
          />
        </div>
      </div>

      {view === 'list' ? (
        rows.length === 0 ? (
          <Card>
            <p className="text-text-secondary">No fields match your filters.</p>
          </Card>
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            defaultPageSize={20}
            pageSizeOptions={[10, 20, 50]}
            selectable={false}
            onRowClick={({ row }: { row: FieldRow }) =>
              openSheetForField(row.id)
            }
            sx={{
              '& .MuiDataGrid-row': { cursor: 'pointer' },
            }}
          />
        )
      ) : (
        <div className="h-[calc(100vh-260px)] min-h-[400px]">
          <MapView
            height="100%"
            polygons={visibleFields.map<MapPolygon>((f) => ({
              id: f.id,
              name: f.name,
              rings: f.boundary,
            }))}
            selected={openField ? [openField.id] : []}
            onSelectPolygon={(id) => openSheetForField(id)}
          />
        </div>
      )}

      <SideSheet
        open={!!openField}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        eyebrow={sheetFarm ? sheetFarm.name : undefined}
        title={openField?.name ?? ''}
      >
        {openField ? (
          <FieldDetail field={openField} farmName={sheetFarm?.name} />
        ) : null}
      </SideSheet>
    </div>
  )
}
