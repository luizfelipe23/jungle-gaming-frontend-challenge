import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { Card } from '../../../components/ui/card'
import { useNfts } from '../../catalog/hooks/useNfts'

export function AuthCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  const { data = [] } = useNfts()
  return <>
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-[69px] z-0 hidden h-[calc(100vh-69px)] overflow-hidden lg:block">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid h-[410px] grid-cols-2 items-center gap-10"><div className="pl-9"><p className="text-sm text-[#CFB28C]">Bem-vindo à Kurio</p><p className="mt-4 text-4xl font-bold uppercase leading-[1.6]">Seja dono do futuro<br/>da arte digital</p><p className="mt-3 max-w-[420px] text-sm leading-6 text-[#CFB28C]">Descubra NFTs selecionados de criadores e colecione arte digital verificada.</p><span className="mt-7 inline-block rounded bg-[#D28A4C] px-6 py-3 text-sm font-bold text-[#140D0A]">EXPLORAR</span></div>{data[0]?.imageUrl && <img src={data[0].imageUrl} alt="" className="ml-auto h-[330px] w-[420px] rounded-2xl object-cover"/>}</div>
        <div className="grid grid-cols-[260px_1fr] gap-8"><div className="h-[640px] bg-[#241612] p-5 text-sm text-[#CFB28C]">Coleções{['Arte digital','Fotografia','Música','Arte 3D','Colecionáveis','Generativa','Jogos','Assinaturas','Utilidade'].map((item) => <p key={item} className="mt-5">{item}</p>)}</div><div className="grid grid-cols-3 gap-5">{data.slice(0, 9).map((nft) => <div key={nft.id} className="bg-[#241612] p-2"><img src={nft.imageUrl} alt="" className="aspect-square w-full rounded-xl object-cover"/><p className="mt-2 text-sm">{nft.name}</p><p className="text-sm text-[#E89B55]">{nft.price} {nft.currency}</p></div>)}</div></div>
      </div>
    </div>
    <section className="relative z-10 mx-auto min-h-[100dvh] w-full max-w-md rounded-[40px] bg-[#140D0A] px-7 pb-8 pt-[132px] lg:min-h-0 lg:max-w-[466px] lg:rounded-none lg:bg-transparent lg:p-0" aria-labelledby="auth-title">
      <div className="hidden">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">{eyebrow}</p>
      <h1 id="auth-title" className="text-2xl font-bold text-[#F5F1EB] sm:text-3xl">{title}</h1>
      <p className="text-xs leading-5 text-[#CFB28C]">{description}</p>
    </div>
      <div className="mb-10 flex flex-col items-center gap-[80px] text-center lg:hidden"><span className="text-[32px] font-bold tracking-[0.1em] text-[#F5F1EB]">KURIO</span><h1 id="auth-title" className="text-[18px] font-bold">{title}</h1></div>
      <Card className="border-0 bg-transparent p-0 shadow-none lg:relative lg:rounded-md lg:bg-[#241612] lg:px-[75px] lg:pb-[60px] lg:pt-10 lg:shadow-none lg:after:absolute lg:after:bottom-0 lg:after:left-0 lg:after:h-[9px] lg:after:w-full lg:after:bg-[#D28A4C]">
        <Link to="/" aria-label="Fechar" className="absolute right-4 top-3 hidden text-xl text-[#D28A4C] lg:block">×</Link>
        <nav className="mb-7 hidden justify-center gap-2 text-xl font-bold lg:flex"><Link to="/login" className="text-[#F5F1EB]">Entrar</Link><span className="text-[#D28A4C]">|</span><Link to="/register" className="text-[#D28A4C]">Criar conta</Link></nav>
        <p className="mb-6 hidden text-center text-xs leading-4 text-[#CFB28C] lg:block">{description}</p>
        {children}
        <div className="mt-5 hidden text-center text-xs text-[#CFB28C] lg:block"><span className="bg-[#241612] px-3">Ou continue com</span></div>
        <button type="button" className="mt-3 hidden h-10 w-full rounded border border-[#55321F] text-xs text-[#CFB28C] lg:block">🌐 &nbsp; Continuar com Google</button>
        <button type="button" className="mt-3 hidden h-10 w-full rounded border border-[#55321F] text-xs text-[#CFB28C] lg:block">f &nbsp; Continuar com Facebook</button>
        <div className="mt-10 flex items-center gap-2 text-xs text-[#F5F1EB] lg:hidden lg:mt-5"><span className="h-px flex-1 bg-[#3F2319]"/><span>Ou continue com</span><span className="h-px flex-1 bg-[#3F2319]"/></div>
        <button type="button" className="mt-3 h-10 w-full rounded-[6px] border border-[#3F2319] text-sm text-[#CFB28C] lg:hidden"><strong className="mr-2 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 bg-clip-text text-base text-transparent">G</strong>Continuar com Google</button>
        <button type="button" className="mt-3 h-10 w-full rounded-[6px] border border-[#3F2319] text-sm text-[#CFB28C] lg:hidden"><strong className="mr-2 text-lg text-[#4267B2]">f</strong>Continuar com Facebook</button>
        <div className="mt-10 space-y-3 text-center text-sm text-[#B39463] lg:hidden">{title === 'Entrar' ? <p>Novo na Kurio? <Link to="/register" className="text-[#B39463]">Crie uma conta</Link></p> : <p>Já tem uma conta? <Link to="/login" className="text-[#B39463]">Entre</Link></p>}</div>
      </Card>
    </section>
  </>
}
