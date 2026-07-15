import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/ui/AppShell";
import { AnalyticsSummary, LinkAnalytics } from "@linkbio/types";

type Period = "7d" | "30d";

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>("30d");
  const user = useAuthStore((s) => s.user);
  const isPro = user?.plan === "pro" || user?.plan === "business";

  const { data: summaryRes, isLoading } = useQuery({
    queryKey: ["analytics", "summary", period],
    queryFn: () =>
      api.get<{ data: AnalyticsSummary }>("/analytics/summary", { params: { period } }),
  });

  const { data: linksRes } = useQuery({
    queryKey: ["analytics", "links", period],
    queryFn: () =>
      api.get<{ data: LinkAnalytics[] }>("/analytics/links", { params: { period } }),
  });

  const summary = summaryRes?.data.data;
  const linkStats = linksRes?.data.data ?? [];

  return (
    <AppShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["7d", "30d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {p === "7d" ? "7 days" : "30 days"}
              </button>
            ))}
          </div>
        </div>

        {!isPro && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              <TrendingUp className="inline w-4 h-4 mr-1" />
              Upgrade to Pro for full analytics — country, device, and referrer breakdowns.
            </p>
            <a href="/billing" className="text-xs font-medium text-amber-900 underline whitespace-nowrap ml-4">
              Upgrade →
            </a>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard label="Profile views" value={summary?.profileViews ?? 0} icon={Eye} />
            <StatCard label="Link clicks" value={summary?.linkClicks ?? 0} icon={MousePointerClick} />
          </div>
        )}

        {/* Top links */}
        {linkStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Clicks by link</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={linkStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="clicks" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top links table */}
        {linkStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Link</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {linkStats.map((l) => (
                  <tr key={l.linkId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{l.title}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{l.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {linkStats.length === 0 && !isLoading && (
          <div className="text-center py-16 text-gray-400">
            <MousePointerClick className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No data yet. Share your page to start getting clicks.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
