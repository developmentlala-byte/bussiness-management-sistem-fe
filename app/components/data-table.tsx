"use client";

import { useMemo, useState } from "react";
import {
  ColumnDef,
  SortingState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  CaretUp,
  CaretDown,
  CaretUpDown,
  ArrowLeft,
  ArrowRight,
} from "@phosphor-icons/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  caption?: string;
  emptyMessage?: string;
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ state }: { state: "asc" | "desc" | false }) {
  if (state === "asc")
    return (
      <CaretUp weight="bold" className="shrink-0 size-3 text-foreground" />
    );
  if (state === "desc")
    return (
      <CaretDown weight="bold" className="shrink-0 size-3 text-foreground" />
    );
  return <CaretUpDown className="shrink-0 size-3 text-muted-foreground/40" />;
}

// ─── Pagination Numbers ───────────────────────────────────────────────────────

function PaginationNumbers({
  pageIndex,
  pageCount,
  onPageChange,
}: {
  pageIndex: number;
  pageCount: number;
  onPageChange: (idx: number) => void;
}) {
  const pages = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const result: (number | "…")[] = [];
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    result.push(0);
    if (start > 1) result.push("…");
    for (let i = start; i <= end; i++) result.push(i);
    if (end < pageCount - 2) result.push("…");
    result.push(pageCount - 1);
    return result;
  }, [pageIndex, pageCount]);

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-1 text-xs text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={[
              "min-w-[30px] h-[30px] px-1 rounded-lg text-xs font-medium transition-colors",
              p === pageIndex
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {(p as number) + 1}
          </button>
        ),
      )}
    </div>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  caption,
  emptyMessage = "Tidak ada data yang ditampilkan.",
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    state: { sorting, columnSizing },
    initialState: { pagination: { pageSize } },
  });

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    table.setPageSize(newSize);
    table.setPageIndex(0);
  }

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const totalRows = data.length;
  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Ambil header group untuk label di mobile card
  const headerGroup = table.getHeaderGroups()[0];

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Toolbar (selalu di atas, sekali saja) ───────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border md:hidden">
        {caption ? (
          <p className="text-sm font-semibold text-foreground">{caption}</p>
        ) : (
          <span />
        )}
        <label className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="
              text-xs font-medium
              border border-border rounded-lg
              px-2.5 py-1.5
              bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-ring
              cursor-pointer
            "
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} data
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Desktop: Table biasa (sm ke atas) ───────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table
          className="w-full text-sm"
          style={{ minWidth: table.getTotalSize() }}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-muted/35">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={[
                        "px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider",
                        "text-muted-foreground select-none whitespace-nowrap relative group", // Tambahkan group untuk hover state resizer
                        canSort
                          ? "hover:text-foreground transition-colors"
                          : "",
                      ].join(" ")}
                      style={{ width: header.getSize() }}
                    >
                      <div
                        className="flex items-center justify-between gap-2"
                        // Pindahkan aksi sort ke div teks, bukan seluruh sel agar tidak konflik dengan resizer
                      >
                        <div
                          className={`inline-flex items-center gap-1.5 ${canSort ? "cursor-pointer" : ""}`}
                          onClick={
                            canSort
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && <SortIcon state={sortState} />}
                        </div>

                        {header.isPlaceholder ? null : (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`absolute right-0 top-0 h-full w-1.5 select-none touch-none cursor-col-resize z-10
                              ${
                                header.column.getIsResizing()
                                  ? "bg-foreground/50"
                                  : "bg-transparent group-hover:bg-border"
                              } transition-colors`}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-14 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-5 py-3.5 text-sm text-foreground align-middle"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
          <tfoot>
            {table.getFooterGroups().length > 0 &&
              table.getFooterGroups().map((footerGroup) => (
                <tr
                  key={footerGroup.id}
                  className="border-t border-border bg-muted/40"
                >
                  {footerGroup.headers.map((header) => (
                    <td
                      key={header.id}
                      className="px-5 py-4 text-xs align-middle"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.footer,
                            header.getContext(),
                          )}
                    </td>
                  ))}
                </tr>
              ))}
          </tfoot>
        </table>
      </div>

      {/* ── Mobile: Card list per baris (di bawah sm) ───────────────────── */}
      <div className="sm:hidden divide-y divide-border">
        {table.getRowModel().rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="px-4 py-3 flex flex-col gap-2 hover:bg-muted/40 transition-colors"
            >
              {row.getVisibleCells().map((cell, idx) => {
                const header = headerGroup?.headers[idx];
                return (
                  <div
                    key={cell.id}
                    className="flex items-center justify-between gap-3 min-h-[22px]"
                  >
                    {/* Label kolom */}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                      {header
                        ? flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        : null}
                    </span>
                    {/* Nilai */}
                    <div className="text-sm text-foreground text-right truncate">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ── Footer: record info + pagination ────────────────────────────── */}
      {pageCount > 0 && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 md:py-1 border-t border-border bg-muted/20 flex-wrap">
          {/* Keterangan jumlah data */}
          <p className="text-xs text-muted-foreground shrink-0">
            Menampilkan{" "}
            <span className="font-semibold text-foreground">
              {startRow}–{endRow}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-foreground">{totalRows}</span>{" "}
            data
          </p>

          {/* Tombol pagination */}
          <div className="flex items-center justify-center  gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="
                flex items-center gap-1 px-2.5 py-1.5
                rounded-lg border border-border
                text-xs text-muted-foreground font-medium
                hover:bg-muted hover:text-foreground
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <ArrowLeft className="size-3" />
              <span className="">Prev</span>
            </button>

            <PaginationNumbers
              pageIndex={pageIndex}
              pageCount={pageCount}
              onPageChange={(idx) => table.setPageIndex(idx)}
            />

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="
                flex items-center gap-1 px-2.5 py-1.5
                rounded-lg border border-border
                text-xs text-muted-foreground font-medium
                hover:bg-muted hover:text-foreground
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <span className="">Next</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
          {/* ── Toolbar Desktop ───────────────────────── */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 max-sm:hidden">
            {caption ? (
              <p className="text-sm font-semibold text-foreground">{caption}</p>
            ) : (
              <span />
            )}
            <label className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">Tampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="
              text-xs font-medium
              border border-border rounded-lg
              px-2.5 py-1.5
              bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-ring
              cursor-pointer
            "
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} data
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
