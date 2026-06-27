"use client";

import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openFloatingAiChat } from "@/components/dashboard/floating-ai-chat";

export function OpenAiChatButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      className="mt-4 w-full"
      onClick={openFloatingAiChat}
    >
      <MessageSquareText className="h-4 w-4" />
      Ouvrir le copilote
    </Button>
  );
}
