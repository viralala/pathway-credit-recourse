export function SiteFooter() {
  return (
    <footer className="border-t border-brown/15 bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-brown sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-3xl">
          <strong className="font-bold">Disclaimer:</strong> Pathway is a simulation built on public/synthetic data
          (the Kaggle &ldquo;Give Me Some Credit&rdquo; schema). It is not a credit decision, not financial advice, and
          not affiliated with any lender.
        </p>
        <a
          className="font-semibold text-indigo underline underline-offset-4"
          href="https://github.com/viralala/pathway-credit-recourse"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
