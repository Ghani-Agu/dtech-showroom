import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowHref?: (row: T) => string
  emptyMessage?: string
  rowKey: (row: T) => string
}

export function DataTable<T>({
  columns,
  rows,
  rowHref,
  emptyMessage = 'No results',
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="bg-admin-surface-raised border border-admin-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-admin-surface-elevated border-b border-admin-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-6 py-4 font-mono text-xs uppercase tracking-wider text-admin-text-muted font-medium',
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-16 text-center font-body text-sm text-admin-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row)

                if (href) {
                  return (
                    <tr
                      key={rowKey(row)}
                      className="hover:bg-admin-surface-elevated transition-colors"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'p-0 font-body text-sm text-admin-text-primary',
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                          )}
                        >
                          <Link
                            href={href}
                            className="block px-6 py-4 hover:no-underline"
                          >
                            {col.render(row)}
                          </Link>
                        </td>
                      ))}
                    </tr>
                  )
                }

                return (
                  <tr
                    key={rowKey(row)}
                    className="hover:bg-admin-surface-elevated transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-6 py-4 font-body text-sm text-admin-text-primary',
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
