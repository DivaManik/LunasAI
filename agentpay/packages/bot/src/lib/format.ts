export function weiToDisplay(raw: string | bigint): string {
  const value = Number(raw) / 100;
  return `${value.toLocaleString("id-ID")} IDRX`;
}

export function formatDate(timestampSeconds: string): string {
  const date = new Date(Number(timestampSeconds) * 1000);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
