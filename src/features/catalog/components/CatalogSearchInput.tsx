import { Search } from 'lucide-react'

import { Input } from '../../../components/ui/input'

type CatalogSearchInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
}

export function CatalogSearchInput({ value, onChange, id = 'catalog-search' }: CatalogSearchInputProps) {
  return (
    <label className="relative block w-full">
      <span className="sr-only">Buscar NFTs por nome, coleção ou descrição</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#CFB28C]" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        className="h-[45px] rounded-[10px] border-[#241612] bg-[#241612] pl-10 text-sm font-bold placeholder:text-[#B39463]"
      />
    </label>
  )
}
