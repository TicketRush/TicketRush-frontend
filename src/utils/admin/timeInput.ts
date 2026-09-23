export const timeInputClass = "w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary xl:px-4 xl:py-3 xl:text-base";

// Seconds are supported only when editing a restored seconds-bearing value.
export function formatTimeInput(input: string, withSeconds = false): string {
  const digits = input.replace(/\D/g, "").slice(0, withSeconds ? 6 : 4);
  return digits.match(/.{1,2}/g)?.join(":") ?? "";
}
