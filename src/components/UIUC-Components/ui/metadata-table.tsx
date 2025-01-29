'use client'

import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  TableMeta,
} from '@tanstack/react-table'
import { IconCopy } from '@tabler/icons-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

export type MetadataField = {
  document_id: number
  document_name: string
  field_name: string
  field_value: any
  confidence_score: number | null
  extraction_method: string | null
}

interface MetadataTableMeta {
  onViewJson?: (data: any) => void
}

export const columns: ColumnDef<MetadataField>[] = [
  {
    accessorKey: 'document_name',
    header: 'Document',
  },
  {
    accessorKey: 'field_name',
    header: 'Field',
  },
  {
    accessorKey: 'field_value',
    header: 'Value',
    cell: ({ row, table }) => {
      const value = row.getValue('field_value')
      const meta = table.options.meta as MetadataTableMeta
      return (
        <div
          className="flex cursor-pointer items-center gap-1 text-white/80 hover:text-white"
          onClick={() => {
            if (meta?.onViewJson) {
              meta.onViewJson(value)
            }
          }}
        >
          View JSON
          <IconCopy size={14} className="text-white/60" />
        </div>
      )
    },
  },
  {
    accessorKey: 'confidence_score',
    header: 'Confidence',
    cell: ({ row }) => {
      const score = row.getValue('confidence_score') as number | null
      return score !== null ? `${Math.round(score * 100)}%` : '-'
    },
  },
  {
    accessorKey: 'extraction_method',
    header: 'Method',
    cell: ({ row }) => {
      const method = row.getValue('extraction_method') as string | null
      return method || '-'
    },
  },
]

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onViewJson?: (data: any) => void
}

export function MetadataTable<TData, TValue>({
  columns,
  data,
  onViewJson,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      onViewJson,
    } as MetadataTableMeta,
  })

  return (
    <div className="overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
