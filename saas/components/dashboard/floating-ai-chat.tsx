"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Loader2,
  MessageSquarePlus,
  PanelLeft,
  X,
} from "lucide-react";

import { chatSuggestions, type ChatMessage } from "@/lib/mock-data";
import {
  advisors,
  getConversationMessages,
  getConversations,
  streamAiChatMessage,
  type AdvisorId,
  type ConversationSummary,
} from "@/lib/services/ai-chat";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OPEN_CHAT_EVENT = "askfinance:open-ai-chat";
// Nom de l'assistant : une identité nommée renforce la confiance (paradigme CASA).
const ASSISTANT_NAME = "Yassia";

export function openFloatingAiChat() {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
}

function isDesktop() {
  return typeof window !== "undefined" && window.innerWidth >= 1024;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`}>
        <InlineMarkdown text={paragraph.join(" ")} />
      </p>
    );
    paragraph = [];
  }

  function flushList() {
    if (!listType || listItems.length === 0) return;
    const Tag = listType;
    blocks.push(
      <Tag key={`list-${blocks.length}`} className="space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={index}>
            <InlineMarkdown text={item} />
          </li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const className =
        level === 1
          ? "text-base font-semibold"
          : level === 2
            ? "text-sm font-semibold"
            : "text-sm font-semibold text-foreground";
      blocks.push(
        <h3 key={`h-${blocks.length}`} className={className}>
          <InlineMarkdown text={heading[2]} />
        </h3>
      );
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unordered[1]);
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(ordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}

function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-teal",
        className
      )}
    >
      <Image
        src="/yassia-avatar.png"
        alt=""
        fill
        sizes="56px"
        className="object-cover"
        priority
      />
    </span>
  );
}

function Bubble({
  message,
  userInitials,
}: {
  message: ChatMessage;
  userInitials: string;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {userInitials}
        </div>
      ) : (
        <AssistantAvatar className="h-8 w-8" />
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "whitespace-pre-line rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border bg-card text-card-foreground [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
        )}
      >
        {isUser ? message.content : <MarkdownMessage content={message.content} />}
      </div>
    </div>
  );
}

// Indicateur d'attente : points animés + libellé d'étape réel (venu du streaming).
function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex gap-3">
      <AssistantAvatar className="h-8 w-8" />
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function FloatingAiChat({
  userInitials,
  workspaceId,
  workspaceType,
}: {
  userInitials: string;
  workspaceId: string;
  workspaceType: "personal" | "business";
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [advisor, setAdvisor] = useState<AdvisorId>("daf");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = workspaceType === "personal"
    ? ["Où part mon argent ce mois-ci ?", "Puis-je tenir mon budget jusqu’à la fin du mois ?", "Quelles charges puis-je réduire ?"]
    : chatSuggestions;

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
      setSidebarOpen(isDesktop());
    }
    window.addEventListener(OPEN_CHAT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handleOpen);
  }, []);

  // Charge la liste des conversations à l'ouverture du panneau.
  useEffect(() => {
    if (!open) return;
    let active = true;
    getConversations(workspaceId)
      .then((items) => active && setConversations(items))
      .catch(() => active && setConversations([]));
    return () => {
      active = false;
    };
  }, [open, workspaceId]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  async function refreshConversations() {
    try {
      setConversations(await getConversations(workspaceId));
    } catch {
      /* liste laissée en l'état */
    }
  }

  function openPanel() {
    setOpen(true);
    setSidebarOpen(isDesktop());
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: trimmed },
    ]);
    setInput("");
    setError(null);
    setIsSending(true);
    setAwaitingFirstToken(true);
    setStepLabel(`${ASSISTANT_NAME} réfléchit…`);
    scrollToBottom();

    // Id du message assistant en cours de stream, décidé HORS du updater
    // setMessages pour que celui-ci reste pur (sinon React StrictMode le casse).
    let assistantId: string | null = null;

    try {
      await streamAiChatMessage(trimmed, advisor, conversationId, workspaceId, {
        onMeta: (cid) => setConversationId(cid),
        onStep: (label) => setStepLabel(label),
        onToken: (token) => {
          setAwaitingFirstToken(false);
          if (assistantId === null) {
            const id = `a-${Date.now()}`;
            assistantId = id;
            setMessages((prev) => [
              ...prev,
              { id, role: "assistant", content: token },
            ]);
          } else {
            const id = assistantId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, content: m.content + token } : m
              )
            );
          }
          scrollToBottom();
        },
        onError: (message) => {
          setError(message);
          setAwaitingFirstToken(false);
        },
      });
      refreshConversations();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Le copilote n'a pas pu répondre.";
      setError(message);
    } finally {
      setIsSending(false);
      setAwaitingFirstToken(false);
      setStepLabel(null);
      scrollToBottom();
    }
  }

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setError(null);
    if (!isDesktop()) setSidebarOpen(false);
  }

  async function openConversation(id: string) {
    if (id === conversationId) {
      if (!isDesktop()) setSidebarOpen(false);
      return;
    }
    setError(null);
    setConversationId(id);
    if (!isDesktop()) setSidebarOpen(false);
    try {
      const stored = await getConversationMessages(id);
      setMessages(
        stored.map((message, index) => ({
          id: `db-${id}-${index}`,
          role: message.role,
          content: message.content,
        }))
      );
      scrollToBottom();
    } catch {
      setError("Impossible de charger cette conversation.");
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {open ? (
        <aside className="fixed inset-0 z-50 flex w-full overflow-hidden border-l bg-background shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[460px] lg:w-[780px]">
          {/* Sidebar des conversations : persistante en lg, overlay en dessous. */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 z-10 flex w-64 flex-col border-r bg-muted/30 lg:static lg:z-auto",
              sidebarOpen ? "flex" : "hidden"
            )}
          >
            <div className="p-3">
              <Button
                type="button"
                variant="outline"
                onClick={startNewConversation}
                className="w-full justify-start gap-2"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Nouvelle conversation
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {conversations.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Aucune conversation enregistrée.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => openConversation(conversation.id)}
                        className={cn(
                          "w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-background",
                          conversation.id === conversationId
                            ? "bg-background font-medium text-foreground shadow-sm"
                            : "text-muted-foreground"
                        )}
                        title={conversation.title || "Conversation sans titre"}
                      >
                        {conversation.title || "Conversation sans titre"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Voile pour fermer la sidebar en mode overlay (petit écran). */}
          {sidebarOpen ? (
            <button
              type="button"
              aria-label="Fermer la liste des conversations"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-[5] bg-black/20 lg:hidden"
            />
          ) : null}

          {/* Panneau de conversation. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-2 border-b px-3 py-3">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setSidebarOpen((value) => !value)}
                aria-label="Afficher/masquer les conversations"
                title="Conversations"
                className={sidebarOpen ? "text-primary" : undefined}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <AssistantAvatar className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{ASSISTANT_NAME}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {workspaceType === "personal" ? "Coach financier · répond à partir de vos données" : "Copilote de trésorerie · répond à partir de vos données"}
                </p>
              </div>
              <Select
                value={advisor}
                onValueChange={(value) => setAdvisor(value as AdvisorId)}
              >
                <SelectTrigger
                  className="h-9 w-[130px] text-xs"
                  aria-label="Mode de conseil"
                  title="Mode de conseil"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le copilote"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-muted/20 px-4 py-5"
            >
              {hasMessages ? (
                <div className="mx-auto max-w-2xl space-y-4">
                  {messages.map((message) => (
                    <Bubble
                      key={message.id}
                      message={message}
                      userInitials={userInitials}
                    />
                  ))}
                  {isSending && awaitingFirstToken ? (
                    <TypingIndicator
                      label={stepLabel ?? `${ASSISTANT_NAME} réfléchit…`}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 px-4 text-center">
                  <AssistantAvatar className="h-14 w-14" />
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold">
                      Bonjour, je suis {ASSISTANT_NAME}
                    </h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                      {workspaceType === "personal"
                        ? "Votre coach financier personnel. Posez une question sur vos dépenses, votre budget ou vos prévisions. Je réponds à partir de vos données."
                        : "Votre copilote de trésorerie. Posez une question sur votre trésorerie, vos dépenses ou vos prévisions. Je réponds à partir de vos données."}
                    </p>
                  </div>
                  <div className="w-full max-w-md space-y-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        disabled={isSending}
                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  send(input);
                }}
                className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={`Écrire à ${ASSISTANT_NAME}…`}
                  disabled={isSending}
                  className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </form>
              {error ? (
                <p className="mt-2 text-center text-xs text-destructive">{error}</p>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}

      {/* Bouton flottant (avatar de Yassia), masqué quand le panneau est ouvert. */}
      {!open ? (
        <button
          type="button"
          onClick={openPanel}
          aria-label={`Ouvrir ${ASSISTANT_NAME}`}
          title={`Ouvrir ${ASSISTANT_NAME}`}
          className="fixed bottom-4 right-4 z-50 h-14 w-14 overflow-hidden rounded-full shadow-2xl ring-1 ring-border transition-transform hover:scale-105 sm:bottom-5 sm:right-5"
        >
          <AssistantAvatar className="h-full w-full" />
        </button>
      ) : null}
    </>
  );
}
