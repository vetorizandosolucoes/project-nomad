import { Head, Link } from '@inertiajs/react'
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react'
import AppLayout from '~/layouts/AppLayout'
import { tarjaLabel, type BrMedicine } from '../../../app/utils/br_medicines'

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-text-primary">{value}</dd>
    </div>
  )
}

export default function MedicineShow({ medicine }: { medicine: BrMedicine }) {
  const leafletUrl = `https://consultas.anvisa.gov.br/#/bulario/q/?nomeProduto=${encodeURIComponent(medicine.name)}`

  return (
    <AppLayout compact>
      <Head title={medicine.name} />
      <div className="mx-auto max-w-3xl p-4">
        <Link href="/medicamentos" className="mb-4 inline-flex items-center gap-1 text-sm text-desert-green hover:underline">
          <IconArrowLeft size={16} />
          Medicamentos
        </Link>

        <h1 className="text-3xl font-bold text-text-primary">{medicine.name}</h1>
        <p className="mt-1 text-text-secondary">{medicine.substance.replace(/;/g, ' + ')}</p>

        <dl className="mt-6 grid gap-4 rounded-lg border border-border-subtle bg-surface-primary p-5 sm:grid-cols-2">
          <Detail label="Laboratório" value={medicine.lab} />
          <Detail label="Tipo" value={medicine.type} />
          <Detail label="Tarja" value={tarjaLabel(medicine.tarja)} />
          <Detail label="Registro na Anvisa" value={medicine.registry} />
          <Detail label="Uso hospitalar" value={medicine.hospital ? 'Sim, com restrição hospitalar' : 'Não'} />
          <Detail label="Classe terapêutica" value={medicine.class} />
        </dl>

        <h2 className="mb-2 mt-6 text-lg font-semibold text-text-primary">Apresentações</h2>
        <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-primary text-sm text-text-primary">
          {medicine.presentations.map((presentation) => (
            <li key={presentation} className="px-4 py-2">
              {presentation}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-lg border border-border-subtle bg-surface-primary p-4 text-sm text-text-primary">
          <p className="font-semibold">Dose e avisos estão na bula</p>
          <p className="mt-1 text-text-secondary">
            Esta lista não inclui o texto das bulas. Leia a bula que acompanha o produto ou fale com um
            farmacêutico.
          </p>
          <a
            href={leafletUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-desert-green hover:underline"
          >
            Procurar no Bulário Eletrônico da Anvisa (precisa de internet)
            <IconExternalLink size={14} />
          </a>
        </div>
      </div>
    </AppLayout>
  )
}
