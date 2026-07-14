import type { Locale } from "./config";

export const authCopy = {
  fr: {
    back: "Retour au site", brandTitle: "Vos finances deviennent des décisions.", brandText: "Importez vos données, comprenez les écarts et préparez les prochaines actions avec Yassia.",
    loginTitle: "Content de vous revoir", loginIntro: "Connectez-vous pour accéder à votre tableau de bord.", email: "Adresse e-mail", password: "Mot de passe", badCredentials: "E-mail ou mot de passe incorrect.", signingIn: "Connexion…", signIn: "Se connecter", or: "ou", google: "Continuer avec Google", noAccount: "Pas encore de compte ?", createAccount: "Créer un compte",
    signupTitle: "Créer votre compte", signupIntro: "Démarrez votre essai gratuit en moins de 2 minutes.", perks: ["14 jours d’essai, sans carte bancaire", "Import CSV illimité", "Copilote IA inclus"], firstName: "Prénom", lastName: "Nom", creating: "Création…", createMine: "Créer mon compte", already: "Déjà un compte ?", consentStart: "En créant un compte, vous acceptez nos", terms: "CGU", consentAnd: "et notre", privacy: "politique de confidentialité", checkTitle: "Vérifiez vos e-mails 📬", checkText: "Nous avons envoyé un lien de confirmation à", checkAction: "Cliquez dessus pour activer votre compte.", backLogin: "Retour à la connexion",
  },
  en: {
    back: "Back to website", brandTitle: "Turn your finances into decisions.", brandText: "Import your data, understand variances and prepare the next actions with Yassia.",
    loginTitle: "Welcome back", loginIntro: "Sign in to access your dashboard.", email: "Email address", password: "Password", badCredentials: "Incorrect email or password.", signingIn: "Signing in…", signIn: "Sign in", or: "or", google: "Continue with Google", noAccount: "New to AskFinance?", createAccount: "Create an account",
    signupTitle: "Create your account", signupIntro: "Start your free trial in under 2 minutes.", perks: ["14-day trial, no payment card", "Unlimited CSV imports", "AI copilot included"], firstName: "First name", lastName: "Last name", creating: "Creating…", createMine: "Create my account", already: "Already have an account?", consentStart: "By creating an account, you agree to our", terms: "Terms", consentAnd: "and our", privacy: "Privacy Policy", checkTitle: "Check your email 📬", checkText: "We sent a confirmation link to", checkAction: "Open it to activate your account.", backLogin: "Back to sign in",
  },
  uk: {
    back: "Повернутися на сайт", brandTitle: "Перетворюйте фінанси на рішення.", brandText: "Імпортуйте дані, розумійте відхилення й готуйте наступні дії разом із Yassia.",
    loginTitle: "Раді вас бачити", loginIntro: "Увійдіть, щоб відкрити свою панель.", email: "Електронна пошта", password: "Пароль", badCredentials: "Неправильна адреса або пароль.", signingIn: "Вхід…", signIn: "Увійти", or: "або", google: "Продовжити з Google", noAccount: "Ще немає облікового запису?", createAccount: "Створити обліковий запис",
    signupTitle: "Створіть обліковий запис", signupIntro: "Почніть безкоштовний пробний період менш ніж за 2 хвилини.", perks: ["14 днів безкоштовно, без картки", "Необмежений імпорт CSV", "ШІ-помічник включено"], firstName: "Ім’я", lastName: "Прізвище", creating: "Створення…", createMine: "Створити обліковий запис", already: "Уже маєте обліковий запис?", consentStart: "Створюючи обліковий запис, ви погоджуєтеся з", terms: "Умовами", consentAnd: "та нашою", privacy: "Політикою конфіденційності", checkTitle: "Перевірте пошту 📬", checkText: "Ми надіслали посилання для підтвердження на", checkAction: "Перейдіть за ним, щоб активувати обліковий запис.", backLogin: "Повернутися до входу",
  },
} satisfies Record<Locale, Record<string, string | readonly string[]>>;
