"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonthOption } from "@/lib/data/dashboard";

export function MonthSelect({
  months,
  selected,
}: {
  months: MonthOption[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={selected}
      onValueChange={(value) => router.push(`${pathname}?month=${value}`)}
    >
      <SelectTrigger className="w-[170px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
