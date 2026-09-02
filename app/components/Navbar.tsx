"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Search, LogIn, LogOut } from "lucide-react";

interface NavbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function Navbar({ search, onSearchChange }: NavbarProps) {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-line bg-bgDeep sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-4 flex-wrap">
        <h1 className="font-display text-2xl text-text whitespace-nowrap">خارطة الثغور</h1>

        <div className="flex-1 min-w-[220px] relative">
          <Search
            className="absolute top-1/2 -translate-y-1/2 right-3 text-textDim"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن ثغر بعنوانه أو تصنيفه..."
            className="w-full bg-panel border border-line rounded-lg py-2.5 pr-10 pl-4 text-sm text-text placeholder:text-textDim focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          {status === "authenticated" ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-sm text-textDim hover:text-gold transition-colors"
            >
              <LogOut size={16} />
              <span>{session.user?.name ?? session.user?.email} — خروج</span>
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 text-sm bg-panel border border-line rounded-lg px-4 py-2 text-text hover:border-gold transition-colors"
            >
              <LogIn size={16} />
              <span>الدخول عبر Gmail</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
