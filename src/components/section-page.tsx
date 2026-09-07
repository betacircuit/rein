import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export function SectionPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  items,
  notice,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: readonly { title: string; description: string; href?: Route }[];
  notice?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div>
      <section className="border-2 border-black bg-[var(--surface)] p-5 shadow-[6px_6px_0_#101010] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center border-2 border-black bg-[var(--cyan)] text-black">
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="rein-meta text-black uppercase">[ {eyebrow} ]</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-balance text-[var(--ink)] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pretty text-[var(--muted-ink)] sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {notice && (
          <p className="mt-6 border-2 border-black bg-[var(--info-wash)] px-4 py-3 text-sm leading-6 font-bold text-[var(--info-ink)]">
            {notice}
          </p>
        )}
      </section>
      <section
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        aria-label={`${title} 기능`}
      >
        {items.map((item) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-9 place-items-center border-2 border-black bg-[var(--orange)] text-black">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                </span>
                {item.href && (
                  <ArrowRight aria-hidden="true" className="size-4 text-[var(--muted-ink)]" />
                )}
              </div>
              <h2 className="mt-5 text-base font-extrabold text-[var(--ink)]">{item.title}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">{item.description}</p>
            </>
          );
          return item.href ? (
            <Link
              className="rein-pressable min-h-44 border-2 border-black bg-[var(--surface)] p-5 shadow-[5px_5px_0_#101010] transition-[transform,box-shadow] duration-100 focus-visible:outline-none motion-reduce:transition-none"
              href={item.href}
              key={item.title}
            >
              {body}
            </Link>
          ) : (
            <article
              className="min-h-44 border-2 border-black bg-[var(--surface)] p-5 shadow-[5px_5px_0_#101010]"
              key={item.title}
            >
              {body}
            </article>
          );
        })}
      </section>
      {children}
    </div>
  );
}
