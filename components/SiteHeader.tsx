"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Logo } from "@/components/site/Logo";
import { isActivePath, primaryNav, withLang, type NavItem } from "@/components/site/nav";
import { useSession } from "@/components/site/use-session";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { asLang, type Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";
import { cn } from "@/lib/utils";

/** Reads `?lang=` and `?sample=` from the URL. Mount inside <Suspense> (see app/layout.tsx). */
export function SiteHeader() {
  const sp = useSearchParams();
  return <HeaderBar lang={asLang(sp.get("lang"))} search={sp.toString()} sample={sp.get("sample")} />;
}

/** "Sign in" or "My plans". Renders nothing when accounts are switched off for this deployment. */
function AccountLink({ lang, className, onNavigate }: { lang: Lang; className?: string; onNavigate?: () => void }) {
  const session = useSession();
  const s = shell(lang).account;
  if (!session.enabled || !session.ready) return null;
  const href = session.signedIn ? "/account" : "/signin";
  return (
    <Button asChild variant={session.signedIn ? "outline" : "default"} className={cn("h-9 rounded-lg px-3.5 text-[13px] font-semibold", className)}>
      <Link href={withLang(href, lang)} onClick={onNavigate}>
        {session.signedIn ? s.account : s.signIn}
      </Link>
    </Button>
  );
}

/**
 * The header itself, driven by props so it can also render as the Suspense fallback
 * (English, no query) while a statically prerendered page reads its query on the client.
 */
export function HeaderBar({ lang, search, sample }: { lang: Lang; search: string; sample: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const s = shell(lang);
  const items: NavItem[] = primaryNav(lang).map((item) =>
    item.key === "report" && sample ? { ...item, href: `/report?sample=${encodeURIComponent(sample)}` } : item,
  );

  return (
    <header
      lang={lang}
      className="no-print sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70"
    >
      <div className="page-container flex h-16 items-center justify-between gap-3">
        <Link
          href={withLang("/", lang)}
          aria-label={s.homeAria}
          className="-m-1 shrink-0 rounded-xl p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>

        <nav aria-label={s.mainNav} className="hidden lg:block">
          <MotionConfig reducedMotion="user">
            <LayoutGroup id="site-nav">
              <ul className="flex items-center gap-0.5 rounded-lg bg-muted/70 p-1 ring-1 ring-foreground/5">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.key} className="relative">
                      {active && (
                        <motion.span
                          layoutId="site-nav-active"
                          aria-hidden="true"
                          className="absolute inset-0 rounded-md bg-card shadow-[0_1px_2px_rgb(42_40_56/0.08)] ring-1 ring-foreground/10"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        />
                      )}
                      <Link
                        href={withLang(item.href, lang)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative z-10 inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 xl:px-3.5 xl:text-sm",
                          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </LayoutGroup>
          </MotionConfig>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher lang={lang} search={search} className="max-[359px]:hidden" />
          <AccountLink lang={lang} className="max-sm:hidden" />

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" className="rounded-lg lg:hidden" aria-label={s.menu.open}>
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              showCloseButton={false}
              lang={lang}
              className="gap-0 bg-background p-0 data-[side=right]:w-[min(20rem,85vw)]"
            >
              <SheetHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3.5">
                <div className="min-w-0">
                  <SheetTitle className="text-base font-bold">{s.menu.title}</SheetTitle>
                  <SheetDescription className="mt-0.5">{s.menu.description}</SheetDescription>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="-mr-1 shrink-0 rounded-md" aria-label={s.menu.close}>
                    <X aria-hidden="true" />
                  </Button>
                </SheetClose>
              </SheetHeader>

              <nav aria-label={s.mainNav} className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <li key={item.key}>
                        <Link
                          href={withLang(item.href, lang)}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
                          )}
                        >
                          {item.label}
                          {active ? (
                            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                          ) : (
                            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="border-t border-border p-4">
                <AccountLink lang={lang} className="mb-4 w-full sm:hidden" onNavigate={() => setMenuOpen(false)} />
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{s.language}</p>
                <LanguageSwitcher lang={lang} search={search} onNavigate={() => setMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
