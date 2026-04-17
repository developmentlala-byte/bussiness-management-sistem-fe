"use client";

import { useMemo, useState } from "react";
import { Table, Pagination, SortDescriptor, cn } from "@heroui/react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CaretUp } from "@phosphor-icons/react";

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  pageSize?: number;
}

// Helper untuk menjembatani format Sorting TanStack <-> HeroUI
function toSortDescriptor(sorting: SortingState): SortDescriptor | undefined {
  const first = sorting[0];
  if (!first) return undefined;
  return {
    column: first.id,
    direction: first.desc ? "descending" : "ascending",
  };
}

function toSortingState(descriptor: SortDescriptor): SortingState {
  return [
    {
      id: descriptor.column as string,
      desc: descriptor.direction === "descending",
    },
  ];
}

// Komponen Header agar ada Icon Sort Arrow
function SortableHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between gap-2">
      {children}
      {sortDirection && (
        <CaretUp
          weight="bold" // Gunakan bold agar lebih terbaca di ukuran kecil
          className={cn(
            "size-3 transform transition-transform duration-100 ease-out text-muted-foreground",
            sortDirection === "descending" ? "rotate-180" : "",
          )}
        />
      )}
    </span>
  );
}

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize } },
  });

  const sortDescriptor = useMemo(() => toSortDescriptor(sorting), [sorting]);
  const { pageIndex } = table.getState().pagination;

  return (
    <Table className="w-full">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Data Table"
          sortDescriptor={sortDescriptor}
          onSortChange={(d) => setSorting(toSortingState(d))}
          className="min-w-[800px]"
        >
          {/* HEADER */}
          <Table.Header>
            {table.getHeaderGroups()[0].headers.map((header) => (
              <Table.Column
                key={header.id}
                id={header.id}
                allowsSorting={header.column.getCanSort()}
              >
                {({ sortDirection }) => (
                  <SortableHeader sortDirection={sortDirection}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </SortableHeader>
                )}
              </Table.Column>
            ))}
          </Table.Header>

          {/* BODY */}
          <Table.Body>
            {table.getRowModel().rows.map((row) => (
              <Table.Row key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      {/* FOOTER (PAGINATION) */}
      <Table.Footer>
        <div className="flex w-full justify-between items-center">
          <span className="text-sm text-muted-foreground w-full">
            Total {data.length} records
          </span>
          <Pagination
            size="sm"
            page={pageIndex + 1}
            total={table.getPageCount()}
            onChange={(p) => table.setPageIndex(p - 1)}
          />
        </div>
      </Table.Footer>
    </Table>
  );
}
