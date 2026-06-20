"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  RefreshCw,
  Mail,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

type Transaction = {
  id: string;
  amount: number;
  merchant: string;
  card_last4: string;
  transaction_date: string;
  created_at: string;
};

type FinanzasData = {
  transactions: Transaction[];
  total: number;
  month: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<FinanzasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/finanzas");
      if (!res.ok) throw new Error("Error al cargar datos");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/finanzas/sync", { method: "POST" });
      const json = await res.json();
      if (json.error) {
        if (json.error.includes("No Gmail tokens")) {
          window.location.href = "/api/gmail/auth";
          return;
        }
        setError(json.error);
      } else {
        await fetchData();
      }
    } catch {
      setError("Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  function formatCLP(amount: number) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gastos del Mes
          </h2>
          <p className="text-gray-500 capitalize">{data?.month}</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/gmail/auth"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Mail className="h-4 w-4" />
            Conectar Gmail
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Total del Mes
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCLP(data?.total || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Transacciones
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data?.transactions.length || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Promedio por Compra
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCLP(
              data?.transactions.length
                ? Math.round(data.total / data.transactions.length)
                : 0
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Transacciones</h3>
        </div>
        {data?.transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">Sin transacciones aún</p>
            <p className="text-sm mt-1">
              Conecta tu Gmail y sincroniza para ver tus gastos
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Comercio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tarjeta
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(tx.transaction_date).toLocaleDateString(
                      "es-CL",
                      {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {tx.merchant}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    ****{tx.card_last4}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCLP(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
