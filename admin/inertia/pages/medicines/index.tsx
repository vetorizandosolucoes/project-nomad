import { Head, Link } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle, IconPill, IconSearch } from '@tabler/icons-react'
import AppLayout from '~/layouts/AppLayout'
import classNames from '~/lib/classNames'
import {
  isCombination,
  tarjaLabel,
  type BrMedicine,
  type SubstanceGroup,
} from '../../../app/utils/br_medicines'

type Situation = { slug: string; label: string; category: string }
type Info = { version: string; total: number; soldColumn: string }

const PRODUCT_TYPES = ['Genérico', 'Similar', 'Novo', 'Específico', 'Biológico', 'Fitoterápico']

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function formatDate(isoDate: string) {
  return isoDate.split('-').reverse().join('/')
}

function SearchResults({ query, type }: { query: string; type: string }) {
  const [debounced, setDebounced] = useState(query)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['medicines', debounced, type],
    enabled: debounced.trim().length > 1,
    queryFn: () =>
      getJson<{ results: BrMedicine[]; total: number }>(
        `/api/medicamentos/search?q=${encodeURIComponent(debounced)}&type=${encodeURIComponent(type)}`
      ),
  })

  if (debounced.trim().length < 2) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        Digite o nome comercial, o princípio ativo ou o laboratório. Exemplo: dipirona, Advil,
        antialérgico.
      </p>
    )
  }
  if (isLoading) return <p className="py-8 text-center text-sm text-text-muted">Pesquisando...</p>
  if (isError) {
    return <p className="py-8 text-center text-sm text-desert-red">Não foi possível pesquisar.</p>
  }
  if (!data || data.total === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        Nenhum medicamento comercializado encontrado para “{debounced}”.
      </p>
    )
  }

  return (
    <>
      <p className="mb-3 text-sm text-text-muted">
        {data.total.toLocaleString('pt-BR')} {data.total === 1 ? 'resultado' : 'resultados'}
        {data.total > data.results.length && `, mostrando os ${data.results.length} primeiros`}
      </p>
      <ul className="space-y-2">
        {data.results.map((medicine) => (
          <li key={medicine.id}>
            <Link
              href={`/medicamentos/${medicine.id}`}
              className="block rounded-lg border border-border-subtle bg-surface-primary p-4 transition hover:border-desert-green"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-text-primary">{medicine.name}</span>
                <span className="text-xs text-text-muted">{medicine.lab}</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{medicine.substance.replace(/;/g, ' + ')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge>{medicine.type}</Badge>
                <Badge>{tarjaLabel(medicine.tarja)}</Badge>
                {medicine.hospital && <Badge>Uso hospitalar</Badge>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border-subtle px-2 py-0.5 text-xs text-text-secondary">
      {children}
    </span>
  )
}

function SituationResults({ slug, label }: { slug: string; label: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['medicine-situation', slug],
    queryFn: () => getJson<{ groups: SubstanceGroup[] }>(`/api/medicamentos/situacao/${slug}`),
  })

  if (isLoading) return <p className="py-8 text-center text-sm text-text-muted">Carregando...</p>
  if (isError || !data) {
    return <p className="py-8 text-center text-sm text-desert-red">Não foi possível carregar.</p>
  }

  const single = data.groups.filter((group) => !isCombination(group.substance))
  const combined = data.groups.filter((group) => isCombination(group.substance))

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-text-primary">{label}</h2>
      <p className="mb-4 text-sm text-text-muted">
        Agrupado pela classe terapêutica. Esta lista não indica qual medicamento é adequado para você.
      </p>
      <SubstanceList groups={single} />
      {combined.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-semibold text-text-primary">Associações</h3>
          <SubstanceList groups={combined} />
        </>
      )}
    </div>
  )
}

function SubstanceList({ groups }: { groups: SubstanceGroup[] }) {
  return (
    <ul className="space-y-2">
      {groups.map((group) => (
        <li key={group.substance} className="rounded-lg border border-border-subtle bg-surface-primary p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-text-primary">{group.substance.replace(/;/g, ' + ')}</span>
            <Badge>{tarjaLabel(group.tarja)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {group.products.slice(0, 12).map((product) => (
              <Link key={product.id} href={`/medicamentos/${product.id}`} className="text-desert-green hover:underline">
                {product.name}
              </Link>
            ))}
            {group.products.length > 12 && (
              <span className="text-text-muted">e mais {group.products.length - 12}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function MedicinesIndex({ situations, info }: { situations: Situation[]; info: Info }) {
  const initial = useMemo(() => new URLSearchParams(window.location.search), [])
  const [tab, setTab] = useState<'search' | 'situation'>(initial.get('situacao') ? 'situation' : 'search')
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [type, setType] = useState('')
  const [slug, setSlug] = useState(initial.get('situacao') ?? '')

  const categories = useMemo(() => {
    const grouped = new Map<string, Situation[]>()
    for (const situation of situations) {
      grouped.set(situation.category, [...(grouped.get(situation.category) ?? []), situation])
    }
    return [...grouped.entries()]
  }, [situations])
  const selected = situations.find((situation) => situation.slug === slug)

  return (
    <AppLayout compact>
      <Head title="Medicamentos" />
      <div className="mx-auto max-w-4xl p-4">
        <div className="mb-4 flex items-center gap-3">
          <IconPill size={32} className="text-desert-green" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Medicamentos</h1>
            <p className="text-sm text-text-muted">
              {info.total.toLocaleString('pt-BR')} produtos comercializados no Brasil
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-3 rounded-lg border border-desert-orange/40 bg-desert-orange/10 p-3 text-sm text-text-primary">
          <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-desert-orange" />
          <p>
            Lista informativa da CMED/Anvisa, publicada em {formatDate(info.version)}, com os
            medicamentos marcados como comercializados em 2025. Não traz bulas nem substitui médico ou
            farmacêutico. Em uma emergência, ligue para o SAMU (192).
          </p>
        </div>

        <div className="mb-4 flex gap-1 border-b border-border-subtle">
          {(
            [
              ['search', 'Pesquisar'],
              ['situation', 'Por situação'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={classNames(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
                tab === value
                  ? 'border-desert-green text-desert-green'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'search' && (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Pesquisar medicamento</span>
                <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nome, princípio ativo ou laboratório"
                  className="w-full rounded-lg border border-border-subtle bg-surface-primary py-2.5 pl-10 pr-3 text-text-primary"
                />
              </label>
              <select
                aria-label="Tipo de medicamento"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="rounded-lg border border-border-subtle bg-surface-primary px-3 py-2.5 text-text-primary"
              >
                <option value="">Todos os tipos</option>
                {PRODUCT_TYPES.map((productType) => (
                  <option key={productType} value={productType}>
                    {productType}
                  </option>
                ))}
              </select>
            </div>
            <SearchResults query={query} type={type} />
          </>
        )}

        {tab === 'situation' && (
          <>
            <div className="mb-5 space-y-3">
              {categories.map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((situation) => (
                      <button
                        key={situation.slug}
                        type="button"
                        onClick={() => setSlug(situation.slug)}
                        className={classNames(
                          'rounded-full border px-3 py-1 text-sm',
                          slug === situation.slug
                            ? 'border-desert-green bg-desert-green text-white'
                            : 'border-border-subtle bg-surface-primary text-text-primary hover:border-desert-green'
                        )}
                      >
                        {situation.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {selected && <SituationResults slug={selected.slug} label={selected.label} />}
          </>
        )}
      </div>
    </AppLayout>
  )
}
