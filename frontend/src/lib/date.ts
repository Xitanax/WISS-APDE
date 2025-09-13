export function toIsoLocal(dtLocalValue: string): string {
  const d = new Date(dtLocalValue);
  return d.toISOString();
}
