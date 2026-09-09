export function estimateFromLoc(loc: number): number {
  return Math.round(loc * 7 / 12000)
}

export function addBusinessDays(startISO: string, days: number): string {
  const n = Math.max(0, Math.ceil(days))
  // Parse and format in UTC throughout — this is pure calendar-date arithmetic
  // with no time-of-day, so it must not depend on the server's local timezone.
  const d = new Date(startISO + "T00:00:00Z")
  let added = 0
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}
