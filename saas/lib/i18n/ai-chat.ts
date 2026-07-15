import type { Locale } from "./config";
import type { AdvisorId } from "@/lib/services/ai-chat";

type AdvisorOption = {
  id: AdvisorId;
  label: string;
};

export const aiChatCopy = {
  fr: {
    newConversation: "Nouvelle conversation",
    noConversation: "Aucune conversation enregistrée.",
    untitledConversation: "Conversation sans titre",
    closeConversationList: "Fermer la liste des conversations",
    toggleConversations: "Afficher ou masquer les conversations",
    conversations: "Conversations",
    personalSubtitle: "Coach financier · répond à partir de vos données",
    businessSubtitle: "Copilote de trésorerie · répond à partir de vos données",
    advisorMode: "Mode de conseil",
    closeAssistant: "Fermer le copilote",
    thinking: (name: string) => `${name} réfléchit…`,
    greeting: (name: string) => `Bonjour, je suis ${name}`,
    personalIntroduction: "Votre coach financier personnel. Posez une question sur vos dépenses, votre budget ou vos prévisions. Je réponds à partir de vos données.",
    businessIntroduction: "Votre copilote de trésorerie. Posez une question sur votre trésorerie, vos dépenses ou vos prévisions. Je réponds à partir de vos données.",
    placeholder: (name: string) => `Écrire à ${name}…`,
    openAssistant: (name: string) => `Ouvrir ${name}`,
    sendError: "Le copilote n’a pas pu répondre.",
    loadError: "Impossible de charger cette conversation.",
    personalSuggestions: [
      "Où part mon argent ce mois-ci ?",
      "Puis-je tenir mon budget jusqu’à la fin du mois ?",
      "Quelles charges puis-je réduire ?",
    ],
    businessSuggestions: [
      "Compare mes dépenses de mai et juin",
      "Ai-je des abonnements en double ?",
      "Quelle est ma trésorerie prévisionnelle à 3 mois ?",
      "Résume mes dépenses fournisseurs",
    ],
    advisors: [
      { id: "controleur", label: "Prudence" },
      { id: "daf", label: "Pilotage" },
      { id: "croissance", label: "Croissance" },
    ] satisfies AdvisorOption[],
  },
  en: {
    newConversation: "New conversation",
    noConversation: "No saved conversations.",
    untitledConversation: "Untitled conversation",
    closeConversationList: "Close conversation list",
    toggleConversations: "Show or hide conversations",
    conversations: "Conversations",
    personalSubtitle: "Financial coach · answers using your data",
    businessSubtitle: "Cash flow copilot · answers using your data",
    advisorMode: "Advisory mode",
    closeAssistant: "Close copilot",
    thinking: (name: string) => `${name} is thinking…`,
    greeting: (name: string) => `Hi, I’m ${name}`,
    personalIntroduction: "Your personal financial coach. Ask about your spending, budget or forecasts. I answer using your data.",
    businessIntroduction: "Your cash flow copilot. Ask about your cash position, spending or forecasts. I answer using your data.",
    placeholder: (name: string) => `Message ${name}…`,
    openAssistant: (name: string) => `Open ${name}`,
    sendError: "The copilot could not answer.",
    loadError: "This conversation could not be loaded.",
    personalSuggestions: [
      "Where did my money go this month?",
      "Can I stay within budget until the end of the month?",
      "Which expenses can I reduce?",
    ],
    businessSuggestions: [
      "Compare my spending in May and June",
      "Do I have any duplicate subscriptions?",
      "What is my three-month cash flow forecast?",
      "Summarise my supplier expenses",
    ],
    advisors: [
      { id: "controleur", label: "Caution" },
      { id: "daf", label: "Management" },
      { id: "croissance", label: "Growth" },
    ] satisfies AdvisorOption[],
  },
  uk: {
    newConversation: "Нова розмова",
    noConversation: "Збережених розмов немає.",
    untitledConversation: "Розмова без назви",
    closeConversationList: "Закрити список розмов",
    toggleConversations: "Показати або приховати розмови",
    conversations: "Розмови",
    personalSubtitle: "Фінансовий помічник · відповідає на основі ваших даних",
    businessSubtitle: "Помічник із грошових потоків · відповідає на основі ваших даних",
    advisorMode: "Режим порад",
    closeAssistant: "Закрити помічника",
    thinking: (name: string) => `${name} думає…`,
    greeting: (name: string) => `Вітаю, я ${name}`,
    personalIntroduction: "Ваш особистий фінансовий помічник. Запитайте про витрати, бюджет або прогнози. Я відповідаю на основі ваших даних.",
    businessIntroduction: "Ваш помічник із грошових потоків. Запитайте про кошти, витрати або прогнози. Я відповідаю на основі ваших даних.",
    placeholder: (name: string) => `Написати ${name}…`,
    openAssistant: (name: string) => `Відкрити ${name}`,
    sendError: "Помічник не зміг відповісти.",
    loadError: "Не вдалося завантажити цю розмову.",
    personalSuggestions: [
      "На що пішли мої гроші цього місяця?",
      "Чи зможу я втриматися в межах бюджету до кінця місяця?",
      "Які витрати можна скоротити?",
    ],
    businessSuggestions: [
      "Порівняй мої витрати за травень і червень",
      "Чи є в мене дублікати підписок?",
      "Який прогноз грошових потоків на три місяці?",
      "Підсумуй мої витрати на постачальників",
    ],
    advisors: [
      { id: "controleur", label: "Обережність" },
      { id: "daf", label: "Управління" },
      { id: "croissance", label: "Зростання" },
    ] satisfies AdvisorOption[],
  },
} satisfies Record<Locale, Record<string, unknown>>;

export type AiChatCopy = (typeof aiChatCopy)[Locale];
