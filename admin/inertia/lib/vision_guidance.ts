import type { ModelVisionCapability } from '../../types/ollama.js'

const TEMPORARY_IMAGE_NOTICE =
  'As imagens são enviadas apenas com esta solicitação. Elas não são salvas e somem depois do envio ou ao recarregar esta página.'

export function visionAttachmentGuidance(capability: ModelVisionCapability): string {
  if (capability === 'unsupported') {
    return 'Este modelo não aceita imagens. Escolha um modelo marcado como "Aceita imagens" em Modelos e configurações.'
  }

  if (capability === 'unknown') {
    return `O sistema não consegue confirmar se este modelo aceita imagens. Você pode tentar, mas a solicitação falhará se o modelo só aceitar texto. ${TEMPORARY_IMAGE_NOTICE}`
  }

  return TEMPORARY_IMAGE_NOTICE
}
