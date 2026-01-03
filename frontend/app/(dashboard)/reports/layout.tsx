"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const tabs = [
  { href: "/reports/overview", label: "Сводка" },
  { href: "/reports/revenue", label: "Выручка" },
  { href: "/reports/inventory", label: "Склад" },
  { href: "/reports/clients", label: "Клиенты" },
  { href: "/reports/finance", label: "Финансы" }, // новая вкладка
];

export default function ReportsLayout({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl gap-4 px-4 pt-4">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                  isActive
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-6">{children}</main>
    </div>
  );
}
