import type { ReactNode } from "react";

import { Reveal } from "@/components/landing/reveal";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="public-grid relative overflow-hidden border-b border-white/10">
      <div className="public-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{eyebrow}</p>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-slate-300">
            {description}
          </p>
          {children ? <div className="mt-8">{children}</div> : null}
        </Reveal>
      </div>
    </section>
  );
}
