// Realtime Database keys can't contain ".", so admins are stored by email with "." swapped for ",".
// database.rules.json does the same swap, so both sides must stay in sync.
export function emailKey(email: string): string {
  return email.trim().toLowerCase().split(".").join(",");
}
