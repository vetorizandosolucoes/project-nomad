/**
 * The two ways this system runs: online at full capacity, offline on as little power as
 * possible. Pure so the frontend can share it and the unit tests need no services.
 */

export type AiMode = 'auto' | 'online' | 'offline'
export type EffectiveAiMode = 'online' | 'offline'

/** Generations go here instead of Ollama. Retrieval and everything else stay local. */
export const CLOUD_MODEL_PREFIX = 'openai:'

/**
 * From reading each model's answers to emergency questions: qwen3:8b declined to invent
 * doses and facts, and was the best balance of quality and speed. Online, most capable first.
 */
const ONLINE_LOCAL_PREFERENCE = ['qwen3:8b', 'qwen3.5:9b', 'gemma4:e2b', 'gemma3:4b']
/** Offline, gemma4:e2b uses as little GPU energy per answer as gemma3:4b without inventing doses. */
const OFFLINE_LOCAL_PREFERENCE = ['gemma4:e2b', 'gemma3:4b', 'qwen3:8b', 'qwen3.5:9b']

/** How long a local model stays in the GPU after answering. */
const KEEP_ALIVE: Record<EffectiveAiMode, string | null> = { online: null, offline: '1m' }

export function parseAiMode(value: unknown): AiMode {
  return value === 'online' || value === 'offline' ? value : 'auto'
}

export function resolveEffectiveMode(mode: AiMode, hasInternet: boolean): EffectiveAiMode {
  if (!hasInternet) return 'offline'
  return mode === 'offline' ? 'offline' : 'online'
}

export function isCloudModel(model: string): boolean {
  return model.startsWith(CLOUD_MODEL_PREFIX)
}

export function cloudModelId(model: string): string {
  return model.slice(CLOUD_MODEL_PREFIX.length)
}

export function modelDisplayName(model: string): string {
  return isCloudModel(model) ? `GPT online: ${cloudModelId(model)}` : model
}

export function keepAliveForMode(mode: EffectiveAiMode): string | null {
  return KEEP_ALIVE[mode]
}

/** Puts the model that suits the mode first, because the chat defaults to the first one. */
export function orderLocalModels<T extends { name: string }>(models: T[], mode: EffectiveAiMode): T[] {
  const preference = mode === 'online' ? ONLINE_LOCAL_PREFERENCE : OFFLINE_LOCAL_PREFERENCE
  const rank = (name: string) => {
    const index = preference.indexOf(name)
    return index === -1 ? preference.length : index
  }
  return [...models].sort((a, b) => rank(a.name) - rank(b.name))
}


/** Keeps the chat models from the OpenAI list, leaving audio, image and embedding ones out. */
export function chatModelIds(ids: string[]): string[] {
  return ids
    .filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id))
    .filter((id) => !/(audio|realtime|image|embedding|transcribe|tts|search|instruct|moderation)/.test(id))
    .sort((a, b) => b.localeCompare(a))
}
