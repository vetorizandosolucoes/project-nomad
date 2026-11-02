import { IconAlertTriangle } from '@tabler/icons-react'

/**
 * "When to use what" — top-of-page safety banner.
 *
 * A prominent amber callout that renders at the TOP of both the condition index
 * and detail pages: results are FDA label-indication matches, NOT
 * recommendations, NOT an FDA endorsement, and NOT a drug-interaction checker.
 * It leads the page (not a footnote) so the caveat is read before any result.
 */
export default function SafetyBanner() {
  return (
    <div role="alert" className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <IconAlertTriangle
          size={22}
          className="mt-0.5 flex-shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div className="text-sm text-amber-900">
          <p className="font-bold mb-1">Apenas referência informativa — não é aconselhamento médico.</p>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
            <li>
              Estes resultados relacionam as indicações das bulas da FDA a uma situação. Eles{' '}
              <strong>não são uma recomendação</strong> e <strong>não são um aval da FDA</strong>.
            </li>
            <li>
              Isto <strong>não é um verificador de interações medicamentosas</strong>. Leia os avisos completos de
              cada bula e consulte um farmacêutico ou profissional de saúde antes de combinar remédios.
            </li>
            <li>
              Em caso de emergência, ou se os sintomas forem graves ou piorarem,{' '}
              <strong>procure um profissional de saúde ou ligue para o serviço de emergência</strong>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
