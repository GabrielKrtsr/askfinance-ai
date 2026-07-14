import type { Locale } from "@/lib/i18n/config";

type AuthIntent = "login" | "signup";
type SupabaseAuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

const messages = {
  fr: {
    captcha_failed: "Le contrôle anti-robot a expiré ou n'a pas pu être validé. Recommencez la vérification.",
    user_already_exists: "Cette adresse e-mail est déjà utilisée. Connectez-vous plutôt avec ce compte.",
    email_exists: "Cette adresse e-mail est déjà utilisée. Connectez-vous plutôt avec ce compte.",
    identity_already_exists: "Un compte existe déjà avec cette identité.",
    weak_password: "Ce mot de passe est trop faible. Utilisez au moins 8 caractères avec un mélange de lettres et de chiffres.",
    email_address_invalid: "Cette adresse e-mail n'est pas valide.",
    validation_failed: "Certaines informations sont invalides. Vérifiez le formulaire puis réessayez.",
    signup_disabled: "La création de comptes est momentanément désactivée.",
    email_provider_disabled: "L'inscription par e-mail est momentanément indisponible.",
    invalid_credentials: "Adresse e-mail ou mot de passe incorrect.",
    email_not_confirmed: "Cette adresse e-mail n'est pas encore activée.",
    user_banned: "Ce compte est temporairement suspendu.",
    over_request_rate_limit: "Trop de tentatives ont été effectuées. Patientez quelques minutes avant de réessayer.",
    over_email_send_rate_limit: "Trop de demandes ont été envoyées pour cette adresse. Patientez quelques minutes.",
    request_timeout: "Le service d'authentification met trop de temps à répondre. Réessayez dans un instant.",
    unexpected_failure: "Le service d'authentification rencontre un problème temporaire. Réessayez dans un instant.",
    fallbackLogin: "Connexion impossible pour le moment. Vérifiez vos informations puis réessayez.",
    fallbackSignup: "Création du compte impossible pour le moment. Réessayez dans un instant.",
  },
  en: {
    captcha_failed: "The anti-bot check expired or could not be verified. Complete it again.",
    user_already_exists: "This email address is already in use. Sign in with that account instead.",
    email_exists: "This email address is already in use. Sign in with that account instead.",
    identity_already_exists: "An account already exists with this identity.",
    weak_password: "This password is too weak. Use at least 8 characters with a mix of letters and numbers.",
    email_address_invalid: "This email address is invalid.",
    validation_failed: "Some information is invalid. Check the form and try again.",
    signup_disabled: "Account creation is temporarily disabled.",
    email_provider_disabled: "Email registration is temporarily unavailable.",
    invalid_credentials: "Incorrect email address or password.",
    email_not_confirmed: "This email address has not been activated yet.",
    user_banned: "This account is temporarily suspended.",
    over_request_rate_limit: "Too many attempts were made. Wait a few minutes before trying again.",
    over_email_send_rate_limit: "Too many requests were sent for this address. Wait a few minutes.",
    request_timeout: "The authentication service is taking too long to respond. Try again shortly.",
    unexpected_failure: "The authentication service is temporarily unavailable. Try again shortly.",
    fallbackLogin: "Unable to sign in right now. Check your information and try again.",
    fallbackSignup: "Unable to create the account right now. Try again shortly.",
  },
  uk: {
    captcha_failed: "Перевірка проти роботів завершилася або не пройшла. Пройдіть її ще раз.",
    user_already_exists: "Ця електронна адреса вже використовується. Увійдіть до наявного облікового запису.",
    email_exists: "Ця електронна адреса вже використовується. Увійдіть до наявного облікового запису.",
    identity_already_exists: "Обліковий запис із цією ідентичністю вже існує.",
    weak_password: "Цей пароль надто слабкий. Використайте щонайменше 8 символів, літери та цифри.",
    email_address_invalid: "Ця електронна адреса недійсна.",
    validation_failed: "Деякі дані недійсні. Перевірте форму та повторіть спробу.",
    signup_disabled: "Створення облікових записів тимчасово вимкнено.",
    email_provider_disabled: "Реєстрація через електронну пошту тимчасово недоступна.",
    invalid_credentials: "Неправильна електронна адреса або пароль.",
    email_not_confirmed: "Цю електронну адресу ще не активовано.",
    user_banned: "Цей обліковий запис тимчасово заблоковано.",
    over_request_rate_limit: "Забагато спроб. Зачекайте кілька хвилин і повторіть.",
    over_email_send_rate_limit: "Для цієї адреси надіслано забагато запитів. Зачекайте кілька хвилин.",
    request_timeout: "Служба автентифікації відповідає надто довго. Спробуйте ще раз за мить.",
    unexpected_failure: "Служба автентифікації тимчасово недоступна. Спробуйте ще раз за мить.",
    fallbackLogin: "Наразі не вдалося увійти. Перевірте дані та повторіть спробу.",
    fallbackSignup: "Наразі не вдалося створити обліковий запис. Спробуйте ще раз за мить.",
  },
} as const;

function legacyCode(message: string): string | null {
  const normalized = message.toLowerCase();
  if (normalized.includes("captcha")) return "captcha_failed";
  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("already use")
  ) {
    return "user_already_exists";
  }
  if (normalized.includes("invalid login credentials")) return "invalid_credentials";
  if (normalized.includes("password") && normalized.includes("weak")) return "weak_password";
  if (normalized.includes("rate limit") || normalized.includes("too many request")) {
    return "over_request_rate_limit";
  }
  return null;
}

export function getAuthErrorMessage(
  error: SupabaseAuthErrorLike,
  locale: Locale,
  intent: AuthIntent
): string {
  const copy = messages[locale] ?? messages.fr;
  const code = error.code || legacyCode(error.message ?? "");
  if (code && code in copy) {
    return copy[code as keyof typeof copy];
  }
  if (error.status === 429) return copy.over_request_rate_limit;
  return intent === "login" ? copy.fallbackLogin : copy.fallbackSignup;
}
