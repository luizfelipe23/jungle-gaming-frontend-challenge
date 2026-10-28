const decimalDigits = 18
const decimalScale = 10n ** BigInt(decimalDigits)

function toUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error(`Valor decimal inválido: ${value}`)
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * decimalScale + BigInt(fraction.padEnd(18, '0'))
}

export function addDecimals(...values: string[]): string {
  return fromUnits(values.reduce((sum, value) => sum + toUnits(value), 0n))
}

export function subtractDecimals(left: string, right: string): string {
  const result = toUnits(left) - toUnits(right)
  return fromUnits(result < 0n ? 0n : result)
}

export function multiplyDecimal(value: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('A quantidade deve ser um inteiro não negativo.')
  return fromUnits(toUnits(value) * BigInt(quantity))
}

export function percentageOf(value: string, basisPoints: number, fractionDigits: number): string {
  const amount = toUnits(value)
  const raw = amount * BigInt(basisPoints) / 10_000n
  return fromUnits(roundUnits(raw, fractionDigits))
}

export function compareDecimals(left: string, right: string): number {
  const difference = toUnits(left) - toUnits(right)
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}

export function formatDecimal(value: string, maximumFractionDigits = 8): string {
  const rounded = roundUnits(toUnits(value), maximumFractionDigits)
  const negative = rounded < 0n
  const absolute = negative ? -rounded : rounded
  const whole = (absolute / decimalScale).toString()
  const fraction = (absolute % decimalScale).toString().padStart(18, '0').slice(0, maximumFractionDigits).replace(/0+$/, '')
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}${groupedWhole}${fraction ? `,${fraction}` : ''}`
}

function roundUnits(value: bigint, fractionDigits: number): bigint {
  const precision = 10n ** BigInt(decimalDigits - fractionDigits)
  const remainder = value % precision
  const rounded = value - remainder
  return remainder * 2n >= precision ? rounded + precision : rounded
}

function fromUnits(value: bigint): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const whole = absolute / decimalScale
  const fraction = (absolute % decimalScale).toString().padStart(18, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}
