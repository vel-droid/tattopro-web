"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinkBase =
  "block rounded px-3 py-2 text-sm font-medium transition-colors";
const navLinkActive = "bg-gray-900 text-white";
const navLinkInactive = "text-gray-700 hover:bg-gray-100";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Клиенты" },
  { href: "/appointments", label: "Записи" },
  { href: "/masters", label: "Мастера" },
  { href: "/services", label: "Услуги" }, // новый пункт
  { href: "/inventory", label: "Склад" },
  { href: "/reports/overview", label: "Отчёты" },
  { href: "/profile", label: "Профиль" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-6xl">
        <nav className="w-48 flex-shrink-0 border-r bg-white p-4">
          <div className="mb-4 text-lg font-semibold">Tattopro</div>
          <div className="space-y-1">
            {links.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${navLinkBase} ${
                    isActive ? navLinkActive : navLinkInactive
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
