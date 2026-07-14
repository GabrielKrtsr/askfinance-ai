"use client";

import Link from "next/link";

import { Logo } from "@/components/logo";
import { useI18n } from "@/lib/i18n/client";
import { publicCommon } from "@/lib/i18n/public";

export function SiteFooter() {
  const { locale } = useI18n();
  const copy = publicCommon[locale];
  const columns = [
    { title: copy.product, links: [[copy.nav[0], "/features"], [copy.nav[2], "/ai"], [copy.nav[3], "/security"]] },
    { title: copy.nav[1], links: [[copy.solo, "/solutions/solo"], [copy.group, "/solutions/group"], [copy.business, "/solutions/business"]] },
    { title: copy.legal, links: [[copy.mentions, "/legal/mentions-legales"], [copy.privacy, "/legal/privacy"], [copy.terms, "/legal/terms"]] },
  ] as const;
  return (
    <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <Logo variant="light" />
            <p className="mt-4 text-sm leading-6 text-slate-400">
              {copy.footer}
            </p>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              {copy.disclaimer}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-semibold text-white">{column.title}</p>
                <ul className="mt-4 space-y-3">
                  {column.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-slate-400 transition-colors hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 AskFinance AI. {copy.rights}</span>
          <span>{copy.version}</span>
        </div>
      </div>
    </footer>
  );
}
