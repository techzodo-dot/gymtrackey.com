import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div><p className="gt-gradient-text text-7xl font-black">404</p><h1 className="mt-2 text-xl font-bold">We couldn&apos;t find that page</h1>
        <ButtonLink href="/" className="mt-6">Back to home</ButtonLink></div>
    </main>
  );
}
