"use client";

import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openFloatingAiChat } from "@/components/dashboard/floating-ai-chat";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

export function OpenAiChatButton() {
  const { locale } = useI18n();
  return (
    <Button
      type="button"
      variant="secondary"
      className="mt-4 w-full"
      onClick={openFloatingAiChat}
    >
      <MessageSquareText className="h-4 w-4" />
      {dashboardCopy[locale].charts.openCopilot}
    </Button>
  );
}
