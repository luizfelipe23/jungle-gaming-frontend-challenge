import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '../../../components/ui/button'

type CatalogPaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function CatalogPagination({ page, pageCount, onPageChange }: CatalogPaginationProps) {
  if (pageCount < 2) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center justify-center gap-2 pt-2">
      <Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="h-9 w-9 px-0">
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </Button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
        <Button
          key={pageNumber}
          type="button"
          variant={pageNumber === page ? 'default' : 'outline'}
          size="sm"
          aria-label={`Página ${pageNumber}`}
          aria-current={pageNumber === page ? 'page' : undefined}
          onClick={() => onPageChange(pageNumber)}
          className="h-9 min-w-9 px-2"
        >
          {pageNumber}
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" aria-label="Próxima página" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="h-9 w-9 px-0">
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Button>
    </nav>
  )
}
