type AuthUserIdentity = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function humanizeEmail(email: string | null | undefined): string {
  const localPart = email?.split("@")[0]?.trim();
  if (!localPart) return "";

  return localPart
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Nom lisible issu de Supabase Auth lorsque le profil applicatif est incomplet.
export function authUserDisplayName(
  user: AuthUserIdentity | null | undefined
): string {
  if (!user) return "";

  const metadata = user.user_metadata ?? {};
  const firstName =
    text(metadata.first_name) || text(metadata.given_name);
  const lastName = text(metadata.last_name) || text(metadata.family_name);
  const structuredName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    structuredName ||
    text(metadata.full_name) ||
    text(metadata.name) ||
    humanizeEmail(user.email)
  );
}

// Dernier repli unique : mieux vaut un identifiant court que plusieurs « Membre ».
export function memberIdentifierFallback(userId: string): string {
  return userId.slice(0, 8).toUpperCase();
}
