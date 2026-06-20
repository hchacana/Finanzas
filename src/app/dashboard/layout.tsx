import { CreditCard, RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-8">
          <Wallet className="h-7 w-7 text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900">Finanzas</h1>
        </div>
        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
          >
            <CreditCard className="h-5 w-5" />
            Gastos del Mes
          </Link>
          <Link
            href="/api/finanzas/sync"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
