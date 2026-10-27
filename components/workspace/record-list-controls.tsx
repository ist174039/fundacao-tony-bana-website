'use client'
import { ListControls } from '@/components/workspace/list-controls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
export interface SortOption { value: string; label: string }
export interface RecordListControlsProps {
  search: string; onSearchChange: (value: string) => void; placeholder: string
  filter: string; onFilterChange: (value: string) => void; filterOptions: Array<{ value: string; label: string }>
  sort: string; onSortChange: (value: string) => void; sortOptions: SortOption[]
  page: number; pageCount: number; total: number; onPageChange: (value: number) => void
}
/** Shared standard: search + status filter + ordering + page navigation. */
export function RecordListControls(props: RecordListControlsProps) {
  return <div className='flex flex-col gap-2'>
    <ListControls search={props.search} onSearchChange={props.onSearchChange} placeholder={props.placeholder}
      filter={props.filter} onFilterChange={props.onFilterChange} filterOptions={props.filterOptions}
      page={props.page} pageCount={props.pageCount} total={props.total} onPageChange={props.onPageChange}/>
    <div className='flex justify-end px-4 pb-3 sm:px-6'>
      <Select value={props.sort} onValueChange={props.onSortChange}>
        <SelectTrigger className='h-9 w-full sm:w-60' aria-label='Ordenar resultados'><SelectValue placeholder='Ordenar'/></SelectTrigger>
        <SelectContent>{props.sortOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </div>
}
