import Link from "next/link";
import { Logo } from "@/components/Icone";
import { NavInferior, NavTopo } from "@/components/Navegacao";
import { requireUser } from "@/lib/api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="sticky top-0 z-20 px-3 pt-3 md:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full bg-white/90 py-2 pl-3 pr-2 shadow-[0_8px_24px_-12px_rgba(20,32,27,0.18)] backdrop-blur md:pl-4">
          <Link href="/" className="flex items-center gap-2 py-1">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-extrabold tracking-tight text-stone-900">
              Perda<span className="text-mata">Zero</span>
            </span>
          </Link>
          <NavTopo />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">{children}</main>

      <NavInferior />
    </div>
  );
}
