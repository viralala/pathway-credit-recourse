"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Logo } from "@/components/site/Logo";
import { isActivePath, primaryNav, withLang } from "@/components/site/nav";
import { useSession } from "@/components/site/use-session";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { asLang, type Lang } from "@/lib/i18n";
import { shell } from "@/lib/strings/shell";
import { cn } from "@/lib/utils";

/** Reads `?lang=` from the URL. Mount inside <Suspense> (see app/layout.tsx). */
export function SiteHeader() {
  const sp = useSearchParams();
  return <HeaderBar lang={asLang(sp.get("lang"))} search={sp.toString()} />;
}

/** "Sign in" or "My plans", once the session is known. Nothing at all when accounts are off. */
function AccountLink({ lang, className, onNavigate }: { lang: Lang; className?: string; onNavigate?: () => void }) {
  const session = useSession();
  const s = shell(lang).account;
  if (!session.enabled || !session.ready) return null;
  const href = session.signedIn ? "/account" : "/signin";
  return (
    <Button asChild variant={session.signedIn ? "outline" : "default"} className={cn("h-9 px-3.5 text-[13px] font-semibold", className)}>
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
export function HeaderBar({ lang, search }: { lang: Lang; search: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const s = shell(lang);
  const items = primaryNav(lang);

  return (
    <header lang={lang} className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="page-container flex h-16 items-center justify-between gap-4">
        <Link
          href={withLang("/", lang)}
          aria-label={s.homeAria}
          className="-m-1 shrink-0 rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>

        <nav aria-label={s.mainNav} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={withLang(item.href, lang)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-16 items-center px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary after:transition-opacity",
                      active ? "text-foreground after:opacity-100" : "text-muted-foreground after:opacity-0 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher lang={lang} search={search} className="max-[359px]:hidden" />
          <AccountLink lang={lang} className="hidden sm:inline-flex" />

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" className="lg:hidden" aria-label={s.menu.open}>
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
                  <Button variant="ghost" size="icon" className="-mr-1 shrink-0" aria-label={s.menu.close}>
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
                            "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted",
                          )}
                        >
                          {item.label}
                          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <AccountLink lang={lang} className="mt-4 w-full" onNavigate={() => setMenuOpen(false)} />
              </nav>

              <div className="border-t border-border p-4">
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
