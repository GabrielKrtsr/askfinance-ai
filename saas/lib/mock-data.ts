// Données fictives. Aucune source externe, tout est codé en dur.

export const company = {
  name: "Atelier Dupont SARL",
  plan: "Pro",
  user: {
    name: "Camille Moreau",
    role: "Directrice financière",
    email: "camille.moreau@atelierdupont.fr",
    initials: "CM",
  },
};

export type Trend = "up" | "down";

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  hint: string;
}

export const kpis: Kpi[] = [
  {
    label: "Solde de trésorerie",
    value: "48 250 €",
    delta: "+12,4 %",
    trend: "up",
    hint: "vs mois dernier",
  },
  {
    label: "Dépenses du mois",
    value: "18 940 €",
    delta: "+4,1 %",
    trend: "up",
    hint: "vs mois dernier",
  },
  {
    label: "Revenus du mois",
    value: "31 200 €",
    delta: "+8,7 %",
    trend: "up",
    hint: "vs mois dernier",
  },
  {
    label: "Marge nette",
    value: "39,3 %",
    delta: "-1,2 %",
    trend: "down",
    hint: "vs mois dernier",
  },
];

// Flux de trésorerie sur 12 mois (revenus vs dépenses)
export const cashflow = [
  { mois: "Juil.", revenus: 24500, depenses: 16800 },
  { mois: "Août", revenus: 21800, depenses: 15200 },
  { mois: "Sept.", revenus: 27300, depenses: 18100 },
  { mois: "Oct.", revenus: 29100, depenses: 17600 },
  { mois: "Nov.", revenus: 26400, depenses: 19200 },
  { mois: "Déc.", revenus: 33800, depenses: 22400 },
  { mois: "Janv.", revenus: 28600, depenses: 18900 },
  { mois: "Févr.", revenus: 25900, depenses: 16400 },
  { mois: "Mars", revenus: 30200, depenses: 20100 },
  { mois: "Avr.", revenus: 29800, depenses: 18300 },
  { mois: "Mai", revenus: 32100, depenses: 19700 },
  { mois: "Juin", revenus: 31200, depenses: 18940 },
];

// Répartition des dépenses par catégorie (camembert)
export const spendingByCategory = [
  { categorie: "Salaires", montant: 8200, couleur: "#4f46e5" },
  { categorie: "Fournisseurs", montant: 4100, couleur: "#14b8a6" },
  { categorie: "Loyer & charges", montant: 2600, couleur: "#6366f1" },
  { categorie: "Logiciels & SaaS", montant: 1480, couleur: "#0ea5e9" },
  { categorie: "Marketing", montant: 1340, couleur: "#f59e0b" },
  { categorie: "Déplacements", montant: 1220, couleur: "#ec4899" },
];

export interface Budget {
  categorie: string;
  depense: number;
  budget: number;
}

export const budgets: Budget[] = [
  { categorie: "Fournisseurs", depense: 4100, budget: 5000 },
  { categorie: "Logiciels & SaaS", depense: 1480, budget: 1500 },
  { categorie: "Marketing", depense: 1340, budget: 1200 },
  { categorie: "Déplacements", depense: 1220, budget: 2000 },
];

export type TxType = "debit" | "credit";

export interface Transaction {
  id: string;
  date: string; // JJ/MM/AAAA
  merchant: string;
  category: string;
  account: string;
  amount: number; // négatif = débit
  type: TxType;
  status: "Validé" | "En attente";
}

export const categories = [
  "Salaires",
  "Fournisseurs",
  "Loyer & charges",
  "Logiciels & SaaS",
  "Marketing",
  "Déplacements",
  "Revenus",
  "Impôts & taxes",
  "Restauration",
];

export const transactions: Transaction[] = [
  { id: "TX-1042", date: "10/06/2026", merchant: "Virement client, Lefèvre & Cie", category: "Revenus", account: "Compte courant Pro", amount: 6800, type: "credit", status: "Validé" },
  { id: "TX-1041", date: "09/06/2026", merchant: "OVHcloud", category: "Logiciels & SaaS", account: "Carte Pro Visa", amount: -89.9, type: "debit", status: "Validé" },
  { id: "TX-1040", date: "09/06/2026", merchant: "SNCF Connect", category: "Déplacements", account: "Carte Pro Visa", amount: -154.0, type: "debit", status: "Validé" },
  { id: "TX-1039", date: "08/06/2026", merchant: "Métro Cash & Carry", category: "Fournisseurs", account: "Compte courant Pro", amount: -512.34, type: "debit", status: "Validé" },
  { id: "TX-1038", date: "07/06/2026", merchant: "Google Workspace", category: "Logiciels & SaaS", account: "Carte Pro Visa", amount: -57.6, type: "debit", status: "Validé" },
  { id: "TX-1037", date: "06/06/2026", merchant: "URSSAF", category: "Impôts & taxes", account: "Compte courant Pro", amount: -2340.0, type: "debit", status: "Validé" },
  { id: "TX-1036", date: "05/06/2026", merchant: "La Poste, Colissimo", category: "Fournisseurs", account: "Carte Pro Visa", amount: -78.2, type: "debit", status: "Validé" },
  { id: "TX-1035", date: "05/06/2026", merchant: "Virement client, Studio Marbre", category: "Revenus", account: "Compte courant Pro", amount: 4200, type: "credit", status: "Validé" },
  { id: "TX-1034", date: "04/06/2026", merchant: "Boulangerie Pichard", category: "Restauration", account: "Carte Pro Visa", amount: -34.5, type: "debit", status: "Validé" },
  { id: "TX-1033", date: "03/06/2026", merchant: "Loyer, SCI des Lilas", category: "Loyer & charges", account: "Compte courant Pro", amount: -2600.0, type: "debit", status: "Validé" },
  { id: "TX-1032", date: "03/06/2026", merchant: "LinkedIn Ads", category: "Marketing", account: "Carte Pro Visa", amount: -420.0, type: "debit", status: "Validé" },
  { id: "TX-1031", date: "02/06/2026", merchant: "Salaires, juin (lot)", category: "Salaires", account: "Compte courant Pro", amount: -8200.0, type: "debit", status: "Validé" },
  { id: "TX-1030", date: "02/06/2026", merchant: "Total Énergies", category: "Loyer & charges", account: "Carte Pro Visa", amount: -186.7, type: "debit", status: "Validé" },
  { id: "TX-1029", date: "01/06/2026", merchant: "Notion Labs", category: "Logiciels & SaaS", account: "Carte Pro Visa", amount: -48.0, type: "debit", status: "En attente" },
  { id: "TX-1028", date: "31/05/2026", merchant: "Uber", category: "Déplacements", account: "Carte Pro Visa", amount: -27.4, type: "debit", status: "Validé" },
  { id: "TX-1027", date: "30/05/2026", merchant: "Virement client, Atelier Caron", category: "Revenus", account: "Compte courant Pro", amount: 5100, type: "credit", status: "Validé" },
  { id: "TX-1026", date: "29/05/2026", merchant: "Amazon Business", category: "Fournisseurs", account: "Carte Pro Visa", amount: -243.18, type: "debit", status: "Validé" },
  { id: "TX-1025", date: "28/05/2026", merchant: "Adobe Creative Cloud", category: "Logiciels & SaaS", account: "Carte Pro Visa", amount: -71.99, type: "debit", status: "Validé" },
  { id: "TX-1024", date: "27/05/2026", merchant: "Restaurant Le Comptoir", category: "Restauration", account: "Carte Pro Visa", amount: -96.0, type: "debit", status: "Validé" },
  { id: "TX-1023", date: "26/05/2026", merchant: "Free Pro, Fibre", category: "Loyer & charges", account: "Compte courant Pro", amount: -49.99, type: "debit", status: "Validé" },
  { id: "TX-1022", date: "25/05/2026", merchant: "Leroy Merlin", category: "Fournisseurs", account: "Carte Pro Visa", amount: -318.75, type: "debit", status: "Validé" },
  { id: "TX-1021", date: "24/05/2026", merchant: "Meta Ads", category: "Marketing", account: "Carte Pro Visa", amount: -510.0, type: "debit", status: "Validé" },
];

// Conversation pré-remplie pour le Copilote IA
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const chatHistory: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "Bonjour Camille 👋 Je suis votre copilote financier. Je peux analyser vos dépenses, repérer des anomalies et vous aider à préparer vos prévisions. Que souhaitez-vous savoir ?",
  },
  {
    id: "m2",
    role: "user",
    content: "Quelles sont mes 3 plus grosses dépenses ce mois-ci ?",
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "Vos trois principaux postes de dépenses en juin sont :\n\n1. **Salaires** : 8 200 € (43 %)\n2. **Fournisseurs** : 4 100 € (22 %)\n3. **Loyer & charges** : 2 600 € (14 %)\n\nÀ noter : le poste Marketing (1 340 €) dépasse de 12 % le budget que vous aviez fixé. Voulez-vous que je détaille ?",
  },
];

export const chatSuggestions = [
  "Compare mes dépenses de mai et juin",
  "Ai-je des abonnements en double ?",
  "Quelle est ma trésorerie prévisionnelle à 3 mois ?",
  "Résume mes dépenses fournisseurs",
];

export { formatEUR } from "@/lib/utils";
