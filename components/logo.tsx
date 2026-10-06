import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="GymTrackey home">
      <img src="/logo.svg" alt="" width={34} height={34} />
      <span className="text-lg font-extrabold tracking-tight">GYM<span className="gt-gradient-text">TRACKEY</span></span>
    </Link>
  );
}
