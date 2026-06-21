import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "dark",
  href = "/",
}: {
  className?: string;
  variant?: "dark" | "light";
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo-icon.png"
        alt="AskFinance AI"
        width={498}
        height={512}
        priority
        className="h-8 w-auto"
      />
      <span className="text-lg font-semibold tracking-tight">
        <span className={variant === "light" ? "text-white" : "text-foreground"}>
          Ask
        </span>
        <span className={variant === "light" ? "text-teal" : "text-primary"}>
          finance-ai
        </span>
      </span>
    </Link>
  );
}
