"use client";

import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { withLang } from "@/components/site/nav";
import type { Lang } from "@/lib/i18n";

export function UserMenu({ lang }: { lang: Lang }) {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-9 w-20 animate-pulse rounded-full bg-muted/60" />
    );
  }

  if (!user) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => signInWithGoogle("/dashboard")}
        className="h-9 gap-2 rounded-full px-3.5 text-xs font-bold shadow-xs sm:text-[13px]"
      >
        <LogIn className="size-3.5" aria-hidden="true" />
        <span>Continue with Google</span>
      </Button>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={withLang("/dashboard", lang)}
        className="group flex items-center gap-2 rounded-full bg-muted/70 py-1 pr-3 pl-1 text-xs font-semibold ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt={displayName}
            className="size-7 rounded-full object-cover ring-1 ring-border"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="max-w-[100px] truncate text-foreground sm:max-w-[130px]">
          {displayName}
        </span>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => signOut()}
        className="size-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="Log out"
        aria-label="Log out"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
