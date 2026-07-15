import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n/config";

export type AdvisorId = "controleur" | "daf" | "croissance";

export interface Advisor {
  id: AdvisorId;
  label: string;
  description: string;
}

export interface ChatResponse {
  answer: string;
  advisor: AdvisorId;
  conversation_id: string;
}

// Résumé d'une conversation (liste de l'historique).
export interface ConversationSummary {
  id: string;
  title: string | null;
  updated_at: string;
}

// Message stocké, tel que relu depuis la base.
export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const advisors: Advisor[] = [
  {
    id: "controleur",
    label: "Prudence",
    description: "Sécuriser : risques, découvert, charges fixes.",
  },
  {
    id: "daf",
    label: "Pilotage",
    description: "Piloter : marge, rentabilité, arbitrages.",
  },
  {
    id: "croissance",
    label: "Croissance",
    description: "Développer : opportunités, scénarios, optimisation.",
  },
];

// Envoie une question au copilote IA côté API Python.
// `conversationId` null => l'API crée une nouvelle conversation et renvoie son id.
export async function sendAiChatMessage(
  message: string,
  advisor: AdvisorId,
  conversationId: string | null,
  workspaceId: string,
  language: Locale
): Promise<ChatResponse> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Vous devez être connecté pour utiliser le copilote IA.");
  }

  const res = await fetch(`${API_URL}/ai/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": workspaceId,
    },
    body: JSON.stringify({
      message,
      advisor,
      conversation_id: conversationId,
      language,
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ?? "Échec de l'appel au copilote IA.");
  }

  return res.json();
}

// Liste les conversations de l'utilisateur dans cet espace.
// (RLS `conv_owner` : chacun ne voit que ses propres conversations.)
export async function getConversations(
  workspaceId: string
): Promise<ConversationSummary[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ConversationSummary[];
}

// Récupère les messages d'une conversation, dans l'ordre chronologique.
export async function getConversationMessages(
  conversationId: string
): Promise<StoredMessage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content as string,
  }));
}
