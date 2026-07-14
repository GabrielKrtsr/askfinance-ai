import Link from "next/link";

import { LegalDocument } from "@/components/landing/legal-document";
import { getLocale } from "@/lib/i18n/server";

const copies = {
  fr: {
    title: "Mentions légales",
    date: "14 juillet 2026",
    publisherTitle: "1. Éditeur du service",
    publisher: (
      <>
        Le site <Link href="https://askfinance.ai">askfinance.ai</Link> et
        l’application AskFinance AI sont édités à titre non professionnel par{" "}
        <strong>Gabriel Kreutser</strong>, personne physique. AskFinance AI est
        le nom du service, et non celui d’une société.
      </>
    ),
    status:
      "Aucune société ni autre structure juridique n’est constituée pour exploiter le service à la date de la présente mise à jour. Il n’existe donc ni capital social, ni numéro SIREN, RNE ou RCS, ni numéro de TVA intracommunautaire à publier.",
    privacy: (
      <>
        En application de l’article 1-1, II de la loi n° 2004-575 du 21 juin
        2004 pour la confiance dans l’économie numérique, l’éditeur non
        professionnel ne publie pas son domicile ni son numéro de téléphone.
        Les éléments permettant son identification personnelle sont
        communiqués aux fournisseurs d’hébergement.
      </>
    ),
    directorTitle: "2. Direction de la publication",
    director: (
      <>
        Directeur de la publication : <strong>Gabriel Kreutser</strong>.
      </>
    ),
    hostingTitle: "3. Hébergement et stockage",
    hostingIntro:
      "Le service s’appuie sur les prestataires techniques suivants :",
    role: "Rôle",
    address: "Adresse",
    phone: "Téléphone",
    contact: "Contact",
    vercelRole: "hébergement de l’interface web et diffusion du site",
    renderRole: "hébergement de l’API et des services serveur",
    supabaseRole:
      "authentification, base de données et stockage des fichiers",
    ipTitle: "4. Propriété intellectuelle",
    ip: "Sauf mention contraire, la structure du service, ses textes, son identité visuelle, ses composants graphiques, son code et ses fonctionnalités sont la propriété de Gabriel Kreutser. Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, sans autorisation préalable est interdite, sous réserve des exceptions prévues par la loi et des licences propres aux composants tiers utilisés par le service.",
    informationTitle: "5. Nature des informations financières",
    information:
      "AskFinance AI fournit des outils d’organisation, de prévision et d’aide au pilotage à partir des données saisies ou importées par l’utilisateur. Les résultats, alertes, estimations et contenus générés sont indicatifs. Ils ne remplacent pas l’avis d’un expert-comptable, d’un avocat, d’un conseiller fiscal, d’un établissement bancaire ou d’un conseiller en investissement.",
    responsibilityTitle: "6. Disponibilité et responsabilité",
    responsibility:
      "L’éditeur s’efforce de fournir des informations exactes et de maintenir le service accessible. Il ne garantit toutefois ni l’absence d’erreur, ni une disponibilité continue. L’utilisateur reste responsable de la vérification de ses données, de ses décisions et de la conservation des justificatifs nécessaires à ses obligations personnelles, comptables, fiscales ou réglementaires.",
    dataTitle: "7. Données personnelles",
    data: (
      <>
        Les traitements de données personnelles, leurs finalités, leurs durées
        de conservation et les droits des utilisateurs sont décrits dans la{" "}
        <Link href="/legal/privacy">politique de confidentialité</Link>.
      </>
    ),
    referencesTitle: "8. Textes de référence",
    references: (
      <>
        Ces mentions sont établies notamment au regard de{" "}
        <Link href="https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614/2026-05-12">
          l’article 1-1 de la loi pour la confiance dans l’économie numérique
        </Link>{" "}
        et des{" "}
        <Link href="https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter">
          informations publiées par le ministère de l’Économie
        </Link>
        .
      </>
    ),
  },
  en: {
    title: "Legal notice",
    date: "July 14, 2026",
    publisherTitle: "1. Service publisher",
    publisher: (
      <>
        The <Link href="https://askfinance.ai">askfinance.ai</Link> website and
        the AskFinance AI application are published on a non-professional basis by{" "}
        <strong>Gabriel Kreutser</strong>, a natural person. AskFinance AI is the
        name of the service and not the name of a company.
      </>
    ),
    status:
      "No company or other legal structure has been formed to operate the service as of this update. There is therefore no share capital, SIREN, RNE, RCS or EU VAT number to publish.",
    privacy: (
      <>
        Under Article 1-1, II of French Law No. 2004-575 of June 21, 2004 on
        confidence in the digital economy, the non-professional publisher does
        not publish their home address or telephone number. Personal
        identification details are provided to the hosting providers.
      </>
    ),
    directorTitle: "2. Publication director",
    director: (
      <>
        Publication director: <strong>Gabriel Kreutser</strong>.
      </>
    ),
    hostingTitle: "3. Hosting and storage",
    hostingIntro: "The service uses the following technical providers:",
    role: "Role",
    address: "Address",
    phone: "Telephone",
    contact: "Contact",
    vercelRole: "web interface hosting and website delivery",
    renderRole: "API and server-side services hosting",
    supabaseRole: "authentication, database and file storage",
    ipTitle: "4. Intellectual property",
    ip: "Unless otherwise stated, the service structure, texts, visual identity, graphical components, code and features belong to Gabriel Kreutser. Any reproduction, representation, adaptation or use, in whole or in part, without prior authorization is prohibited, subject to statutory exceptions and the licenses applying to third-party components used by the service.",
    informationTitle: "5. Nature of financial information",
    information:
      "AskFinance AI provides organization, forecasting and management support tools based on data entered or imported by the user. Results, alerts, estimates and generated content are indicative. They do not replace advice from an accountant, lawyer, tax adviser, bank or investment adviser.",
    responsibilityTitle: "6. Availability and liability",
    responsibility:
      "The publisher aims to provide accurate information and keep the service accessible. However, the absence of errors and uninterrupted availability are not guaranteed. Users remain responsible for checking their data and decisions, and for retaining the records required for their personal, accounting, tax or regulatory obligations.",
    dataTitle: "7. Personal data",
    data: (
      <>
        Personal-data processing, purposes, retention periods and user rights
        are described in the <Link href="/legal/privacy">privacy policy</Link>.
      </>
    ),
    referencesTitle: "8. Legal references",
    references: (
      <>
        This notice is based in particular on{" "}
        <Link href="https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614/2026-05-12">
          Article 1-1 of the French law on confidence in the digital economy
        </Link>{" "}
        and the{" "}
        <Link href="https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter">
          information published by the French Ministry of the Economy
        </Link>
        .
      </>
    ),
  },
  uk: {
    title: "Правова інформація",
    date: "14 липня 2026 року",
    publisherTitle: "1. Видавець сервісу",
    publisher: (
      <>
        Вебсайт <Link href="https://askfinance.ai">askfinance.ai</Link> і
        застосунок AskFinance AI видаються на непрофесійній основі фізичною особою{" "}
        <strong>Габріелем Кройтсером</strong>. AskFinance AI є назвою сервісу, а
        не компанії.
      </>
    ),
    status:
      "Станом на дату цього оновлення для роботи сервісу не створено компанії чи іншої юридичної структури. Тому немає статутного капіталу, номерів SIREN, RNE, RCS або номера ПДВ ЄС, які потрібно публікувати.",
    privacy: (
      <>
        Відповідно до статті 1-1, II Закону Франції № 2004-575 від 21 червня
        2004 року про довіру до цифрової економіки непрофесійний видавець не
        публікує домашню адресу й номер телефону. Особисті ідентифікаційні дані
        передано постачальникам хостингу.
      </>
    ),
    directorTitle: "2. Директор публікації",
    director: (
      <>
        Директор публікації: <strong>Габріель Кройтсер</strong>.
      </>
    ),
    hostingTitle: "3. Хостинг і зберігання даних",
    hostingIntro: "Сервіс використовує таких технічних постачальників:",
    role: "Роль",
    address: "Адреса",
    phone: "Телефон",
    contact: "Контакт",
    vercelRole: "хостинг вебінтерфейсу й доставка сайту",
    renderRole: "хостинг API та серверних сервісів",
    supabaseRole: "автентифікація, база даних і зберігання файлів",
    ipTitle: "4. Інтелектуальна власність",
    ip: "Якщо не зазначено інше, структура сервісу, тексти, візуальна ідентичність, графічні компоненти, код і функції належать Габріелю Кройтсеру. Будь-яке повне або часткове відтворення, представлення, адаптація чи використання без попереднього дозволу заборонені, за винятком передбачених законом випадків і ліцензій на сторонні компоненти сервісу.",
    informationTitle: "5. Характер фінансової інформації",
    information:
      "AskFinance AI надає інструменти організації, прогнозування й підтримки управління на основі даних, введених або імпортованих користувачем. Результати, сповіщення, оцінки й створений контент мають орієнтовний характер. Вони не замінюють консультації бухгалтера, юриста, податкового консультанта, банку чи інвестиційного радника.",
    responsibilityTitle: "6. Доступність і відповідальність",
    responsibility:
      "Видавець прагне надавати точну інформацію й підтримувати доступність сервісу, але не гарантує відсутності помилок або безперервної роботи. Користувач відповідає за перевірку власних даних і рішень та за збереження документів, потрібних для особистих, бухгалтерських, податкових або регуляторних обов’язків.",
    dataTitle: "7. Персональні дані",
    data: (
      <>
        Обробку персональних даних, її цілі, строки зберігання й права
        користувачів описано в{" "}
        <Link href="/legal/privacy">політиці конфіденційності</Link>.
      </>
    ),
    referencesTitle: "8. Правові джерела",
    references: (
      <>
        Цю інформацію складено, зокрема, на підставі{" "}
        <Link href="https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614/2026-05-12">
          статті 1-1 Закону Франції про довіру до цифрової економіки
        </Link>{" "}
        та{" "}
        <Link href="https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter">
          інформації Міністерства економіки Франції
        </Link>
        .
      </>
    ),
  },
} as const;

const providers = [
  {
    name: "Vercel Inc.",
    roleKey: "vercelRole",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, United States",
    phone: "+1 559 288 7060",
    contact: "dmca@vercel.com",
    href: "https://vercel.com/legal/dmca-policy",
  },
  {
    name: "Render Services, Inc.",
    roleKey: "renderRole",
    address:
      "525 Brannan Street, Suite 300, San Francisco, CA 94107, United States",
    phone: "+1 415 881 5869",
    contact: "legal@render.com",
    href: "https://render.com/terms",
  },
  {
    name: "Supabase Pte. Ltd.",
    roleKey: "supabaseRole",
    address:
      "65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513",
    contact: "privacy@supabase.io",
    href: "https://supabase.com/downloads/docs/Supabase%2BDPA%2B260601.pdf",
  },
] as const;

export default function LegalNoticePage() {
  const copy = copies[getLocale()];

  return (
    <LegalDocument title={copy.title} updated={copy.date}>
      <h2>{copy.publisherTitle}</h2>
      <p>{copy.publisher}</p>
      <p>{copy.status}</p>
      <p>{copy.privacy}</p>

      <h2>{copy.directorTitle}</h2>
      <p>{copy.director}</p>

      <h2>{copy.hostingTitle}</h2>
      <p>{copy.hostingIntro}</p>
      {providers.map((provider) => (
        <section key={provider.name}>
          <h3>
            <Link href={provider.href}>{provider.name}</Link>
          </h3>
          <ul>
            <li>
              {copy.role}: {copy[provider.roleKey]}
            </li>
            <li>
              {copy.address}: {provider.address}
            </li>
            {"phone" in provider && provider.phone ? (
              <li>
                {copy.phone}: {provider.phone}
              </li>
            ) : null}
            <li>
              {copy.contact}: {provider.contact}
            </li>
          </ul>
        </section>
      ))}

      <h2>{copy.ipTitle}</h2>
      <p>{copy.ip}</p>

      <h2>{copy.informationTitle}</h2>
      <p>{copy.information}</p>

      <h2>{copy.responsibilityTitle}</h2>
      <p>{copy.responsibility}</p>

      <h2>{copy.dataTitle}</h2>
      <p>{copy.data}</p>

      <h2>{copy.referencesTitle}</h2>
      <p>{copy.references}</p>
    </LegalDocument>
  );
}
