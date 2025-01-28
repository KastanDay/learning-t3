import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Table,
  Text,
  ScrollArea,
  UnstyledButton,
  Group,
  Center,
} from '@mantine/core'
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from '@tabler/icons-react'
import { type DocumentStatus } from '~/utils/apiUtils'

interface MetadataResultsTableProps {
  data: DocumentStatus[]
  isLoading: boolean
  documentNames: Record<number, string>
}

const columnHelper = createColumnHelper<DocumentStatus>()

export function MetadataResultsTable({
  data,
  isLoading,
  documentNames,
}: MetadataResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    columnHelper.accessor('id', {
      header: 'Document',
      cell: (info) => documentNames[info.getValue()] || info.getValue(),
    }),
    columnHelper.accessor('metadata_status', {
      header: 'Status',
      cell: (info) => (
        <Text
          color={
            info.getValue() === 'completed'
              ? 'teal'
              : info.getValue() === 'failed'
                ? 'red'
                : 'yellow'
          }
        >
          {info.getValue().toUpperCase()}
        </Text>
      ),
    }),
    columnHelper.accessor('last_error', {
      header: 'Error',
      cell: (info) =>
        info.getValue() ? (
          <Text color="red" size="sm">
            {info.getValue()}
          </Text>
        ) : null,
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <ScrollArea>
      <Table verticalSpacing="sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                return (
                  <th key={header.id}>
                    {canSort ? (
                      <UnstyledButton
                        onClick={header.column.getToggleSortingHandler()}
                        className="w-full"
                      >
                        <Group position="apart">
                          <Text className="text-white/90">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Text>
                          <Center className="text-white/60">
                            {header.column.getIsSorted() === 'desc' ? (
                              <IconChevronDown size={16} />
                            ) : header.column.getIsSorted() === 'asc' ? (
                              <IconChevronUp size={16} />
                            ) : (
                              <IconSelector size={16} />
                            )}
                          </Center>
                        </Group>
                      </UnstyledButton>
                    ) : (
                      <Text className="text-white/90">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </Text>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length}>
                <Text color="dimmed" align="center">
                  Loading...
                </Text>
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <Text color="dimmed" align="center">
                  No results
                </Text>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="text-white/80">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </ScrollArea>
  )
}
