/** Round a percentage axis up to the next 25% (min 25, max 100) so bars and
 *  lines use the chart's height instead of hugging the bottom. */
export function pctAxis(maxValue: number): { max: number; ticks: number[] } {
  const max = Math.min(100, Math.max(25, Math.ceil((maxValue + 2) / 25) * 25))
  return { max, ticks: Array.from({ length: max / 25 + 1 }, (_, i) => i * 25) }
}
