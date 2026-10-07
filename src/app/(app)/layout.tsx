import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-4">
        <Link href="/" className="text-lg font-bold">
          Stickshot
        </Link>
        <Link href="/ajustes" className="text-sm text-muted">
          Ajustes
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
