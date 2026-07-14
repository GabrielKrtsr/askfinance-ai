import Link from "next/link";

import { LegalDocument } from "@/components/landing/legal-document";
import { getLocale } from "@/lib/i18n/server";

const copies = {
  fr: {
    title: "Conditions générales d’utilisation",
    date: "14 juillet 2026",
    intro:
      "Les présentes conditions encadrent l’accès et l’utilisation de la version bêta d’AskFinance AI. Cette version est proposée gratuitement, sans abonnement payant ni synchronisation bancaire.",
    sections: [
      [
        "1. Éditeur et champ d’application",
        "AskFinance AI est un service édité à titre non professionnel par Gabriel Kreutser, personne physique. Les présentes conditions s’appliquent au site askfinance.ai, à l’application et à leurs fonctionnalités. Les informations complètes relatives à l’éditeur et aux hébergeurs figurent dans les mentions légales.",
      ],
      [
        "2. Acceptation des conditions",
        "La création d’un compte ou l’utilisation du service vaut acceptation des présentes conditions dans leur version en vigueur. L’utilisateur qui n’accepte pas ces conditions ne doit pas créer de compte ni utiliser les espaces authentifiés. Les personnes utilisant le service pour le compte d’un groupe ou d’une organisation déclarent disposer de l’autorisation nécessaire.",
      ],
      [
        "3. Description du service",
        "AskFinance permet de créer des espaces Personnel, Groupe et Entreprise, d’ajouter des comptes financiers, d’importer des relevés CSV, de classer des transactions, de définir des budgets, de produire des indicateurs et prévisions, de suivre des dépenses partagées ou des encaissements attendus et d’interroger le copilote Yassia. Aucune connexion permanente à un établissement bancaire n’est proposée dans la version actuelle.",
      ],
      [
        "4. Création et sécurité du compte",
        "L’utilisateur fournit des informations exactes et maintient son adresse électronique à jour. Il doit préserver la confidentialité de ses moyens de connexion, ne pas partager sa session et signaler sans délai tout accès suspect. Il est responsable des actions réalisées depuis sa session, sauf utilisation frauduleuse qui ne lui serait pas imputable. Le service est destiné aux personnes majeures ou aux mineurs disposant de l’autorisation de leur représentant légal.",
      ],
      [
        "5. Espaces, rôles et collaboration",
        "Le propriétaire d’un espace choisit ses membres et leurs rôles. Chaque membre ne doit accéder qu’aux données nécessaires à sa participation. Les espaces Groupe et Entreprise peuvent exposer certaines informations aux autres membres selon les permissions configurées. Le propriétaire est responsable des invitations, de la pertinence des accès et de leur retrait lorsqu’ils ne sont plus nécessaires.",
      ],
      [
        "6. Données et fichiers fournis par l’utilisateur",
        "L’utilisateur reste titulaire de ses données. Il garantit qu’il peut légalement importer, saisir, traiter et partager les informations transmises au service, notamment les relevés, informations de tiers, coordonnées de clients et données d’entreprise. Il accorde à l’éditeur une autorisation limitée au traitement technique de ces données afin de fournir, sécuriser et améliorer le fonctionnement du service. Cette autorisation cesse lorsque les données sont supprimées, sous réserve des copies techniques résiduelles et obligations légales.",
      ],
      [
        "7. Version bêta gratuite et évolution",
        "L’accès actuellement proposé est gratuit et expérimental. Aucune carte bancaire n’est demandée et aucun abonnement payant n’est conclu au titre des présentes conditions. Les fonctionnalités peuvent évoluer, être limitées ou retirées. Toute future offre payante fera l’objet d’une information et de conditions commerciales distinctes avant facturation.",
      ],
      [
        "8. Prévisions et intelligence artificielle",
        "Les prévisions reposent sur les données disponibles, des règles de calcul et des modèles statistiques. Yassia peut transmettre à Google Gemini la question, des instructions et les éléments financiers nécessaires à la réponse. Les résultats générés peuvent être incomplets, approximatifs ou erronés. L’utilisateur doit les vérifier et conserver la maîtrise de toute décision. Yassia ne prend aucune décision produisant automatiquement un effet juridique ou financier pour l’utilisateur.",
      ],
      [
        "9. Absence de conseil réglementé",
        "AskFinance fournit des outils d’organisation et d’aide au pilotage. Le service ne constitue pas un conseil comptable, juridique, fiscal, bancaire ou en investissement et ne remplace pas un expert-comptable, un avocat, un conseiller réglementé ou un établissement financier. Les montants fiscaux, échéances, alertes et scénarios sont indicatifs.",
      ],
      [
        "10. Utilisations interdites",
        "Il est interdit de contourner les contrôles d’accès, d’explorer les données d’autrui, de perturber le service, d’introduire un code malveillant, d’automatiser des requêtes abusives, de tenter d’extraire des secrets ou des instructions internes, d’usurper une identité, d’utiliser le service à des fins illicites ou de porter atteinte aux droits de tiers. Il est également interdit d’importer des données sans base légitime ou de partager dans un espace des informations que ses membres ne sont pas autorisés à consulter.",
      ],
      [
        "11. Propriété intellectuelle",
        "Le logiciel, l’interface, la marque AskFinance AI, les textes, éléments graphiques et fonctionnalités sont protégés. L’utilisateur reçoit uniquement un droit personnel, non exclusif, non cessible et révocable d’utiliser le service conformément aux présentes conditions. Les composants tiers restent soumis à leurs licences respectives. Aucun droit de propriété sur les données de l’utilisateur n’est transféré à l’éditeur.",
      ],
      [
        "12. Disponibilité, maintenance et sécurité",
        "L’éditeur met en œuvre des mesures raisonnables pour protéger et maintenir le service, mais la bêta peut comporter des erreurs, interruptions, pertes de performance ou incompatibilités. Des opérations de maintenance peuvent rendre le service temporairement indisponible. L’utilisateur conserve une copie des documents et justificatifs dont il a besoin et ne doit pas considérer AskFinance comme son unique moyen de conservation réglementaire.",
      ],
      [
        "13. Suspension, fermeture et suppression",
        "L’accès peut être suspendu en cas de risque de sécurité, d’usage abusif, de violation des présentes conditions ou de demande d’une autorité compétente. L’utilisateur peut supprimer les éléments proposés dans l’interface et demander la fermeture de son compte. Le propriétaire peut supprimer un espace, ce qui entraîne la suppression des données qui lui sont rattachées, sous réserve des délais techniques de sauvegarde et des obligations légales décrits dans la politique de confidentialité.",
      ],
      [
        "14. Responsabilité",
        "Chaque partie répond des dommages directs résultant de ses manquements selon le droit applicable. L’éditeur ne répond pas des décisions prises sans vérification, des données erronées fournies par l’utilisateur, d’un partage d’accès imputable à l’utilisateur, ni des interruptions causées par internet ou un prestataire hors de son contrôle raisonnable. Aucune disposition ne limite une responsabilité qui ne pourrait légalement être exclue, ni les droits impératifs d’un consommateur.",
      ],
      [
        "15. Données personnelles",
        "Le traitement des données personnelles, les destinataires, les durées de conservation, les transferts éventuels et les droits des personnes sont décrits dans la politique de confidentialité. L’utilisation de certains espaces implique que des données soient visibles par leurs membres selon les rôles attribués.",
      ],
      [
        "16. Modification des conditions",
        "Les conditions applicables sont celles publiées lors de l’utilisation du service. En cas de modification substantielle, l’utilisateur sera informé par un moyen adapté avant son entrée en vigueur lorsque cela est nécessaire. La poursuite de l’utilisation après cette date vaut acceptation ; à défaut, l’utilisateur peut cesser d’utiliser le service et demander la fermeture de son compte.",
      ],
      [
        "17. Droit applicable et règlement des différends",
        "Les présentes conditions sont régies par le droit français, sans priver un consommateur des protections impératives de son pays de résidence. Les parties recherchent d’abord une solution amiable. À défaut, les juridictions compétentes sont déterminées selon les règles légales applicables. Aucun médiateur de la consommation n’est désigné à ce stade, la bêta actuelle n’étant pas commercialisée par un professionnel.",
      ],
    ],
    referencesTitle: "Documents associés",
    legal: "Mentions légales",
    privacy: "Politique de confidentialité",
  },
  en: {
    title: "Terms of Use",
    date: "July 14, 2026",
    intro:
      "These terms govern access to and use of the AskFinance AI beta. The current version is provided free of charge, without a paid subscription or bank synchronization.",
    sections: [
      [
        "1. Publisher and scope",
        "AskFinance AI is a service published on a non-professional basis by Gabriel Kreutser, a natural person. These terms apply to askfinance.ai, the application and their features. Full information about the publisher and hosting providers is available in the legal notice.",
      ],
      [
        "2. Acceptance",
        "Creating an account or using the service constitutes acceptance of the current terms. Users who do not accept them must not create an account or use authenticated workspaces. Anyone using the service for a group or organization represents that they have authority to do so.",
      ],
      [
        "3. Service description",
        "AskFinance lets users create Personal, Group and Business workspaces, add financial accounts, import CSV statements, categorize transactions, set budgets, produce indicators and forecasts, track shared expenses or expected receivables and use the Yassia copilot. The current version does not provide a permanent connection to any bank.",
      ],
      [
        "4. Account creation and security",
        "Users provide accurate information and keep their email address current. They must protect their credentials, avoid sharing sessions and promptly report suspicious access. They are responsible for activity performed through their session, except fraudulent use not attributable to them. The service is intended for adults or minors authorized by their legal representative.",
      ],
      [
        "5. Workspaces, roles and collaboration",
        "Workspace owners choose members and roles. Members must access only the data required for their participation. Group and Business workspaces may expose information to other members according to configured permissions. Owners are responsible for invitations, appropriate access and removing access when it is no longer needed.",
      ],
      [
        "6. User-provided data and files",
        "Users retain ownership of their data and warrant that they may lawfully import, enter, process and share it, including statements, third-party information, customer details and company data. They grant the publisher a limited permission to process that data solely to provide, secure and operate the service. This permission ends when the data is deleted, subject to residual technical copies and legal requirements.",
      ],
      [
        "7. Free beta and changes",
        "Current access is free and experimental. No payment card is required and no paid subscription is formed under these terms. Features may change, be limited or be withdrawn. Any future paid offer will be presented with separate commercial terms before billing.",
      ],
      [
        "8. Forecasting and artificial intelligence",
        "Forecasts rely on available data, calculation rules and statistical models. Yassia may send the question, instructions and financial context required for an answer to Google Gemini. Generated results may be incomplete, approximate or incorrect. Users must verify them and remain responsible for every decision. Yassia does not make decisions that automatically produce legal or financial effects.",
      ],
      [
        "9. No regulated advice",
        "AskFinance provides organization and management-support tools. It is not accounting, legal, tax, banking or investment advice and does not replace an accountant, lawyer, regulated adviser or financial institution. Tax amounts, deadlines, alerts and scenarios are indicative.",
      ],
      [
        "10. Prohibited use",
        "Users must not bypass access controls, explore another person’s data, disrupt the service, introduce malicious code, automate abusive requests, attempt to extract secrets or internal instructions, impersonate others, use the service unlawfully or infringe third-party rights. Users must not import data without a lawful basis or expose information to unauthorized workspace members.",
      ],
      [
        "11. Intellectual property",
        "The software, interface, AskFinance AI brand, texts, graphics and features are protected. Users receive only a personal, non-exclusive, non-transferable and revocable right to use the service under these terms. Third-party components remain subject to their licenses. No ownership of user data is transferred to the publisher.",
      ],
      [
        "12. Availability, maintenance and security",
        "The publisher applies reasonable measures to protect and maintain the service, but the beta may contain errors, interruptions, performance issues or incompatibilities. Maintenance may cause temporary unavailability. Users must keep copies of records they need and must not use AskFinance as their sole regulatory archive.",
      ],
      [
        "13. Suspension, closure and deletion",
        "Access may be suspended for security risk, abusive use, breach of these terms or a valid authority request. Users may delete items offered in the interface and request account closure. Owners may delete a workspace and its associated data, subject to technical backup cycles and legal requirements described in the privacy policy.",
      ],
      [
        "14. Liability",
        "Each party is liable for direct loss caused by its breach under applicable law. The publisher is not responsible for unverified decisions, inaccurate user-supplied data, user-attributable access sharing, or interruptions caused by the internet or providers outside reasonable control. Nothing excludes liability that cannot legally be excluded or mandatory consumer rights.",
      ],
      [
        "15. Personal data",
        "The privacy policy describes personal-data processing, recipients, retention, potential transfers and individual rights. Use of collaborative workspaces means that some data is visible to their members according to assigned roles.",
      ],
      [
        "16. Changes to these terms",
        "The applicable terms are those published when the service is used. Users will receive appropriate advance information about material changes where required. Continued use after the effective date constitutes acceptance; otherwise, users may stop using the service and request account closure.",
      ],
      [
        "17. Governing law and disputes",
        "These terms are governed by French law without depriving consumers of mandatory protection in their country of residence. The parties should first seek an amicable solution. Failing that, jurisdiction is determined by applicable law. No consumer mediator is appointed at this stage because the current beta is not commercially operated by a professional.",
      ],
    ],
    referencesTitle: "Related documents",
    legal: "Legal notice",
    privacy: "Privacy policy",
  },
  uk: {
    title: "Умови використання",
    date: "14 липня 2026 року",
    intro:
      "Ці умови регулюють доступ до бета-версії AskFinance AI та її використання. Поточна версія є безкоштовною, без платної підписки й банківської синхронізації.",
    sections: [
      [
        "1. Видавець і сфера дії",
        "AskFinance AI видається на непрофесійній основі фізичною особою Габріелем Кройтсером. Умови застосовуються до askfinance.ai, застосунку та їхніх функцій. Повні дані про видавця й хостинг наведено у правовій інформації.",
      ],
      [
        "2. Прийняття умов",
        "Створення облікового запису або використання сервісу означає прийняття чинної версії цих умов. Якщо користувач не погоджується, він не повинен створювати обліковий запис або користуватися захищеними просторами. Представник групи чи організації підтверджує наявність відповідних повноважень.",
      ],
      [
        "3. Опис сервісу",
        "AskFinance дає змогу створювати особисті, групові та бізнес-простори, додавати фінансові рахунки, імпортувати CSV-виписки, класифікувати транзакції, задавати бюджети, будувати показники й прогнози, вести спільні витрати або очікувані надходження та користуватися помічником Yassia. Постійного підключення до банку в поточній версії немає.",
      ],
      [
        "4. Обліковий запис і безпека",
        "Користувач надає точні дані й підтримує актуальність електронної адреси. Він повинен захищати дані входу, не передавати сесію та негайно повідомляти про підозрілий доступ. Він відповідає за дії у своїй сесії, крім шахрайського використання не з його вини. Сервіс призначений для повнолітніх або неповнолітніх із дозволом законного представника.",
      ],
      [
        "5. Простори, ролі та співпраця",
        "Власник простору обирає учасників і ролі. Учасники мають бачити лише дані, потрібні для їхньої участі. Групові та бізнес-простори можуть показувати інформацію іншим учасникам відповідно до дозволів. Власник відповідає за запрошення, доречність доступу та його своєчасне відкликання.",
      ],
      [
        "6. Дані й файли користувача",
        "Користувач зберігає права на свої дані та підтверджує законність їх імпорту, введення, обробки й поширення, зокрема виписок, даних третіх осіб, клієнтів і компаній. Видавець отримує обмежений дозвіл обробляти ці дані лише для роботи й захисту сервісу. Дозвіл припиняється після видалення, крім залишкових технічних копій і законних обов’язків.",
      ],
      [
        "7. Безкоштовна бета й зміни",
        "Поточний доступ безкоштовний та експериментальний. Платіжна картка не потрібна, а платна підписка за цими умовами не укладається. Функції можуть змінюватися, обмежуватися або вилучатися. Майбутня платна пропозиція матиме окремі комерційні умови до початку оплати.",
      ],
      [
        "8. Прогнози та штучний інтелект",
        "Прогнози базуються на доступних даних, правилах розрахунку й статистичних моделях. Yassia може передавати Google Gemini запит, інструкції та потрібний фінансовий контекст. Результати можуть бути неповними, приблизними або помилковими. Користувач перевіряє їх і сам ухвалює рішення. Yassia не ухвалює рішень, що автоматично створюють юридичні чи фінансові наслідки.",
      ],
      [
        "9. Не є регульованою консультацією",
        "AskFinance є інструментом організації й підтримки управління. Він не надає бухгалтерських, юридичних, податкових, банківських чи інвестиційних консультацій і не замінює відповідного фахівця або фінансову установу. Податкові суми, строки, попередження й сценарії орієнтовні.",
      ],
      [
        "10. Заборонене використання",
        "Заборонено обходити контроль доступу, досліджувати чужі дані, порушувати роботу сервісу, додавати шкідливий код, автоматизувати зловмисні запити, добувати секрети чи внутрішні інструкції, видавати себе за іншу особу, порушувати закон або права третіх осіб. Не можна імпортувати дані без законної підстави чи відкривати їх неуповноваженим учасникам.",
      ],
      [
        "11. Інтелектуальна власність",
        "Програмне забезпечення, інтерфейс, бренд AskFinance AI, тексти, графіка й функції захищені. Користувач отримує лише особисте, невиключне, непередаване й відкличне право користування відповідно до цих умов. Сторонні компоненти мають власні ліцензії. Права на дані користувача видавцю не передаються.",
      ],
      [
        "12. Доступність, обслуговування й безпека",
        "Видавець уживає розумних заходів для захисту й підтримки сервісу, але бета може містити помилки, перерви, проблеми продуктивності чи сумісності. Технічні роботи можуть спричинити тимчасову недоступність. Користувач зберігає копії потрібних документів і не використовує AskFinance як єдиний регуляторний архів.",
      ],
      [
        "13. Призупинення, закриття й видалення",
        "Доступ може бути призупинено через ризик безпеки, зловживання, порушення умов або законну вимогу органу влади. Користувач може видаляти доступні в інтерфейсі елементи й просити закриття облікового запису. Власник може видалити простір і пов’язані дані з урахуванням циклів резервного копіювання та законних вимог, описаних у політиці конфіденційності.",
      ],
      [
        "14. Відповідальність",
        "Кожна сторона відповідає за прямі збитки від свого порушення відповідно до закону. Видавець не відповідає за неперевірені рішення, неточні дані користувача, передавання доступу з вини користувача або перерви через інтернет чи постачальників поза розумним контролем. Обов’язкові права споживачів і відповідальність, яку не можна виключити, зберігаються.",
      ],
      [
        "15. Персональні дані",
        "Політика конфіденційності описує обробку персональних даних, отримувачів, строки, можливі передачі та права осіб. У спільних просторах певні дані видимі учасникам відповідно до призначених ролей.",
      ],
      [
        "16. Зміна умов",
        "Застосовується версія, опублікована під час користування сервісом. Про суттєві зміни користувача завчасно повідомлять належним способом, коли це потрібно. Подальше використання після дати набрання чинності означає згоду; інакше користувач може припинити використання й попросити закриття облікового запису.",
      ],
      [
        "17. Застосовне право та спори",
        "Умови регулюються правом Франції без позбавлення споживача обов’язкового захисту в країні проживання. Спочатку сторони шукають мирне вирішення, а юрисдикція визначається законом. Споживчого медіатора поки не призначено, оскільки чинна бета не продається професійним суб’єктом.",
      ],
    ],
    referencesTitle: "Пов’язані документи",
    legal: "Правова інформація",
    privacy: "Політика конфіденційності",
  },
} as const;

export default function TermsPage() {
  const copy = copies[getLocale()];

  return (
    <LegalDocument title={copy.title} updated={copy.date}>
      <p>{copy.intro}</p>
      {copy.sections.map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}
      <section>
        <h2>{copy.referencesTitle}</h2>
        <ul>
          <li>
            <Link href="/legal/mentions-legales">{copy.legal}</Link>
          </li>
          <li>
            <Link href="/legal/privacy">{copy.privacy}</Link>
          </li>
        </ul>
      </section>
    </LegalDocument>
  );
}
