"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div><p className="gt-gradient-text text-7xl font-black">500</p><h1 className="mt-2 text-xl font-bold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted">Please try again. If it keeps happening, contact support.</p>
        <Button onClick={reset} className="mt-6">Try again</Button></div>
    </main>
  );
}
