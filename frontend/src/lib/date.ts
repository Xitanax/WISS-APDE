export function toIsoLocal(dtLocalValue: string): string {
  // nimmt Wert aus <input type="datetime-local"> und wandelt zu ISO (UTC) um
  const d = new Date(dtLocalValue);
  return d.toISOString();
}
