import { createClient } from "@/lib/supabase/client";

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
  workspaceId: string
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
    body: JSON.stringify({ message, advisor, conversation_id: conversationId }),
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
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content as string,
  }));
}

export interface StreamCallbacks {
  onMeta?: (conversationId: string) => void;
  onStep?: (label: string) => void;
  onToken?: (text: string) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

// Envoie une question en streaming (SSE) et invoque les callbacks au fil de l'eau.
export async function streamAiChatMessage(
  message: string,
  advisor: AdvisorId,
  conversationId: string | null,
  workspaceId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Vous devez être connecté pour utiliser le copilote IA.");
  }

  const res = await fetch(`${API_URL}/ai/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": workspaceId,
    },
    body: JSON.stringify({ message, advisor, conversation_id: conversationId }),
  });

  if (!res.ok || !res.body) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ?? "Échec de l'appel au copilote IA.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Les événements SSE sont séparés par une ligne vide.
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      let event = "";
      let data = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      let parsed: {
        conversation_id?: string;
        label?: string;
        text?: string;
        message?: string;
      };
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      if (event === "meta" && parsed.conversation_id) {
        callbacks.onMeta?.(parsed.conversation_id);
      } else if (event === "step" && parsed.label) {
        callbacks.onStep?.(parsed.label);
      } else if (event === "token" && parsed.text !== undefined) {
        callbacks.onToken?.(parsed.text);
      } else if (event === "error" && parsed.message) {
        callbacks.onError?.(parsed.message);
      } else if (event === "done") {
        callbacks.onDone?.();
      }
    }
  }
}
