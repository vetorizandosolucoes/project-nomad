/**
 * Does the arithmetic in a question before any model sees it. In testing, small models
 * answered "12345 vezes 6789" with confident, wrong numbers and often skipped their
 * calculator tool. Parses numbers and operators only: nothing here is ever evaluated as code.
 */

const NUMBER = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?`
// A bare "-" or "/" needs spaces around it, because "8-10" and "12/10" are usually not math.
const OPERATOR = String.raw`\s*(?:[x×*+]|vezes|mais|menos|multiplicado por|dividido por|÷)\s*|\s+[-/]\s+`
const EXPRESSION = new RegExp(`(?<![\\d.,/-])(${NUMBER})((?:(?:${OPERATOR})(?:${NUMBER}))+)(?![\\d/-])`, 'gi')
const PERCENT = new RegExp(`(?<![\\d.,])(${NUMBER})\\s*%\\s*de\\s*(${NUMBER})(?![\\d])`, 'gi')
const PAIR = new RegExp(`(${OPERATOR})(${NUMBER})`, 'gi')

const MAX_RESULTS = 3

function parseNumber(text: string): number {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) return Number(text.replace(/\./g, '').replace(',', '.'))
  return Number(text.replace(',', '.'))
}

function operatorSymbol(raw: string): '+' | '-' | '×' | '÷' {
  const word = raw.trim().toLowerCase()
  if (word === '+' || word === 'mais') return '+'
  if (word === '-' || word === 'menos') return '-'
  if (word === '/' || word === '÷' || word === 'dividido por') return '÷'
  return '×'
}

/** Multiplication and division first, then addition and subtraction, left to right. */
function evaluate(values: number[], operators: string[]): number | null {
  const terms = [values[0]]
  const pending: string[] = []
  operators.forEach((operator, index) => {
    const value = values[index + 1]
    if (operator === '×') terms[terms.length - 1] *= value
    else if (operator === '÷') terms[terms.length - 1] /= value
    else {
      pending.push(operator)
      terms.push(value)
    }
  })
  const total = terms.reduce((sum, term, index) => (index === 0 ? term : pending[index - 1] === '+' ? sum + term : sum - term))
  return Number.isFinite(total) ? total : null
}

function format(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
}

/** Lines like "12345 × 6789 = 83.810.205", one per expression found in the question. */
export function solveArithmetic(question: string): string[] {
  const results: string[] = []

  for (const match of question.matchAll(EXPRESSION)) {
    const values = [parseNumber(match[1])]
    const operators: string[] = []
    for (const pair of match[2].matchAll(PAIR)) {
      operators.push(operatorSymbol(pair[1]))
      values.push(parseNumber(pair[2]))
    }
    const total = evaluate(values, operators)
    if (total === null) continue
    const written = values.map((value, index) => (index === 0 ? format(value) : `${operators[index - 1]} ${format(value)}`))
    results.push(`${written.join(' ')} = ${format(total)}`)
  }

  for (const match of question.matchAll(PERCENT)) {
    const [percent, base] = [parseNumber(match[1]), parseNumber(match[2])]
    results.push(`${format(percent)}% de ${format(base)} = ${format((percent / 100) * base)}`)
  }

  return results.slice(0, MAX_RESULTS)
}
