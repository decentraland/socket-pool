export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function pickElement<T>(set: Set<T>): T | undefined {
  for (const elem of set) return elem
  return
}
