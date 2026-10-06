import { MarketingFooter, MarketingNav } from "./nav";

export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-black">{title}</h1>
        <div className="mt-6 space-y-4 text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-fg">{children}</div>
      </main>
      <MarketingFooter />
    </>
  );
}
