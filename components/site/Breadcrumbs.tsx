import Link from "next/link";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface Crumb {
  label: string;
  /** Omit on the last crumb (the current page). */
  href?: string;
}

/**
 * Breadcrumb trail for every page except the home page. "Home" is added automatically.
 * Server component: pass already-localized labels and hrefs (keep `?lang=` on hrefs yourself).
 *
 *   <Breadcrumbs items={[{ label: "Offer check" }]} homeHref="/?lang=hi" homeLabel="होम" />
 */
export function Breadcrumbs({
  items,
  homeHref = "/",
  homeLabel = "Home",
  className,
}: {
  items: Crumb[];
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}) {
  const all: Crumb[] = [{ label: homeLabel, href: homeHref }, ...items];
  return (
    <Breadcrumb className={className ?? "no-print"}>
      <BreadcrumbList>
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <BreadcrumbItem>
                {last || !c.href ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
