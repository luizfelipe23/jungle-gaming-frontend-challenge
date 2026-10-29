import { useRouterState } from '@tanstack/react-router'

const footerColumns = [
  { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  { title: 'Central de ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
  { title: 'Coleções', links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] },
]

const benefits = [
  { mark: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { mark: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { mark: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

export function Footer() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hideDesktopFooter = pathname === '/profile' || pathname === '/wallets' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/orders/')

  return (
    <>
      {!hideDesktopFooter && <footer id="rodape" className="mx-auto hidden max-w-[1200px] bg-[#241612] lg:block">
        <div className="grid grid-cols-4 px-8 pb-4 pt-8">
          {benefits.map((benefit, index) => <section key={benefit.mark} className={`px-4 ${index > 0 ? 'border-l border-[#D28A4C]/70' : ''}`}>
            <span aria-hidden="true" className="mb-3 flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[#D28A4C] text-2xl font-bold text-[#140D0A]">{benefit.mark}</span>
            <h2 className="mb-2 text-[17px] font-bold leading-5 text-[#F5F1EB]">{benefit.title}</h2>
            <p className="max-w-[230px] text-[13px] leading-[22px] text-[#CFB28C]">{benefit.text}</p>
          </section>)}
          <section className="border-l border-[#D28A4C]/70 px-4">
            <h2 className="mb-3 text-[17px] font-bold leading-[18px] text-[#F5F1EB]">Antecipe-se ao próximo lançamento</h2>
            <form className="flex h-10 overflow-hidden rounded-md bg-[#3A2114]" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="footer-email-desktop">Seu e-mail</label>
              <input id="footer-email-desktop" type="email" placeholder="digite seu e-mail..." className="min-w-0 flex-1 bg-transparent px-3 text-xs text-[#F5F1EB] outline-none placeholder:text-[#B39483]" />
              <button type="submit" className="bg-[#D28A4C] px-4 font-bold text-[#140D0A]">Enviar</button>
            </form>
            <p className="mt-3 text-[12px] leading-5 text-[#CFB28C]">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          </section>
        </div>

        <div className="grid grid-cols-4 items-center gap-5 bg-[#3A2114] px-8 py-5 text-[14px] text-[#F5F1EB]">
          <a href="#inicio" className="font-bold tracking-[0.12em]">KURIO</a>
          <p className="max-w-[230px] leading-6">Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com">contato@email.com</a>
          <a href="tel:+551140028922">+55 11 4002 8922</a>
        </div>

        <div className="grid grid-cols-4 gap-8 px-8 py-7">
          {footerColumns.map((column) => <section key={column.title}>
            <h2 className="mb-2 text-[16px] font-bold text-[#F5F1EB]">{column.title}</h2>
            <ul className="space-y-2 text-[13px] leading-5 text-[#F5F1EB]">
              {column.links.map((label) => <li key={label}><a href="#" className="hover:text-[#E89B55]">{label}</a></li>)}
            </ul>
          </section>)}
          <section>
            <h2 className="mb-3 text-[16px] font-bold text-[#F5F1EB]">Redes sociais</h2>
            <div className="flex gap-2 text-[#E89B55]" aria-label="Redes sociais">
              {['f', '◎', '♥', 'in', '▶'].map((symbol, index) => <a key={index} href="#" aria-label={`Rede social ${index + 1}`} className="flex h-8 w-8 items-center justify-center rounded border border-[#D28A4C] font-bold">{symbol}</a>)}
            </div>
            <h2 className="mb-2 mt-6 text-[15px] font-bold text-[#F5F1EB]">Carteiras compatíveis</h2>
            <div className="rounded border border-[#55321F] bg-[#3A2114] px-2 py-1 text-center text-[8px] font-bold text-[#D28A4C]">METAMASK&nbsp; • &nbsp;WALLETCONNECT&nbsp; • &nbsp;COINBASE</div>
          </section>
        </div>
        <p className="pb-5 text-center text-[12px] tracking-wide text-[#F5F1EB]">© 2026 Kurio. Propriedade digital para todos.</p>
      </footer>}

      <footer id="rodape-mobile" className="border-t border-[#3F2319] bg-[#140D0A] lg:hidden">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <a href="#inicio" className="text-lg font-bold tracking-[0.12em] text-[#F5F1EB]">KURIO<span className="text-[#D28A4C]">.</span></a>
            <p className="mt-2 max-w-sm text-xs leading-6 text-[#CFB28C]">Arte digital selecionada para quem coleciona o que vem pela frente.</p>
          </div>
          <p className="text-[10px] text-[#B39483]">© 2026 KURIO. Propriedade digital para todos.</p>
        </div>
      </footer>
    </>
  )
}
