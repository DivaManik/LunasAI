export function weiToDisplay(wei: string): string {
  return (Number(BigInt(wei)) / 1e18).toFixed(4) + " tBNB";
}

export function formatDate(timestampSeconds: string): string {
  const date = new Date(Number(timestampSeconds) * 1000);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
