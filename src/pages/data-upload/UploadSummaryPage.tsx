import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/shell/AppShell'
import {
  Button,
  Card,
  DataTable,
  type GridColDef,
  IconDownload,
  IconFile,
} from '../../components/ui'
import { ActionCell } from './ActionCell'
import {
  type ChangeRow,
  type FileFormat,
  getUploadEntry,
  type ParseMethod,
  type UploadFile,
} from './upload-history'

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const formatNumber = (n: number): string => n.toLocaleString()

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FILE_FORMAT_LABEL: Record<FileFormat, string> = {
  csv: 'CSV',
  excel: 'Excel',
  'excel-template': 'Sandy template',
  pdf: 'PDF',
}

const PARSE_METHOD_LABEL: Record<ParseMethod, string> = {
  'sheet-detection': 'Sheet detection',
  'sandy-template': 'Sandy import template',
  'column-mapping': 'Column mapping',
  'pdf-extraction': 'PDF extraction',
}

/* -------------------------------------------------------------------------- */
/* Columns — mirrors the Refine-data table presentation                        */
/* -------------------------------------------------------------------------- */

const CHANGE_COLUMNS: GridColDef<ChangeRow>[] = [
  {
    field: 'record',
    headerName: 'Record',
    flex: 1.4,
    minWidth: 200,
  },
  {
    field: 'action',
    headerName: 'Action',
    flex: 0.6,
    minWidth: 100,
    sortable: true,
    renderCell: ({ row }) => <ActionCell action={row.action} />,
  },
  {
    field: 'entity',
    headerName: 'Entity',
    flex: 0.9,
    minWidth: 140,
  },
  {
    field: 'farm',
    headerName: 'Farm',
    flex: 0.9,
    minWidth: 140,
  },
  {
    field: 'detail',
    headerName: 'Detail',
    flex: 1.6,
    minWidth: 220,
  },
]

const FILE_COLUMNS: GridColDef<UploadFile>[] = [
  {
    field: 'filename',
    headerName: 'File',
    flex: 1.4,
    minWidth: 240,
    renderCell: ({ row }) => (
      <span className="flex items-center gap-2 h-full">
        <span className="text-icon-secondary">
          <IconFile size={18} />
        </span>
        <span className="text-md text-text-primary">{row.filename}</span>
      </span>
    ),
  },
  {
    field: 'format',
    headerName: 'Type',
    flex: 0.7,
    minWidth: 120,
    renderCell: ({ row }) => FILE_FORMAT_LABEL[row.format],
  },
  {
    field: 'parsedAs',
    headerName: 'Parsed as',
    flex: 1,
    minWidth: 180,
    renderCell: ({ row }) => PARSE_METHOD_LABEL[row.parsedAs],
  },
  {
    field: 'sizeBytes',
    headerName: 'Size',
    type: 'number',
    flex: 0.5,
    minWidth: 90,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{formatSize(row.sizeBytes)}</span>
    ),
  },
  {
    field: 'downloadUrl',
    headerName: '',
    flex: 0.5,
    minWidth: 120,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => (
      <a
        href={row.downloadUrl}
        download={row.filename}
        className="inline-flex items-center gap-1 text-sm font-semibold text-text-brand-dark rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
      >
        <IconDownload size={14} />
        Download
      </a>
    ),
  },
]

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * /data-upload/past/:uploadId — change summary for a single upload
 * transaction. The changes table reuses the Refine-data presentation
 * (DataTable + sticky Record / Action columns, ActionCell badges) so it
 * reads as the same surface, just frozen in time.
 */
export const UploadSummaryPage = () => {
  const { uploadId } = useParams<{ uploadId: string }>()
  const entry = useMemo(
    () => (uploadId ? getUploadEntry(uploadId) : undefined),
    [uploadId],
  )

  if (!entry) {
    return (
      <AppShell
        header={{
          title: 'Upload not found',
          showBack: true,
          backTo: '/data-upload/past',
        }}
      >
        <Card>
          <p className="text-md text-text-secondary">
            We couldn't find an upload with that id. It may have been reverted,
            or the link is out of date.
          </p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      header={{
        title: entry.title,
        showBack: true,
        backTo: '/data-upload/past',
        actions: (
          <Button variant="primary" to="/data-upload">
            Start a new upload
          </Button>
        ),
      }}
    >
      <Card>
        <div className="flex flex-col gap-3">
          <p className="text-md text-text-primary">{entry.summary}</p>
          <p className="text-sm text-text-secondary">
            {formatDateTime(entry.committedAt)} · {entry.committedBy} ·{' '}
            {formatNumber(entry.records)} records · {entry.files}{' '}
            {entry.files === 1 ? 'file' : 'files'}
          </p>
        </div>
      </Card>

      <h2 className="text-lg font-semibold text-text-primary mt-6">
        Uploaded files
      </h2>
      <div className="mt-2">
        <DataTable
          rows={entry.sourceFiles}
          columns={FILE_COLUMNS}
          defaultPageSize={10}
          pageSizeOptions={[10, 20]}
          selectable={false}
        />
      </div>

      <h2 className="text-lg font-semibold text-text-primary mt-6">Changes</h2>
      {/* Sticky-left styles for the Record + Action columns — matches the
          Refine-data table so the two surfaces feel identical. */}
      <style>{`
        .changes-grid .MuiDataGrid-cell[data-field='record'],
        .changes-grid .MuiDataGrid-cell[data-field='action'],
        .changes-grid .MuiDataGrid-columnHeader[data-field='record'],
        .changes-grid .MuiDataGrid-columnHeader[data-field='action'] {
          position: sticky;
          background-color: var(--color-bg-primary);
          z-index: 3;
        }
        .changes-grid .MuiDataGrid-cell[data-field='record'],
        .changes-grid .MuiDataGrid-columnHeader[data-field='record'] {
          left: 0;
        }
        .changes-grid .MuiDataGrid-cell[data-field='action'],
        .changes-grid .MuiDataGrid-columnHeader[data-field='action'] {
          left: 200px;
          box-shadow: 2px 0 0 var(--color-border-tertiary);
        }
        .changes-grid .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='record'],
        .changes-grid .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='action'] {
          background-color: var(--color-bg-secondary);
        }
      `}</style>
      <div className="changes-grid mt-4">
        <DataTable
          rows={entry.changes}
          columns={CHANGE_COLUMNS}
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50]}
          selectable={false}
        />
      </div>
    </AppShell>
  )
}
