import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconBrain, IconTrash } from '@tabler/icons-react'
import { aiRequest } from '~/components/AiModeSwitch'
import type { Persona, PersonaMode } from '../../app/utils/jarvis_persona'
import type { MemoryKind } from '../../app/utils/jarvis_memory'

type Memory = { id: number; kind: MemoryKind; content: string; source: 'user' | 'auto' }

const MODE_LABELS: Record<PersonaMode, string> = {
  classic: 'Mordomo elegante (Jarvis clássico)',
  friendly: 'Amigável',
  professional: 'Profissional',
  funny: 'Engraçado',
  futuristic: 'Futurista',
  genius: 'Gênio da tecnologia',
  executive: 'Assistente corporativo',
  coach: 'Coach motivacional',
}
const HUMOR_LABELS = ['Sem piadas', 'Raro', 'Leve', 'Bastante']
const FORMALITY_LABELS = ['Informal', 'Natural', 'Formal']
const DETAIL_LABELS = ['Breve', 'Normal', 'Detalhado']
const SPEED_LABELS = ['Devagar', 'Normal', 'Rápido']
const KIND_LABELS: Record<MemoryKind, string> = {
  name: 'Nome',
  preference: 'Preferência',
  project: 'Projeto',
  goal: 'Objetivo',
  fact: 'Fato',
}

function PersonaForm() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['jarvis-persona'], queryFn: () => aiRequest<Persona>('GET', '/jarvis/persona') })
  const [draft, setDraft] = useState<Persona | null>(null)
  useEffect(() => {
    if (data) setDraft(data)
  }, [data])
  const save = useMutation({
    mutationFn: (persona: Persona) => aiRequest<Persona>('PUT', '/jarvis/persona', persona),
    onSuccess: (saved) => queryClient.setQueryData(['jarvis-persona'], saved),
  })
  if (!draft) return null

  const change = (patch: Partial<Persona>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    save.mutate(next)
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-text-primary">Personalidade</h2>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Modo</span>
        <select
          value={draft.mode}
          onChange={(event) => change({ mode: event.target.value as PersonaMode })}
          className="rounded-md border border-border-default bg-surface-primary px-2 py-1 text-text-primary"
        >
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Nome dele</span>
        <input
          value={draft.name}
          maxLength={30}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onBlur={() => save.mutate(draft)}
          className="min-w-0 flex-1 border-0 border-b border-border-default bg-transparent px-1 py-1 text-text-primary focus:border-desert-green focus:outline-none"
        />
      </label>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Me chamar de</span>
        <input
          value={draft.address}
          maxLength={40}
          placeholder="Seu nome, senhor, senhora..."
          onChange={(event) => setDraft({ ...draft, address: event.target.value })}
          onBlur={() => save.mutate(draft)}
          className="min-w-0 flex-1 border-0 border-b border-border-default bg-transparent px-1 py-1 text-text-primary focus:border-desert-green focus:outline-none"
        />
      </label>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Humor</span>
        <input type="range" min={0} max={3} value={draft.humor} onChange={(event) => change({ humor: Number(event.target.value) })} />
        <span>{HUMOR_LABELS[draft.humor]}</span>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Formalidade</span>
        <input type="range" min={0} max={2} value={draft.formality} onChange={(event) => change({ formality: Number(event.target.value) })} />
        <span>{FORMALITY_LABELS[draft.formality]}</span>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Respostas</span>
        <input type="range" min={0} max={2} value={draft.detail} onChange={(event) => change({ detail: Number(event.target.value) })} />
        <span>{DETAIL_LABELS[draft.detail]}</span>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-text-secondary">
        <span className="w-28">Velocidade da voz</span>
        <input type="range" min={0} max={2} value={draft.voiceSpeed} onChange={(event) => change({ voiceSpeed: Number(event.target.value) })} />
        <span>{SPEED_LABELS[draft.voiceSpeed]}</span>
      </label>
      <label className="flex items-center gap-2 text-text-secondary">
        <input type="checkbox" checked={draft.greets} onChange={(event) => change({ greets: event.target.checked })} />
        Responder em voz alta quando for chamado
      </label>
      <label className="flex items-center gap-2 text-text-secondary">
        <input type="checkbox" checked={draft.showHeard} onChange={(event) => change({ showHeard: event.target.checked })} />
        Mostrar o que eu falo na tela
      </label>
      <label className="flex items-center gap-2 text-text-secondary">
        <input type="checkbox" checked={draft.showAnswer} onChange={(event) => change({ showAnswer: event.target.checked })} />
        Mostrar a resposta na tela
      </label>
      <p className="text-xs text-text-muted">
        Em emergências, ele deixa o estilo de lado e fala com seriedade. A palavra para chamar continua sendo "Jarvis".
      </p>
    </section>
  )
}

function MemoryList() {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const { data } = useQuery({
    queryKey: ['jarvis-memories'],
    queryFn: () => aiRequest<{ enabled: boolean; memories: Memory[] }>('GET', '/jarvis/memories'),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['jarvis-memories'] })
  const add = useMutation({
    mutationFn: (text: string) => aiRequest('POST', '/jarvis/memories', { content: text }),
    onSuccess: () => {
      setContent('')
      refresh()
    },
  })
  const remove = useMutation({ mutationFn: (id: number) => aiRequest('DELETE', `/jarvis/memories/${id}`), onSuccess: refresh })
  const clear = useMutation({ mutationFn: () => aiRequest('DELETE', '/jarvis/memories'), onSuccess: refresh })
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => aiRequest('PUT', '/jarvis/memory-enabled', { enabled }),
    onSuccess: refresh,
  })
  const memories = data?.memories ?? []

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-text-primary">Memória</h2>
      <label className="flex items-center gap-2 text-text-secondary">
        <input type="checkbox" checked={data?.enabled ?? true} onChange={(event) => toggle.mutate(event.target.checked)} />
        Lembrar de mim entre as conversas
      </label>
      <p className="text-xs text-text-muted">
        Fica guardada só neste computador. Saúde, senhas e documentos não são guardados sozinhos. Com o GPT ligado, as
        memórias relacionadas à pergunta vão junto para a OpenAI.
      </p>
      <form
        className="flex items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (content.trim()) add.mutate(content.trim())
        }}
      >
        <input
          value={content}
          maxLength={300}
          aria-label="Nova memória"
          placeholder="Ensine algo ao Jarvis..."
          onChange={(event) => setContent(event.target.value)}
          className="min-w-0 flex-1 border-0 border-b border-border-default bg-transparent px-1 py-1 text-text-primary focus:border-desert-green focus:outline-none"
        />
        <button type="submit" disabled={add.isPending || !content.trim()} className="font-medium text-desert-green disabled:opacity-50">
          Guardar
        </button>
      </form>
      {memories.length === 0 ? (
        <p className="text-text-muted">Nenhuma memória ainda. Diga, por exemplo: "Jarvis, lembre que eu gosto de café".</p>
      ) : (
        <>
          <ul className="max-h-72 overflow-y-auto">
            {memories.map((memory) => (
              <li key={memory.id} className="flex items-center gap-2 border-b border-border-subtle py-1.5">
                <span className="w-24 shrink-0 text-xs text-text-muted">{KIND_LABELS[memory.kind]}</span>
                <span className="min-w-0 flex-1 text-text-primary">{memory.content}</span>
                <button
                  type="button"
                  aria-label={`Apagar: ${memory.content}`}
                  onClick={() => remove.mutate(memory.id)}
                  className="text-text-muted hover:text-desert-red"
                >
                  <IconTrash size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => window.confirm('Apagar todas as memórias do Jarvis?') && clear.mutate()}
            className="text-desert-red"
          >
            Apagar todas
          </button>
        </>
      )}
    </section>
  )
}

export default function JarvisProfile() {
  return (
    <details className="border-b border-border-subtle py-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-text-secondary">
        <IconBrain size={18} aria-hidden="true" />
        Personalidade e memória
      </summary>
      <div className="space-y-6 py-4 text-sm">
        <PersonaForm />
        <MemoryList />
      </div>
    </details>
  )
}
