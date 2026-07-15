"use client";

import { Fragment, type ReactNode, useMemo, useState } from "react";
import {
  ColumnDef,
  SortingState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
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
  renderExpandedRow?: (row: Row<TData>) => ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  /** Tampilkan skeleton loading menggantikan isi tabel. Header & toolbar tetap terlihat. */
  isLoading?: boolean;
  /** Jumlah baris skeleton yang ditampilkan saat loading. Default: pageSize aktif. */
  skeletonRowCount?: number;
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

// ─── Skeleton Primitives ────────────────────────────────────────────────────
//
// Pola width bervariasi (bukan 100% rata semua) supaya kerasa lebih natural,
// mirip teks/data asli — bukan blok kaku yang keliatan "loading generic".
// Deterministic (bukan Math.random) biar gak ada flicker antar re-render.
const SKELETON_WIDTH_PATTERN = [72, 88, 56, 94, 64, 80, 48, 90] as const;

function getSkeletonWidth(rowIndex: number, colIndex: number) {
  const idx = (rowIndex * 3 + colIndex) % SKELETON_WIDTH_PATTERN.length;
  return `${SKELETON_WIDTH_PATTERN[idx]}%`;
}

function SkeletonBar({
  width = "100%",
  height = "h-3.5",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`${height} rounded-full bg-muted/60 animate-pulse`}
      style={{ width, maxWidth: "100%" }}
    />
  );
}

// Desktop: satu <tr> skeleton, satu bar per kolom, width mengikuti pola.
function SkeletonRowDesktop({
  columnCount,
  rowIndex,
}: {
  columnCount: number;
  rowIndex: number;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      {Array.from({ length: columnCount }).map((_, colIndex) => (
        <td key={colIndex} className="px-5 py-3.5 align-middle">
          <SkeletonBar width={getSkeletonWidth(rowIndex, colIndex)} />
        </td>
      ))}
    </tr>
  );
}

// Mobile: satu card skeleton, meniru layout label-kiri / value-kanan aslinya.
function SkeletonCardMobile({
  columnCount,
  rowIndex,
}: {
  columnCount: number;
  rowIndex: number;
}) {
  return (
    <div className="px-4 py-3 flex flex-col gap-2.5">
      {Array.from({ length: columnCount }).map((_, colIndex) => (
        <div key={colIndex} className="flex items-center justify-between gap-3">
          <SkeletonBar width="30%" height="h-3" />
          <div className="flex-1 flex justify-end">
            <SkeletonBar width={getSkeletonWidth(rowIndex, colIndex)} />
          </div>
        </div>
      ))}
    </div>
  );
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
  renderExpandedRow,
  getRowCanExpand,
  isLoading = false,
  skeletonRowCount,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [expanded, setExpanded] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onExpandedChange: setExpanded,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getRowCanExpand,
    state: { sorting, columnSizing, expanded },
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
  const columnCount = columns.length;
  const skeletonCount = skeletonRowCount ?? pageSize;

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
            disabled={isLoading}
            className="
              text-xs font-medium
              border border-border rounded-lg
              px-2.5 py-1.5
              bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-ring
              disabled:opacity-50 disabled:cursor-not-allowed
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
                        "text-muted-foreground select-none whitespace-nowrap relative group",
                        canSort && !isLoading
                          ? "hover:text-foreground transition-colors"
                          : "",
                      ].join(" ")}
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`inline-flex items-center gap-1.5 ${
                            canSort && !isLoading ? "cursor-pointer" : ""
                          }`}
                          onClick={
                            canSort && !isLoading
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
            {isLoading ? (
              Array.from({ length: skeletonCount }).map((_, rowIndex) => (
                <SkeletonRowDesktop
                  key={`skeleton-${rowIndex}`}
                  columnCount={columnCount}
                  rowIndex={rowIndex}
                />
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-5 py-14 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
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
                  {row.getIsExpanded() && renderExpandedRow && (
                    <tr className="border-b border-border bg-muted/15">
                      <td
                        colSpan={row.getVisibleCells().length}
                        className="px-5 py-4"
                      >
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
          {!isLoading && (
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
          )}
        </table>
      </div>

      {/* ── Mobile: Card list per baris (di bawah sm) ───────────────────── */}
      <div className="sm:hidden divide-y divide-border">
        {isLoading ? (
          Array.from({ length: skeletonCount }).map((_, rowIndex) => (
            <SkeletonCardMobile
              key={`skeleton-mobile-${rowIndex}`}
              columnCount={columnCount}
              rowIndex={rowIndex}
            />
          ))
        ) : table.getRowModel().rows.length === 0 ? (
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
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                      {header
                        ? flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        : null}
                    </span>
                    <div className="text-sm text-foreground text-right truncate">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  </div>
                );
              })}
              {row.getIsExpanded() && renderExpandedRow && (
                <div className="mt-2 rounded-xl border border-border bg-muted/20 p-3">
                  {renderExpandedRow(row)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Footer: record info + pagination ────────────────────────────── */}
      {(pageCount > 0 || isLoading) && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 md:py-1 border-t border-border bg-muted/20 flex-wrap">
          {/* Keterangan jumlah data */}
          {isLoading ? (
            <SkeletonBar width="140px" height="h-3" />
          ) : (
            <p className="text-xs text-muted-foreground shrink-0">
              Menampilkan{" "}
              <span className="font-semibold text-foreground">
                {startRow}–{endRow}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-foreground">{totalRows}</span>{" "}
              data
            </p>
          )}

          {/* Tombol pagination */}
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={isLoading || !table.getCanPreviousPage()}
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
              <span>Prev</span>
            </button>

            {isLoading ? (
              <div className="flex items-center gap-1 px-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-[30px] h-[30px] rounded-lg bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <PaginationNumbers
                pageIndex={pageIndex}
                pageCount={pageCount}
                onPageChange={(idx) => table.setPageIndex(idx)}
              />
            )}

            <button
              onClick={() => table.nextPage()}
              disabled={isLoading || !table.getCanNextPage()}
              className="
                flex items-center gap-1 px-2.5 py-1.5
                rounded-lg border border-border
                text-xs text-muted-foreground font-medium
                hover:bg-muted hover:text-foreground
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <span>Next</span>
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
                disabled={isLoading}
                className="
                  text-xs font-medium
                  border border-border rounded-lg
                  px-2.5 py-1.5
                  bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring
                  disabled:opacity-50 disabled:cursor-not-allowed
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
