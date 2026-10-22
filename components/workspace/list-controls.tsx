"use client"

import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface ListFilterOption { value: string; label: string }

export function ListControls({ search, onSearchChange, placeholder, filter, onFilterChange, filterOptions, page, pageCount, total, onPageChange }: {
  search: string; onSearchChange: (value: string) => void; placeholder: string
  filter?: string; onFilterChange?: (value: string) => void; filterOptions?: ListFilterOption[]
  page: number; pageCount: number; total: number; onPageChange: (page: number) => void
}) {
  const start = total ? (page - 1) * 10 + 1 : 0
  const end = Math.min(page * 10, total)
  return <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="h-9 pl-9" placeholder={placeholder} value={search} onChange={(event) => onSearchChange(event.target.value)} aria-label={placeholder}/></div>
      {filterOptions && onFilterChange && <Select value={filter} onValueChange={onFilterChange}><SelectTrigger className="h-9 w-full sm:w-48"><SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground"/><SelectValue placeholder="Filtrar lista"/></SelectTrigger><SelectContent>{filterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>}
    </div>
    <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="whitespace-nowrap text-xs text-muted-foreground">{start}–{end} de {total}</span><div className="flex gap-1"><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-4 w-4"/></Button><Button variant="outline" size="icon" className="h-8 w-8" aria-label="Página seguinte" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-4 w-4"/></Button></div></div>
  </div>
}

export function useListPage<T>(items: T[], pageSize = 10) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  return { pageCount, slice: (page: number) => items.slice((page - 1) * pageSize, page * pageSize) }
}
