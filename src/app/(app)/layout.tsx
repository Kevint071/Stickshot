import Link from "next/link";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Logo } from "@/components/logo";
import { PracticeShortcut } from "@/components/practice-shortcut";
import { TimezoneSync } from "@/components/timezone-sync";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <div className="flex flex-1 flex-col lg:pl-64">
      <AppSidebar email={session?.user?.email} />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link href="/inicio" className="text-lg">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-36 sm:px-6 lg:px-10 lg:pt-12 lg:pb-16">
        {children}
      </main>
      <BottomNav />
      <TimezoneSync />
      <PracticeShortcut />
    </div>
  );
}
