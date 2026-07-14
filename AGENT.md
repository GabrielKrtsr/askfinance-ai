# AGENT.md | AskFinance AI

Guide de contexte pour travailler sur ce projet (humain ou agent). Lis-le avant
toute modification.

---

## 1. Le projet

**AskFinance AI** est un **copilote de trésorerie** pour **TPE et PME** (positionnement **B2B**).
L'utilisateur importe ses relevés bancaires (CSV), visualise sa trésorerie, ses
dépenses, ses charges récurrentes et une prévision, et (à terme) discute avec une IA.

- **Cible** : TPE / PME (pas de particuliers). Vocabulaire **entreprise / trésorerie**.
- **Tarifs** : Essentiel 49 € / Business 99 € / Premium 199 € par mois.
- **Langue** : tout est en **français** (UI **et** commentaires de code).

---

## 2. Architecture

Deux sous-projets + Supabase :

```
askfinance-ai/
├── saas/             → Front Next.js 14 (App Router, TS, Tailwind) + auth
├── api-AskFinance/   → API FastAPI (Python) : analyses (pandas, scikit-learn)
└── AGENT.md
```

- **`saas/`** : interface, authentification (Supabase Auth), lecture des données
  (Server Components via le client Supabase serveur), affichage des dashboards.
- **`api-AskFinance/`** : tout ce qui est **analyse de données**, import CSV (pandas),
  charges récurrentes, prévision (scikit-learn), détection de virements.
- **Supabase** : Postgres + Auth (email/mot de passe + Google) + RLS.

### Flux d'authentification
- **Supabase Auth = la seule autorité** d'authentification. Émet les tokens.
- Le front utilise `@supabase/ssr` (cookies httpOnly). Google passe par `app/auth/callback`.
- **L'API Python ne gère PAS le login** : elle **vérifie** le token reçu
  (`supabase.auth.get_claims(token)` : signature vérifiée **localement** via JWKS
  mis en cache ; repli réseau `get_user` automatique si projet legacy HS256) et
  récupère le `user_id`. L'appartenance à l'espace est ensuite vérifiée en base,
  avec un cache mémoire court (60 s, succès uniquement) dans `controller/deps.py`.

### Flux de données
- **Import** : navigateur → bucket Supabase Storage privé → API FastAPI
  (`Authorization: Bearer <token>`) → téléchargement et traitement direct avec
  pandas → écriture en base avec la clé **service_role** → suppression du fichier
  temporaire. Aucun Redis ni worker Celery n'est requis.
- **Analyses** : navigateur → API FastAPI → validation du token → pandas/ML →
  lecture/écriture avec la clé **service_role** (qui contourne le RLS ; les droits
  de l'espace sont donc toujours vérifiés explicitement).
- **Lecture du dashboard** : Next.js (Server Components) lit Supabase via le client
  serveur → le **RLS** filtre par utilisateur.
- **Comptes / imports (CRUD)** : gérés côté front via supabase-js (RLS).

---

## 3. Modèle de données (Supabase)

| Table | Colonnes clés | Notes |
|---|---|---|
| `auth.users` | (Supabase) | géré par Supabase Auth |
| `profiles` | id (=auth.users.id), first_name, last_name | rempli par le trigger `handle_new_user` (email → first_name ; Google → given_name/full_name) |
| `accounts` | id, user_id, name, type, opening_balance | comptes bancaires de l'utilisateur (avec solde d'ouverture) |
| `imports` | id, user_id, account_id, filename, count | un **lot d'import** (annulable) |
| `transactions` | id, user_id, account_id, import_id, date, merchant, category, account, amount, type, status, is_transfer, fingerprint | voir ci-dessous |
| `budgets` | id, workspace_id, category, month, amount | budget variable par catégorie et par mois ; unicité `(workspace_id, category, month)` |
| `expected_receivables` | id, user_id, client, amount, due_date, note | échéancier des encaissements clients **déclarés** (RLS) ; rapprochés des crédits réels côté API |
| `tax_settings` | id, user_id (unique), provision_tva_taux, provision_social_taux, provision_is_taux, tva_periodicite, urssaf_periodicite | coffre-fort fiscal : **taux de provision (% du CA)** + périodicités, paramétrés par l'utilisateur (RLS) |
| `einvoice_checklist` | id, user_id, item_key, done, updated_at | checklist de préparation à la facture électronique (unique `(user_id, item_key)`, RLS) |
| `conversations` | id, user_id, title, created_at, updated_at | une discussion du copilote IA (RLS) ; `updated_at` remonté par trigger à chaque message |
| `messages` | id, conversation_id, user_id, role, content, created_at | messages d'une conversation (`role` = user/assistant) ; `on delete cascade` depuis `conversations` |

**`transactions`, règles importantes :**
- `amount` : `numeric(12,2)` (**jamais float**), négatif = débit.
- `date` : type `date` (**pas d'heure**, la source CSV ne la fournit pas).
- `is_transfer` : virement interne → **exclu des KPIs/analyses**, mais **compté dans les soldes**.
- `fingerprint` : `date|montant|libellé|référence|n°occurrence` → anti-doublon.
- Index **unique `(user_id, account_id, fingerprint)`** → l'upsert ignore les doublons
  au ré-import ; l'index d'occurrence garde les doublons **légitimes** (2 charges identiques le même jour).
- `import_id` → `imports(id) on delete cascade` : **annuler un import supprime ses transactions**.
- **RLS activé** sur `transactions`, `accounts`, `imports`, `budgets`, `profiles`
  (policy `using/with check (user_id = auth.uid())`).

Le SQL de migration complet est dans l'historique ; refléter tout changement de schéma ici.

---

## 4. Avancement (au 2026-07-14)

### ✅ Fait
- **Site public multi-segment** : accueil premium et pages Fonctionnalités,
  Solutions Solo/Groupe/Entreprise, Yassia IA et Sécurité ; navigation responsive
  et animations accessibles avec Motion. Les allégations non démontrées et faux
  témoignages ont été retirés.
- **Pages légales publiques** : mentions légales, confidentialité et CGU reliées
  à l'inscription. Les identités juridiques, coordonnées et hébergeurs manquants
  restent explicitement marqués à compléter avant publication commerciale.
- **Permissions par rôle** : `viewer` en lecture seule ; `member` contribue ;
  `admin`/`owner` valident les workflows et administrent les rôles. Les écritures
  sensibles workflow/audit passent uniquement par les actions serveur.
- **Workflows & audit** : demandes de validation, approbation/refus par responsable,
  changement de rôle hiérarchisé et journal immuable des actions sensibles.
- **Cycle facture → paiement → relance** : numéro de facture et contact, règlements
  complets ou partiels, reste à encaisser, brouillons/relances envoyées et audit.
- **Catégorisation apprenante** : correction manuelle + règle de libellé appliquée
  automatiquement aux prochains imports.
- **Budgets mensuels variables** : montants par catégorie et par mois, modification
  directe et reprise des catégories du mois précédent.
- **Inbox financière** : découvert, impayés, budgets, récurrents et fiscalité réunis,
  avec résolution et report persistants.
- **Cohérence multi-produit** : Yassia B2B dans `business`, coach financier sans
  outils fiscaux dans `personal`, masquée/refusée dans `group` tant qu'aucun outil
  dédié au registre partagé n'existe.
- **Auth** : email/mot de passe + Google (OAuth), profils (nom/prénom auto).
- **Import CSV direct, sans Redis/Celery** (Python/pandas, limite 10 Mo) : transit
  par le bucket Storage privé, auto-détection séparateur, formats FR (Débit/Crédit,
  virgule décimale, dates JJ/MM/AAAA), dédoublonnage (fingerprint + index d'occurrence),
  **popup d'import** (choix/création de compte), **lots annulables**.
- **Dashboard** : KPIs (solde de trésorerie, dépenses, revenus, **marge nette**),
  graphe flux de trésorerie, camembert par catégorie, suivi budgétaire (CRUD),
  transactions récentes, **sélecteur de mois**, **sélecteur de compte**.
- **Page Transactions** : liste, recherche, filtres (catégorie/type), tri par colonnes, intervalle de dates.
- **Charges récurrentes** (Python) : clustering marchand + intervalles + alertes (hausse/doublon).
- **Prévision 30/60/90 j** (Python/scikit-learn) : régression + récurrents planifiés,
  bande de confiance, **alerte découvert**.
- **Multi-compte** : comptes avec solde d'ouverture, vue par compte / consolidée.
- **Virements internes** : exclus des KPIs/récurrents/prévision ; détectés via tag banque
  + appariement des 2 jambes (bouton « Détecter virements »).
- **Radar des encaissements** (déclaratif) : l'utilisateur **déclare** les virements
  attendus (`expected_receivables` : client / montant / date prévue, CRUD front) ;
  l'API **rapproche** chaque attendu des crédits réels (montant + fenêtre de date) →
  statut **reçu / en retard / à venir** + **brouillon de relance**. Les attendus non
  reçus **alimentent la prévision** (entrées). (Choix de Gabriel : modèle déclaratif,
  on a abandonné l'inférence par clustering.)
- **Coffre-fort fiscal** (Python) : provision recommandée (**% du CA** par poste TVA/URSSAF/IS)
  + **échéances estimées** (calendrier FR usuel) **injectées dans la prévision** → l'alerte
  découvert tient enfin compte des charges fiscales. Réglages par utilisateur (`tax_settings`).
  ⚠️ Montants **indicatifs** (taux paramétrés, pas de régime fiscal réel), à valider en cabinet.
- **Préparation facture électronique 2026/2027** (front) : compte à rebours (réception
  01/09/2026, émission TPE-PME 01/09/2027), 4 nouvelles mentions obligatoires, **checklist
  persistée** (`einvoice_checklist`).
- **Nouveaux outils Yassia** : `get_overdue_receivables`, `get_tax_vault` (le copilote sait
  désormais parler impayés/relances et provisions/échéances).

### ⏳ À faire
- **Catégorisation IA** (LLM) des transactions « Non catégorisé », mise de côté.
- **Copilote IA / chat** : architecture **agent à outils** + **historique persistant**
  (tables `conversations`/`messages`, fenêtre de contexte) en place (voir §8).
  ✅ **Validé en live (2026-06-27)** : appel Interactions API + function-calling (le
  modèle choisit bien `get_kpis` pour une question de solde). Restent à valider : la
  **boucle complète** (résultat d'outil → réponse finale), la **mémoire multi-tours**
  (`model_output` réinjecté), et l'**endpoint complet** (auth JWT + persistance Supabase).
  Migration SQL à exécuter : `api-AskFinance/Infrastructure/2026-06-27_conversations.sql`.
- **⚠️ Migration SQL à exécuter** (coffre-fort fiscal + facture électronique) :
  `api-AskFinance/Infrastructure/2026-06-28_features.sql` (tables `tax_settings` +
  `einvoice_checklist` + RLS). Sans elle, les modules Coffre-fort fiscal et Facture
  électronique tomberont en erreur/état vide.
- **⚠️ Migration SQL à exécuter** (encaissements déclarés) :
  `api-AskFinance/Infrastructure/2026-06-29_expected_receivables.sql` (table
  `expected_receivables` + RLS). Sans elle, le Radar des encaissements sera vide.
- **Déploiement** de l'API Python (Render/Railway) + CORS prod + `NEXT_PUBLIC_API_URL`.
- Page **Comptes** dédiée ; filtre par compte + colonne compte sur la page Transactions.

---

## 5. Règles du projet (conventions)

1. **Positionnement B2B** : vocabulaire trésorerie (« Solde de trésorerie », « Marge nette »,
   « Flux de trésorerie »). **Pas** de vocabulaire grand public (« taux d'épargne »…).
2. **Français partout** : UI et commentaires de code.
3. **Argent** : `numeric` en base, jamais `float` ; formater avec `formatEUR` (`saas/lib/utils.ts`).
4. **Les analyses (pandas / ML) vivent dans l'API Python**, pas dans Next.js.
5. **Auth** : une seule autorité (Supabase). L'API Python **vérifie** le token, ne logge personne.
6. **Secrets** :
   - `SUPABASE_SERVICE_ROLE_KEY` (clé **secrète** `sb_secret_…`) → **uniquement** dans
     `api-AskFinance/.env`. Jamais côté front.
   - Clé **publishable** (`sb_publishable_…`) → `saas/.env.local` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
7. **RLS = barrière de sécurité** pour les lectures front. L'API Python utilise service_role
   et pose toujours `user_id` depuis le token validé (et vérifie que `account_id` appartient à l'utilisateur).
8. **Virements internes** : exclus des KPIs / récurrents / prévision ; inclus dans les soldes.
9. **Ne pas stocker ce qui n'est pas dans la source** (ex. pas d'heure de transaction).
10. **Vérifier avant de livrer** :
    - Front : `cd saas && node_modules/.bin/tsc --noEmit`
    - API : `cd api-AskFinance && python -m py_compile <fichiers>`

---

## 6. Lancer le projet (dev local)

**API Python** (terminal 1) :
```bash
cd api-AskFinance
cp .env.example .env        # renseigner SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (clé secrète)
.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
```

**Front Next.js** (terminal 2) :
```bash
cd saas
npm run dev                 # .env.local : NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / _API_URL
```

> Les deux serveurs doivent tourner pour l'import et les analyses.

### Endpoints API (`/transactions` sauf `/health`)
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/transactions/import` | importer directement un relevé déjà envoyé dans le bucket privé (`account_id`, `storage_path`, `filename`) |
| GET | `/transactions/recurring` | charges récurrentes |
| GET | `/transactions/forecast` | prévision 90 jours |
| GET | `/transactions/pilotage` | **endpoint groupé** page Pilotage : `{forecast, recurring, receivables}` en un appel (une seule validation de token + une seule lecture des transactions), consommé via `PilotageProvider` (contexte React) côté front |
| POST | `/transactions/detect-transfers` | apparier les virements internes |
| GET | `/transactions/receivables` | radar des encaissements (recettes récurrentes + retards) |
| GET | `/transactions/tax-vault` | coffre-fort fiscal (provision recommandée + échéances) |
| GET | `/ai/advisors` | liste des conseillers IA disponibles |
| POST | `/ai/chat` | copilote IA Gemini (`message`, `advisor`, `conversation_id` optionnel) → `answer`, `advisor`, `conversation_id` |
| POST | `/ai/chat/stream` | idem en **streaming SSE** → events `meta` / `step` / `token` / `error` / `done` |
| GET | `/health` | santé |

> **Synchro bancaire (reporté)** : la décision est prise d'utiliser
> [Enable Banking](https://enablebanking.com) (gratuit en sandbox et en
> « restricted production » ; Nordigen est fermé aux nouveaux inscrits) avec
> une interface `BankProvider` abstraite côté FastAPI, mais l'implémentation
> a été retirée le 2026-07-06 en attendant. Pour l'instant : import CSV.

---

## 7. Stack technique

- **Front** : Next.js 14 (App Router), React 18, TypeScript, Tailwind, composants
  type shadcn (Radix), Motion for React, recharts, sonner (toasts), `@supabase/ssr`.
- **API** : FastAPI, pandas, scikit-learn, supabase-py, uvicorn.
- **Base / Auth** : Supabase (Postgres + Auth + RLS).
- **Modèles IA** : Gemini côté API Python (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`) pour le copilote IA.

---

## 8. Copilote IA : architecture (agent unique à outils)

Un **seul agent** (pas de multi-agents) qui décide lui-même quelles données aller
chercher via le **function-calling** de l'Interactions API Gemini. Volontairement
simple et évolutif : on ajoute un outil = on ajoute une fonction + une déclaration.

```
controller/ai_controller.py   → endpoints /ai/advisors et /ai/chat
services/ai/
├── orchestrator.py   → boucle agent (system prompt → outils → réponse), repli si échec
├── prompts.py        → assemble prompt/*.md (socle + persona) + injecte la date
├── personas.py       → métadonnées des 3 personas (label/description) + normalisation
├── tools.py          → outils granulaires (adaptateurs fins) + registre + run_tool
└── gemini_client.py  → Interactions API (texte + function_call), modèle + fallbacks
prompt/
├── socle_commun.md   → SEULE source de vérité des règles métier IA + liste des outils
└── persona_*.md      → ton/lentille de chaque persona (controleur / daf / croissance)
```

**Principes :**
- **Classification d'intention = function-calling** : le modèle choisit les outils
  utiles à la question (au lieu de tout calculer à chaque message comme avant).
- **Outils = adaptateurs fins** au-dessus des services (`forecast`, `recurring`,
  `supabase_service`). Aucune analyse dans la couche LLM → pas de duplication.
- **Sécurité** : le `user_id` est injecté côté serveur ; il n'apparaît dans aucun
  schéma d'outil exposé au modèle (impossible de réclamer le compte d'autrui).
- **Personas** = lentille de ton, choisie par l'utilisateur (front). Les règles
  métier communes vivent dans `socle_commun.md`, pas dupliquées dans le code.
  L'assistant est nommé **Yassia** ; les 3 modes sont affichés **Prudence / Pilotage /
  Croissance** (les ids `controleur` / `daf` / `croissance` restent inchangés).
- **UI** : le chat est un **panneau latéral droit large** (≈780px en lg, pleine
  hauteur) à **deux colonnes** : sidebar gauche listant les conversations (persistante
  en lg, overlay repliable en dessous, type ChatGPT/Claude) + panneau de discussion.
  Sélecteur de mode discret en en-tête, état vide d'accueil + prompts suggérés,
  indicateur de frappe. Choix UX fondés HCI/CHI (onboarding, identité nommée =
  confiance/CASA, reconnaissance > rappel, pas d'occlusion du bouton flottant).
- **Robustesse** : boucle bornée (`MAX_TOOL_ROUNDS`) ; repli sur un appel unique
  avec contexte complet si le function-calling échoue.

**Historique de conversation (mémoire multi-tours) :**
- **Source de vérité = Supabase** (`conversations`/`messages`), pas l'état serveur de
  Gemini. L'API Python écrit les messages (service_role, `user_id` depuis le token) ;
  le front lit via supabase-js (RLS) pour lister et rouvrir les conversations.
- À chaque message, l'API recharge les **`HISTORY_WINDOW` (10)** derniers messages et
  les réinjecte au LLM (mode stateless via `history_item` → `user_input`/`model_output`).
  Fenêtre glissante pour borner coût/latence ; résumé des tours anciens = piste future.
- ✅ La mémoire multi-tours (`model_output` réinjecté via `gemini_client.history_item`)
  est confirmée en live (2026-06-27).

**Streaming (SSE) :**
- `gemini_client.stream_interaction()` : appel avec `stream: true`, parse les événements
  SSE (`step.start` / `step.delta` / `interaction.completed` / `error` / `[DONE]`) →
  événements internes `interaction_id` / `function_call` / `text` / `status` / `error`.
  Un `function_call` arrive **entier** dans `step.start` (`name` + `arguments`).
- `orchestrator.stream_financial_answer()` : même boucle d'outils, en générateur ;
  émet `step` (libellé d'outil) puis `token` (texte au fil de l'eau). Aucun gâchis :
  on streame la réponse finale directement (pas de double génération).
- `controller` `/ai/chat/stream` : `StreamingResponse` text/event-stream, persiste la
  réponse complète en fin de flux. L'`/ai/chat` non-streaming reste comme repli.
- Front : `streamAiChatMessage()` (fetch + ReadableStream) ; le chat affiche le
  **libellé d'étape réel** pendant les outils, puis le **texte token-par-token**.
- ✅ **Validé bout-en-bout dans l'app (2026-06-27)** : streaming live, libellés d'étape,
  texte token-par-token, persistance et sidebar fonctionnent.
- Correctif lié : `lib/supabase/server.ts` écrit les cookies dans un `try/catch`
  (interdit depuis un Server Component). ⚠️ **Pas de middleware Supabase** → la session
  n'est pas rafraîchie côté serveur ; à ajouter avant la prod (`saas/middleware.ts`).
