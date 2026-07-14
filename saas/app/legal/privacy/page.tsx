import Link from "next/link";

import { LegalDocument } from "@/components/landing/legal-document";
import { getLocale } from "@/lib/i18n/server";

const CONTACT_EMAIL = "gabriel.kreutser.etu@univ-lille.fr";

const providers = [
  {
    name: "Vercel Inc.",
    href: "https://vercel.com/legal/privacy-policy",
    roleKey: "vercel",
  },
  {
    name: "Render Services, Inc.",
    href: "https://render.com/privacy",
    roleKey: "render",
  },
  {
    name: "Supabase Pte. Ltd.",
    href: "https://supabase.com/privacy",
    roleKey: "supabase",
  },
  {
    name: "Google LLC (Gemini API et OAuth)",
    href: "https://policies.google.com/privacy",
    roleKey: "google",
  },
  {
    name: "Cloudflare, Inc. (Turnstile)",
    href: "https://www.cloudflare.com/privacypolicy/",
    roleKey: "cloudflare",
  },
] as const;

const copies = {
  fr: {
    title: "Politique de confidentialité",
    date: "14 juillet 2026",
    intro:
      "Cette politique explique comment les données personnelles sont traitées dans AskFinance AI, pourquoi elles sont utilisées, avec qui elles peuvent être partagées et comment exercer vos droits.",
    controllerTitle: "1. Responsable du traitement et contact",
    controller:
      "Le responsable du traitement est Gabriel Kreutser, personne physique et éditeur non professionnel d’AskFinance AI. AskFinance AI est le nom du service et non celui d’une société.",
    contact:
      "Pour toute question ou demande relative à vos données personnelles, écrivez à",
    sections: [
      [
        "2. Personnes concernées et périmètre",
        "Cette politique concerne les visiteurs du site, les titulaires de compte, les membres invités dans un espace et les personnes dont les informations sont saisies par un utilisateur, par exemple un client associé à un encaissement attendu. Lorsqu’un utilisateur importe ou saisit des données concernant un tiers, il doit disposer d’une base légitime et informer ce tiers lorsque la loi l’exige.",
      ],
      [
        "3. Données collectées",
        "AskFinance peut traiter les nom, prénom, adresse électronique, fournisseur de connexion et identifiant d’authentification ; les espaces, rôles, invitations et actions de collaboration ; les noms de comptes, soldes, transactions, libellés, catégories, budgets, prévisions, dépenses partagées, encaissements, informations d’entreprise et fichiers CSV ; les questions, réponses et historiques Yassia ; ainsi que les données techniques nécessaires à la sécurité et au fonctionnement, telles que session, adresse IP, navigateur, journaux, langue, thème et résultat du contrôle anti-robot. AskFinance ne demande actuellement aucun identifiant bancaire et ne réalise aucune synchronisation bancaire.",
      ],
      [
        "4. Source des données",
        "Les données proviennent principalement de l’utilisateur lorsqu’il crée son compte, configure un espace, importe un fichier ou utilise une fonctionnalité. Elles peuvent aussi provenir d’un autre membre autorisé du même espace, du fournisseur de connexion choisi par l’utilisateur ou être produites par le service à partir des opérations réalisées, par exemple un indicateur, une prévision ou une trace d’audit.",
      ],
      [
        "5. Finalités et bases légales",
        "Les données de compte, d’espace et financières sont traitées pour exécuter les conditions d’utilisation et fournir les fonctionnalités demandées. La sécurisation des accès, la prévention des abus, Turnstile, les journaux techniques, l’audit et le diagnostic reposent sur l’intérêt légitime à protéger le service et ses utilisateurs. Les traitements imposés par un texte reposent sur l’obligation légale. Une communication facultative ou un traceur non nécessaire reposerait sur le consentement lorsqu’il est requis ; aucun outil publicitaire ni mesure d’audience non essentielle n’est actuellement intégré.",
      ],
      [
        "6. Caractère nécessaire des données",
        "L’adresse électronique et les éléments d’authentification sont nécessaires pour créer et sécuriser un compte. Les autres informations fonctionnelles sont fournies selon les outils utilisés. Sans les données requises pour une fonctionnalité, celle-ci ne peut pas fonctionner. L’utilisation de Google OAuth et de Yassia reste facultative.",
      ],
      [
        "7. Yassia et intelligence artificielle",
        "Lorsque l’utilisateur sollicite Yassia, sa question, les instructions du système et les éléments issus des outils financiers nécessaires à la réponse sont transmis à l’API Google Gemini. Les appels peuvent être associés à un identifiant d’interaction afin de conserver le contexte entre les messages. Il est recommandé de ne pas inclure d’information inutile ou particulièrement sensible dans une question. Les réponses ne produisent aucun effet juridique automatique et doivent être vérifiées par l’utilisateur.",
      ],
      [
        "8. Partage dans les espaces",
        "Les données d’un espace peuvent être consultées ou modifiées par ses membres selon leur rôle et les règles d’accès. Le propriétaire et les administrateurs gèrent ces autorisations. Les conversations Yassia sont limitées à leur auteur lorsque les règles de l’espace le prévoient. L’utilisateur doit vérifier les membres présents avant d’ajouter des données concernant des tiers.",
      ],
      [
        "10. Transferts internationaux",
        "Certains prestataires sont établis ou peuvent traiter des données hors de l’Espace économique européen, notamment aux États-Unis ou à Singapour. Selon le service et la région configurée, ces transferts sont encadrés par une décision d’adéquation applicable, des clauses contractuelles types ou les autres garanties proposées par le prestataire. Les liens ci-dessous permettent de consulter leurs informations et garanties actualisées.",
      ],
      [
        "11. Sécurité",
        "AskFinance utilise notamment l’authentification Supabase, des politiques de sécurité au niveau des lignes, des permissions par espace et par rôle, un bucket privé pour les imports, une vérification côté serveur et Turnstile contre les abus. Les fichiers CSV sont supprimés du stockage de transit après traitement, en succès comme en échec. Malgré ces mesures, aucun système ne peut garantir une sécurité absolue ; tout accès suspect doit être signalé rapidement.",
      ],
      [
        "13. Décision automatisée",
        "AskFinance calcule des indicateurs, alertes, catégories proposées et prévisions. Ces traitements servent à informer l’utilisateur mais ne déclenchent pas seuls une décision produisant un effet juridique ou l’affectant de manière similaire. Les actions sensibles restent initiées ou validées par un utilisateur autorisé.",
      ],
      [
        "14. Cookies et stockage local",
        "Le service utilise des cookies ou mécanismes équivalents strictement nécessaires à l’authentification, à la sécurité, au choix de l’espace, à la langue et au thème. Cloudflare Turnstile traite des signaux techniques afin de distinguer les utilisateurs légitimes des robots. AskFinance n’utilise actuellement ni cookie publicitaire ni outil de profilage commercial. Si des traceurs facultatifs sont ajoutés, une information et un choix seront proposés avant leur dépôt lorsque la loi l’exige.",
      ],
      [
        "15. Mineurs",
        "Le service s’adresse en priorité aux personnes majeures. Un mineur ne doit créer un compte qu’avec l’autorisation de son représentant légal. Si des données ont été fournies sans autorisation appropriée, leur suppression peut être demandée à l’adresse de contact indiquée ci-dessus.",
      ],
      [
        "16. Évolution de la politique",
        "Cette politique peut être mise à jour pour refléter une évolution du service, des prestataires ou du droit applicable. La date de mise à jour figure en haut de la page. Toute modification substantielle fera l’objet d’une information adaptée lorsque cela est requis.",
      ],
    ],
    providersTitle: "9. Destinataires et prestataires",
    providersIntro:
      "Les données sont accessibles à Gabriel Kreutser dans la mesure nécessaire à l’administration et au support, aux membres autorisés d’un espace et aux prestataires suivants, dans la limite de leur mission :",
    providerRoles: {
      vercel: "hébergement et diffusion de l’interface web",
      render: "hébergement de l’API et des traitements serveur",
      supabase: "authentification, base de données, contrôle des accès et stockage privé",
      google: "connexion Google lorsque choisie et traitement des requêtes Yassia par Gemini",
      cloudflare: "détection des robots et protection des formulaires de connexion et d’inscription",
    },
    sale:
      "AskFinance ne vend ni ne loue les données personnelles et ne les transmet pas à des annonceurs.",
    retentionTitle: "12. Durées de conservation",
    retentionItems: [
      "Fichiers CSV bruts : uniquement pendant le transfert et le traitement, puis suppression du bucket privé après succès ou échec.",
      "Compte, profil et données financières : pendant l’existence du compte ou de l’espace concerné, jusqu’à leur suppression par un utilisateur autorisé ou à la fermeture du compte.",
      "Conversations Yassia et identifiants d’interaction : pendant l’existence de la conversation, de l’espace ou du compte, auxquels s’ajoutent les durées techniques appliquées par Google Gemini.",
      "Rôles, validations et journal d’audit : pendant l’existence de l’espace et aussi longtemps qu’ils sont nécessaires à la sécurité, à la traçabilité ou à la défense de droits.",
      "Sessions, CAPTCHA et journaux d’infrastructure : pendant leur durée de validité ou selon les durées opérationnelles de sécurité configurées par Supabase, Cloudflare, Vercel et Render.",
    ],
    backup:
      "Lorsqu’une suppression est demandée, les données sont retirées des systèmes actifs. Des copies résiduelles peuvent subsister temporairement dans les sauvegardes jusqu’à leur rotation par les prestataires ; elles ne sont pas réutilisées pour fournir le service. Certaines données peuvent être archivées séparément si une obligation légale ou la défense d’un droit l’exige.",
    rightsTitle: "17. Vos droits",
    rights:
      "Selon le traitement et sa base légale, vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation du traitement ou vous opposer à un traitement fondé sur l’intérêt légitime. Vous pouvez retirer un consentement à tout moment sans remettre en cause les traitements antérieurs. Une preuve d’identité peut être demandée uniquement en cas de doute raisonnable. Une réponse est apportée dans les délais prévus par le RGPD, en principe sous un mois.",
    complaint:
      "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la",
    cnil: "Commission nationale de l’informatique et des libertés (CNIL)",
    referencesTitle: "18. Documents associés",
    terms: "Conditions générales d’utilisation",
    legal: "Mentions légales",
  },
  en: {
    title: "Privacy Policy",
    date: "July 14, 2026",
    intro:
      "This policy explains how AskFinance AI processes personal data, why it is used, who may receive it and how individuals can exercise their rights.",
    controllerTitle: "1. Controller and contact",
    controller:
      "The controller is Gabriel Kreutser, a natural person and non-professional publisher of AskFinance AI. AskFinance AI is the service name and not a company.",
    contact: "For any privacy question or request, write to",
    sections: [
      [
        "2. People and scope",
        "This policy covers website visitors, account holders, invited workspace members and people whose information is entered by a user, such as a customer linked to an expected receivable. Users who import or enter third-party data must have a lawful basis and inform those people where required.",
      ],
      [
        "3. Data collected",
        "AskFinance may process names, email addresses, login providers and authentication identifiers; workspaces, roles, invitations and collaboration actions; account names, balances, transactions, labels, categories, budgets, forecasts, shared expenses, receivables, company information and CSV files; Yassia prompts, answers and histories; and technical data required for security and operation, such as sessions, IP addresses, browsers, logs, language, theme and anti-bot results. AskFinance currently requests no bank credentials and performs no bank synchronization.",
      ],
      [
        "4. Data sources",
        "Data mainly comes from users when they create an account, configure a workspace, upload a file or use a feature. It may also come from another authorized member, a login provider selected by the user or be generated by the service from user activity, such as an indicator, forecast or audit event.",
      ],
      [
        "5. Purposes and legal bases",
        "Account, workspace and financial data is processed to perform the Terms of Use and provide requested features. Access security, abuse prevention, Turnstile, technical logs, auditing and diagnostics rely on the legitimate interest in protecting the service and its users. Processing required by law relies on legal obligations. Optional communications or non-essential trackers would rely on consent where required; no advertising or non-essential audience analytics tool is currently integrated.",
      ],
      [
        "6. Required data",
        "Email and authentication data are required to create and secure an account. Other functional data is supplied according to the tools selected. A feature cannot operate without the data it requires. Google OAuth and Yassia are optional.",
      ],
      [
        "7. Yassia and artificial intelligence",
        "When a user asks Yassia a question, the prompt, system instructions and financial context returned by the necessary tools are sent to the Google Gemini API. Calls may be linked by an interaction identifier to preserve context between messages. Users should avoid including unnecessary or especially sensitive information. Answers create no automatic legal effect and must be checked by the user.",
      ],
      [
        "8. Workspace sharing",
        "Workspace data may be viewed or changed by members according to their role and access rules. Owners and administrators manage permissions. Yassia conversations are limited to their author where workspace rules provide this. Users should review membership before adding third-party information.",
      ],
      [
        "10. International transfers",
        "Some providers are established or may process data outside the European Economic Area, including in the United States or Singapore. Depending on the service and configured region, transfers are governed by an applicable adequacy decision, standard contractual clauses or other safeguards offered by the provider. The links below contain their current transfer information.",
      ],
      [
        "11. Security",
        "AskFinance uses Supabase authentication, row-level security, workspace and role permissions, private import storage, server-side checks and Turnstile abuse protection. CSV files are deleted from transit storage after processing, whether it succeeds or fails. No system can guarantee absolute security, and suspicious access should be reported promptly.",
      ],
      [
        "13. Automated decisions",
        "AskFinance calculates indicators, alerts, suggested categories and forecasts. They inform users but do not independently trigger a decision producing legal or similarly significant effects. Sensitive actions remain initiated or approved by an authorized user.",
      ],
      [
        "14. Cookies and local storage",
        "The service uses cookies or equivalent mechanisms strictly required for authentication, security, current-workspace selection, language and theme. Cloudflare Turnstile processes technical signals to distinguish legitimate users from bots. AskFinance currently uses no advertising cookie or commercial profiling. If optional trackers are added, information and a choice will be provided before storage where required.",
      ],
      [
        "15. Children",
        "The service is primarily intended for adults. A minor should create an account only with their legal representative’s authorization. Data supplied without appropriate authorization may be deleted upon request using the contact above.",
      ],
      [
        "16. Policy changes",
        "This policy may be updated to reflect changes to the service, providers or applicable law. The update date appears at the top of the page. Material changes will be communicated appropriately where required.",
      ],
    ],
    providersTitle: "9. Recipients and providers",
    providersIntro:
      "Data is accessible to Gabriel Kreutser as needed for administration and support, to authorized workspace members and to the following providers within the limits of their role:",
    providerRoles: {
      vercel: "hosting and delivery of the web interface",
      render: "hosting of the API and server-side processing",
      supabase: "authentication, database, access control and private storage",
      google: "Google login when selected and Gemini processing for Yassia requests",
      cloudflare: "bot detection and protection of sign-in and sign-up forms",
    },
    sale: "AskFinance does not sell or rent personal data and does not share it with advertisers.",
    retentionTitle: "12. Retention periods",
    retentionItems: [
      "Raw CSV files: only during transfer and processing, then deleted from private storage after success or failure.",
      "Account, profile and financial data: while the relevant account or workspace exists, until deletion by an authorized user or account closure.",
      "Yassia conversations and interaction identifiers: while the conversation, workspace or account exists, plus the technical retention applied by Google Gemini.",
      "Roles, approvals and audit records: while the workspace exists and for as long as required for security, traceability or the establishment or defence of rights.",
      "Sessions, CAPTCHA and infrastructure logs: for their validity period or the operational security periods configured by Supabase, Cloudflare, Vercel and Render.",
    ],
    backup:
      "When deletion is requested, data is removed from active systems. Residual copies may temporarily remain in backups until provider rotation and are not reused to provide the service. Some information may be separately archived where required by law or to establish or defend a legal claim.",
    rightsTitle: "17. Your rights",
    rights:
      "Depending on the processing and its legal basis, you may request access, correction, deletion, portability or restriction, or object to processing based on legitimate interests. Consent may be withdrawn at any time without affecting earlier processing. Identity evidence is requested only where there is reasonable doubt. Requests are answered within GDPR deadlines, generally one month.",
    complaint: "If you believe your rights have not been respected, you may lodge a complaint with the",
    cnil: "French Data Protection Authority (CNIL)",
    referencesTitle: "18. Related documents",
    terms: "Terms of Use",
    legal: "Legal notice",
  },
  uk: {
    title: "Політика конфіденційності",
    date: "14 липня 2026 року",
    intro:
      "Ця політика пояснює, як AskFinance AI обробляє персональні дані, навіщо вони потрібні, кому можуть передаватися та як реалізувати свої права.",
    controllerTitle: "1. Контролер і контакт",
    controller:
      "Контролером є Габріель Кройтсер, фізична особа й непрофесійний видавець AskFinance AI. AskFinance AI є назвою сервісу, а не компанії.",
    contact: "З питань або запитів щодо персональних даних пишіть на",
    sections: [
      [
        "2. Особи та сфера дії",
        "Політика стосується відвідувачів сайту, власників облікових записів, запрошених учасників і осіб, чиї дані вводить користувач, наприклад клієнта в очікуваному надходженні. Користувач повинен мати законну підставу для даних третіх осіб та інформувати їх, коли цього вимагає закон.",
      ],
      [
        "3. Зібрані дані",
        "AskFinance може обробляти ім’я, електронну адресу, постачальника входу й ідентифікатор автентифікації; простори, ролі, запрошення й спільні дії; назви рахунків, баланси, транзакції, описи, категорії, бюджети, прогнози, спільні витрати, надходження, дані компанії й CSV-файли; запити, відповіді та історію Yassia; а також технічні дані для безпеки й роботи, зокрема сесію, IP-адресу, браузер, журнали, мову, тему й результат антибот-перевірки. Банківські облікові дані не запитуються, синхронізації з банком немає.",
      ],
      [
        "4. Джерела даних",
        "Дані переважно надає користувач під час створення облікового запису, налаштування простору, імпорту файлу чи використання функції. Вони також можуть надходити від іншого уповноваженого учасника, обраного постачальника входу або створюватися сервісом із дій користувача, наприклад як показник, прогноз чи запис аудиту.",
      ],
      [
        "5. Цілі та правові підстави",
        "Дані облікового запису, простору й фінансів обробляються для виконання Умов використання та надання функцій. Захист доступу, запобігання зловживанням, Turnstile, технічні журнали, аудит і діагностика спираються на законний інтерес у захисті сервісу та користувачів. Обов’язкова законом обробка має підставу юридичного обов’язку. Необов’язкові повідомлення чи трекери потребуватимуть згоди, коли це потрібно; реклами й необов’язкової аналітики зараз немає.",
      ],
      [
        "6. Обов’язковість даних",
        "Електронна адреса й дані автентифікації потрібні для створення й захисту облікового запису. Інші дані надаються залежно від обраних функцій. Без необхідних даних функція не працює. Google OAuth і Yassia є необов’язковими.",
      ],
      [
        "7. Yassia та штучний інтелект",
        "Коли користувач звертається до Yassia, запит, системні інструкції та потрібний фінансовий контекст передаються API Google Gemini. Виклики можуть поєднуватися ідентифікатором взаємодії для збереження контексту. Не слід додавати зайві або особливо чутливі дані. Відповіді не створюють автоматичних юридичних наслідків і мають перевірятися користувачем.",
      ],
      [
        "8. Спільний доступ у просторах",
        "Дані простору можуть переглядати або змінювати його учасники відповідно до ролі й правил доступу. Власники й адміністратори керують дозволами. Розмови Yassia обмежуються їх автором, якщо це передбачено правилами простору. Перед додаванням даних третіх осіб потрібно перевірити склад учасників.",
      ],
      [
        "10. Міжнародні передачі",
        "Деякі постачальники розташовані або можуть обробляти дані за межами Європейської економічної зони, зокрема у США чи Сінгапурі. Залежно від сервісу й регіону передачі спираються на чинне рішення про належний захист, стандартні договірні положення або інші гарантії постачальника. Актуальні відомості доступні за посиланнями нижче.",
      ],
      [
        "11. Безпека",
        "AskFinance використовує автентифікацію Supabase, політики безпеки на рівні рядків, дозволи просторів і ролей, приватне сховище імпорту, серверні перевірки й Turnstile. CSV видаляються з транзитного сховища після обробки незалежно від результату. Абсолютної безпеки не існує, тому про підозрілий доступ слід повідомити якнайшвидше.",
      ],
      [
        "13. Автоматизовані рішення",
        "AskFinance розраховує показники, попередження, пропоновані категорії та прогнози. Вони інформують користувача, але самі не запускають рішення з юридичними або подібними істотними наслідками. Чутливі дії ініціює або підтверджує уповноважений користувач.",
      ],
      [
        "14. Cookies і локальне сховище",
        "Сервіс використовує cookies або аналогічні механізми лише для автентифікації, безпеки, вибору простору, мови й теми. Cloudflare Turnstile обробляє технічні сигнали для відрізнення людей від роботів. Рекламних cookies і комерційного профілювання зараз немає. Для майбутніх необов’язкових трекерів буде надано інформацію й вибір до їх розміщення, коли це потрібно.",
      ],
      [
        "15. Неповнолітні",
        "Сервіс насамперед призначений для повнолітніх. Неповнолітній може створити обліковий запис лише з дозволу законного представника. Видалення даних, наданих без належного дозволу, можна попросити за контактною адресою вище.",
      ],
      [
        "16. Зміни політики",
        "Політика може оновлюватися через зміни сервісу, постачальників або закону. Дата оновлення вказана вгорі. Про суттєві зміни буде повідомлено належним способом, коли це вимагається.",
      ],
    ],
    providersTitle: "9. Отримувачі та постачальники",
    providersIntro:
      "Дані доступні Габріелю Кройтсеру в межах адміністрування й підтримки, уповноваженим учасникам простору та таким постачальникам у межах їхньої ролі:",
    providerRoles: {
      vercel: "хостинг і доставка вебінтерфейсу",
      render: "хостинг API та серверної обробки",
      supabase: "автентифікація, база даних, контроль доступу й приватне сховище",
      google: "вхід через Google за вибором користувача та обробка запитів Yassia в Gemini",
      cloudflare: "виявлення роботів і захист форм входу та реєстрації",
    },
    sale: "AskFinance не продає й не здає в оренду персональні дані та не передає їх рекламодавцям.",
    retentionTitle: "12. Строки зберігання",
    retentionItems: [
      "Сирі CSV-файли: лише під час передавання й обробки, після чого видаляються з приватного сховища незалежно від результату.",
      "Обліковий запис, профіль і фінансові дані: поки існує відповідний обліковий запис або простір, до видалення уповноваженим користувачем чи закриття облікового запису.",
      "Розмови Yassia й ідентифікатори взаємодій: поки існує розмова, простір або обліковий запис, плюс технічні строки Google Gemini.",
      "Ролі, погодження й аудит: поки існує простір і доки це потрібно для безпеки, простежуваності або захисту прав.",
      "Сесії, CAPTCHA та журнали інфраструктури: протягом строку дії або операційних строків безпеки Supabase, Cloudflare, Vercel і Render.",
    ],
    backup:
      "Після запиту на видалення дані прибираються з активних систем. Залишкові копії можуть тимчасово бути в резервних копіях до ротації постачальника й не використовуються для роботи сервісу. Окремі дані можуть архівуватися, якщо цього вимагає закон або захист права.",
    rightsTitle: "17. Ваші права",
    rights:
      "Залежно від обробки та її підстави ви можете просити доступ, виправлення, видалення, перенесення чи обмеження або заперечувати проти законного інтересу. Згоду можна відкликати будь-коли без впливу на попередню обробку. Документ для підтвердження особи запитується лише за обґрунтованого сумніву. Відповідь надається у строки RGPD, зазвичай протягом одного місяця.",
    complaint: "Якщо ви вважаєте, що права порушено, можете подати скаргу до",
    cnil: "Національної комісії Франції з інформатики та свобод (CNIL)",
    referencesTitle: "18. Пов’язані документи",
    terms: "Умови використання",
    legal: "Правова інформація",
  },
} as const;

export default function PrivacyPage() {
  const copy = copies[getLocale()];

  return (
    <LegalDocument title={copy.title} updated={copy.date}>
      <p>{copy.intro}</p>

      <section>
        <h2>{copy.controllerTitle}</h2>
        <p>{copy.controller}</p>
        <p>
          {copy.contact}{" "}
          <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
        </p>
      </section>

      {copy.sections.slice(0, 7).map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}

      <section>
        <h2>{copy.providersTitle}</h2>
        <p>{copy.providersIntro}</p>
        <ul>
          {providers.map((provider) => (
            <li key={provider.name}>
              <Link href={provider.href}>{provider.name}</Link> :{" "}
              {copy.providerRoles[provider.roleKey]}
            </li>
          ))}
        </ul>
        <p>{copy.sale}</p>
      </section>

      {copy.sections.slice(7, 9).map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}

      <section>
        <h2>{copy.retentionTitle}</h2>
        <ul>
          {copy.retentionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{copy.backup}</p>
      </section>

      {copy.sections.slice(9).map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}

      <section>
        <h2>{copy.rightsTitle}</h2>
        <p>{copy.rights}</p>
        <p>
          {copy.complaint}{" "}
          <Link href="https://www.cnil.fr/fr/plaintes">{copy.cnil}</Link>.
        </p>
      </section>

      <section>
        <h2>{copy.referencesTitle}</h2>
        <ul>
          <li>
            <Link href="/legal/terms">{copy.terms}</Link>
          </li>
          <li>
            <Link href="/legal/mentions-legales">{copy.legal}</Link>
          </li>
        </ul>
      </section>
    </LegalDocument>
  );
}
