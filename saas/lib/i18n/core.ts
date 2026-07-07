// Cœur i18n partagé client + serveur (aucune dépendance Next).
export type Messages = { [key: string]: string | Messages };

export type TFunc = (
  path: string,
  vars?: Record<string, string | number>
) => string;

function resolve(messages: Messages, path: string): string | Messages | undefined {
  return path
    .split(".")
    .reduce<string | Messages | undefined>(
      (acc, key) =>
        acc && typeof acc !== "string" ? acc[key] : undefined,
      messages
    );
}

// Construit la fonction de traduction t("a.b", { name }) avec interpolation {var}.
export function makeT(messages: Messages): TFunc {
  return (path, vars) => {
    const raw = resolve(messages, path);
    let out = typeof raw === "string" ? raw : path;
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
    }
    return out;
  };
}
