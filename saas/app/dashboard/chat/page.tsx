"use client";

import { useRef, useState } from "react";
import { ArrowUp, Bot, Plus, Sparkles } from "lucide-react";

import {
  chatHistory,
  chatSuggestions,
  company,
  type ChatMessage,
} from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Réponse pré-écrite (aucune API) renvoyée pour toute nouvelle question.
const CANNED_REPLY =
  "D'après vos données : vos dépenses du mois s'élèvent à 1 940 € pour 2 850 € de revenus, soit un taux d'épargne de 32 %. Votre plus gros poste reste l'Alimentation (420 €). Voulez-vous que je détaille une catégorie ?";

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isUser
            ? "bg-muted text-foreground"
            : "bg-gradient-to-br from-primary to-teal text-white"
        )}
      >
        {isUser ? company.user.initials : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border bg-card text-card-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const botMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: CANNED_REPLY,
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Copilote IA</h1>
            <p className="text-xs text-muted-foreground">
              Analyse en temps réel de vos finances
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle conversation
        </Button>
      </div>

      {/* Fil de discussion */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 space-y-5 overflow-y-auto rounded-xl border bg-muted/20 p-4 sm:p-6"
      >
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 pt-4">
        {chatSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Posez une question sur vos finances…"
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>
      <p className="pt-2 text-center text-xs text-muted-foreground">
        Le copilote peut faire des erreurs. Vérifiez les informations
        importantes.
      </p>
    </div>
  );
}
