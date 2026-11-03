/**
 * Models that call the calculator instead of guessing the result. In testing, gemma3:4b
 * made up the answer to a multiplication while gemma4:e2b used the tool and got it right.
 */
const TOOL_CAPABLE_MODELS = ['gemma4:e2b', 'qwen3:8b', 'qwen3.5:9b']

export function pickJarvisModel(installed: string[]): string | null {
  return TOOL_CAPABLE_MODELS.find((model) => installed.includes(model)) ?? installed[0] ?? null
}

/** The agent's reasoning format isn't meant for people: only its conclusion is. */
export function cleanJarvisAnswer(text: string): string {
  const marker = text.lastIndexOf('Final Answer:')
  const answer = marker >= 0 ? text.slice(marker + 'Final Answer:'.length) : text
  return answer.replace(/^\s*Thought:.*$/gm, '').replace(/^[\s>]+/, '').trim()
}

/** The browser supplies only what was said. System instructions are added on this side. */
export function keepChatRoles(messages: unknown[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.flatMap((message) => {
    const { role, content } = (message ?? {}) as { role?: unknown; content?: unknown }
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) return []
    return [{ role, content: content.slice(0, 8000) }]
  })
}
