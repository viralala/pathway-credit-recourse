"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ExternalLink,
  Landmark,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  FileText,
  Percent,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { evaluateSchemeEligibility } from "@/lib/schemes/matcher";
import { normalizeApplicantForSchemes } from "@/lib/schemes/normalizer";
import { rankSchemeMatches } from "@/lib/schemes/ranker";
import { SEED_GOVERNMENT_SCHEMES } from "@/lib/schemes/seed-data";
import type {
  NormalizedApplicantSchemeProfile,
  Scheme,
  SchemeMatchResult,
} from "@/lib/schemes/types";
import type { Applicant, LoanType } from "@/lib/types";

interface GovernmentSchemesSectionProps {
  applicant: Applicant;
  loanType: LoanType;
  loanAmount: number;
  collateralValue?: number | null;
  applicantName?: string;
  assessmentId?: string;
}

const INDIAN_STATES = [
  "All India",
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Rajasthan",
  "Madhya Pradesh",
  "Delhi",
  "West Bengal",
  "Kerala",
  "Punjab",
  "Haryana",
  "Bihar",
  "Odisha",
  "Andhra Pradesh",
];

export function GovernmentSchemesSection({
  applicant,
  loanType,
  loanAmount,
  collateralValue,
}: GovernmentSchemesSectionProps) {
  const [selectedState, setSelectedState] = useState<string>("Maharashtra");
  const [loanPurpose, setLoanPurpose] = useState<string>("business");
  const [businessStage, setBusinessStage] = useState<"new" | "existing" | "expansion">("new");
  const [socialCategory, setSocialCategory] = useState<
    "general" | "obc" | "sc" | "st" | "minority" | "women" | "differently_abled"
  >("general");
  const [isArtisan, setIsArtisan] = useState<boolean>(false);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [schemes, setSchemes] = useState<Scheme[]>(SEED_GOVERNMENT_SCHEMES);

  // Fetch dynamic schemes from server API if available, fallback to seed
  useEffect(() => {
    let isMounted = true;
    fetch("/api/schemes")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json?.data?.schemes && Array.isArray(json.data.schemes)) {
          setSchemes(json.data.schemes);
        }
      })
      .catch(() => {
        // Fall back gracefully to bundled seed dataset
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedProfile: NormalizedApplicantSchemeProfile = useMemo(() => {
    return normalizeApplicantForSchemes({
      applicant,
      loanType,
      loanAmount,
      collateralValue,
      state: selectedState === "All India" ? undefined : selectedState,
      loanPurpose,
      businessStage,
      socialCategory,
      artisanStatus: isArtisan,
      firstTimeEntrepreneur: isFirstTime,
    });
  }, [
    applicant,
    loanType,
    loanAmount,
    collateralValue,
    selectedState,
    loanPurpose,
    businessStage,
    socialCategory,
    isArtisan,
    isFirstTime,
  ]);

  const matchingResponse = useMemo(() => {
    let filteredSchemes = schemes;
    if (selectedCategory !== "all") {
      filteredSchemes = schemes.filter((s) => s.category === selectedCategory);
    }

    const matchResults: SchemeMatchResult[] = filteredSchemes.map((scheme) =>
      evaluateSchemeEligibility(scheme, normalizedProfile)
    );

    return rankSchemeMatches(matchResults, normalizedProfile);
  }, [schemes, selectedCategory, normalizedProfile]);

  const toggleDocs = (schemeId: string) => {
    setExpandedDocs((prev) => ({ ...prev, [schemeId]: !prev[schemeId] }));
  };

  const qualifiedMatches = matchingResponse.matches.filter(
    (m) =>
      m.matchStatus === "likely_match" ||
      m.matchStatus === "potential_match" ||
      m.matchStatus === "insufficient_information"
  );

  return (
    <section id="government-pathways" className="page-container mt-12 scroll-mt-24">
      {/* Section Header Banner */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-6 sm:p-8 lg:p-10 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Landmark className="size-3.5" />
              <span>Government Credit Opportunity & Scheme Matching</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Alternative Government-Supported Pathways
            </h2>
            <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
              Your conventional credit score is only one pathway. We matched public credit-linked subsidies,
              collateral guarantees, and priority lending schemes against published official criteria.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-center shadow-xs">
              <div className="text-2xl font-black text-primary">{qualifiedMatches.length}</div>
              <div className="text-xs font-medium text-muted-foreground">Relevant Schemes</div>
            </div>
          </div>
        </div>

        {/* Profile Context Refinement Bar */}
        <div className="mt-8 rounded-2xl border border-border/50 bg-background/80 p-4 sm:p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Filter className="size-3.5 text-primary" />
              <span>Refine Eligibility Signals</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Loan Amount: ₹{loanAmount.toLocaleString("en-IN")} ({loanType})
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* State Selector */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Applicant State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose Selector */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Financing Purpose</label>
              <select
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="business">Business / MSME Expansion</option>
                <option value="micro_enterprise">New Micro Enterprise</option>
                <option value="working_capital">Working Capital</option>
                <option value="machinery">Machinery / Equipment Purchase</option>
                <option value="artisan">Artisan & Traditional Crafts</option>
                <option value="trading">Trading / Retail</option>
                <option value="self_employment">General Self-Employment</option>
              </select>
            </div>

            {/* Business Stage */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Enterprise Stage</label>
              <select
                value={businessStage}
                onChange={(e) => setBusinessStage(e.target.value as "new" | "existing" | "expansion")}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="new">New Venture (Greenfield)</option>
                <option value="expansion">Expansion of Existing Unit</option>
                <option value="existing">Existing Business Operations</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Beneficiary Category</label>
              <select
                value={socialCategory}
                onChange={(e) =>
                  setSocialCategory(
                    e.target.value as "general" | "obc" | "sc" | "st" | "minority" | "women" | "differently_abled"
                  )
                }
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="general">General</option>
                <option value="women">Women Entrepreneur</option>
                <option value="obc">OBC</option>
                <option value="sc">SC</option>
                <option value="st">ST</option>
                <option value="minority">Minority Community</option>
                <option value="differently_abled">Differently Abled</option>
              </select>
            </div>
          </div>

          {/* Quick Toggles */}
          <div className="mt-3 flex flex-wrap items-center gap-4 pt-2 border-t border-border/40 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isArtisan}
                onChange={(e) => setIsArtisan(e.target.checked)}
                className="size-3.5 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-muted-foreground">Traditional Artisan / Craftsperson</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFirstTime}
                onChange={(e) => setIsFirstTime(e.target.checked)}
                className="size-3.5 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-muted-foreground">First-Time Entrepreneur</span>
            </label>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Filter Schemes:</span>
          {[
            { id: "all", label: "All Opportunities" },
            { id: "msme", label: "MSME & Enterprise" },
            { id: "artisan", label: "Artisans & Crafts" },
            { id: "women_entrepreneur", label: "Women Entrepreneurs" },
            { id: "business", label: "Credit Guarantees" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground border border-border/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scheme Match Cards Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {matchingResponse.matches.map((match) => {
            const isExpanded = Boolean(expandedDocs[match.schemeId]);
            const isLikely = match.matchStatus === "likely_match";
            const isPotential = match.matchStatus === "potential_match";
            const isInfoNeeded = match.matchStatus === "insufficient_information";

            return (
              <Card
                key={match.schemeId}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all hover:shadow-md ${
                  isLikely
                    ? "border-emerald-500/40 bg-card/95 ring-1 ring-emerald-500/20"
                    : isPotential
                      ? "border-amber-500/40 bg-card/95 ring-1 ring-amber-500/20"
                      : isInfoNeeded
                        ? "border-sky-500/30 bg-card/95"
                        : "border-border/50 bg-card/60 opacity-75"
                }`}
              >
                <div className="p-5 sm:p-6">
                  {/* Scheme Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            match.governmentLevel === "central"
                              ? "border-primary/40 text-primary bg-primary/5"
                              : "border-purple-500/40 text-purple-600 bg-purple-500/5"
                          }`}
                        >
                          {match.governmentLevel === "central" ? "Central Scheme" : `${match.state} State`}
                        </Badge>

                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium capitalize"
                        >
                          {match.category.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                        {match.schemeName}
                      </h3>
                      {match.ministry && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {match.ministry}
                        </p>
                      )}
                    </div>

                    {/* Match Status Badge */}
                    <div className="shrink-0 text-right">
                      {isLikely ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                          <CheckCircle2 className="size-3.5" />
                          <span>Likely Match</span>
                        </div>
                      ) : isPotential ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 border border-amber-500/30">
                          <Sparkles className="size-3.5" />
                          <span>Potential Match</span>
                        </div>
                      ) : isInfoNeeded ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-600 border border-sky-500/30">
                          <HelpCircle className="size-3.5" />
                          <span>Info Needed</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          <AlertCircle className="size-3.5" />
                          <span>Criteria Unmet</span>
                        </div>
                      )}

                      <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                        Match Strength: <span className="font-bold text-foreground">{match.matchStrength}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Key Benefit Highlight */}
                  {match.benefits.length > 0 && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <Percent className="size-4 shrink-0 text-primary mt-0.5" />
                        <div className="font-medium text-foreground">
                          {match.benefits[0].summary}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Why it may fit */}
                  {match.matchedCriteria.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        <span>Why it may fit:</span>
                      </div>
                      <ul className="space-y-1 pl-5 text-xs text-muted-foreground list-disc marker:text-emerald-500">
                        {match.matchedCriteria.slice(0, 3).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Still to verify / Missing details */}
                  {match.missingInformation.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                        <Info className="size-3.5" />
                        <span>Still to verify:</span>
                      </div>
                      <ul className="space-y-1 pl-5 text-xs text-muted-foreground list-disc marker:text-amber-500">
                        {match.missingInformation.slice(0, 2).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Required Documents Toggle */}
                  {match.requiredDocuments.length > 0 && (
                    <div className="mt-4 border-t border-border/50 pt-3">
                      <button
                        type="button"
                        onClick={() => toggleDocs(match.schemeId)}
                        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-primary" />
                          <span>Required Documents ({match.requiredDocuments.length})</span>
                        </span>
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>

                      {isExpanded && (
                        <ul className="mt-2 space-y-1 pl-5 text-xs text-muted-foreground list-disc">
                          {match.requiredDocuments.map((doc, i) => (
                            <li key={i}>{doc}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-emerald-500" />
                    <span>Verified: {new Date(match.lastVerifiedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {match.applicationUrl && (
                      <Button asChild size="sm" variant="default" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold">
                        <a href={match.applicationUrl} target="_blank" rel="noopener noreferrer">
                          <span>Apply on Portal</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    )}

                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium">
                      <a href={match.officialSourceUrl} target="_blank" rel="noopener noreferrer">
                        <span>Official Details</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Educational / Legal Disclaimer */}
        <div className="mt-8 rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-foreground">Important Disclosure:</span>{" "}
            {matchingResponse.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
