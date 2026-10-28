export function Footer() {
  return (
    <footer id="rodape" className="border-t border-[#3F2319] bg-[#140D0A]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-0">
        <div>
          <a href="#inicio" className="text-lg font-bold tracking-[0.12em] text-[#F5F1EB]">KURIO<span className="text-[#D28A4C]">.</span></a>
          <p className="mt-2 max-w-sm text-xs leading-6 text-[#CFB28C]">Arte digital selecionada para quem coleciona o que vem pela frente.</p>
        </div>
        <p className="text-[10px] text-[#B39483]">© 2026 KURIO. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
