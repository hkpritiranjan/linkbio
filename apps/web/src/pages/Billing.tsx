import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import AppShell from "../components/ui/AppShell";
import { Plan } from "@linkbio/types";

const tiers: {
  name: string;
  plan: Plan;
  price: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    name: "Free",
    plan: "free",
    price: "$0/mo",
    features: ["Up to 5 links", "Custom username", "5 themes", "Basic page"],
    highlight: false,
  },
  {
    name: "Pro",
    plan: "pro",
    price: "$7/mo",
    features: [
      "Unlimited links",
      "Full analytics",
      "Custom domain",
      "Remove branding",
      "All themes + custom colors",
    ],
    highlight: true,
  },
  {
    name: "Business",
    plan: "business",
    price: "$15/mo",
    features: [
      "Everything in Pro",
      "Multiple pages",
      "Team access",
      "Link scheduling",
      "CSV export",
      "API access",
    ],
    highlight: false,
  },
];

export default function Billing() {
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const currentPlan = user?.plan ?? "free";

  const checkout = useMutation({
    mutationFn: (plan: "pro" | "business") =>
      api.post<{ data: { url: string } }>("/billing/checkout", { plan }),
    onSuccess: ({ data }) => {
      window.location.href = data.data.url;
    },
  });

  const portal = useMutation({
    mutationFn: () => api.post<{ data: { url: string } }>("/billing/portal"),
    onSuccess: ({ data }) => {
      window.location.href = data.data.url;
    },
  });

  return (
    <AppShell>
      <div className="p-6 max-w-4xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Billing</h1>
        <p className="text-sm text-gray-500 mb-6">
          Current plan:{" "}
          <span className="font-medium text-gray-900 capitalize">{currentPlan}</span>
        </p>

        {params.get("success") === "true" && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6 text-sm">
            Subscription activated! Your plan has been upgraded.
          </div>
        )}

        {params.get("canceled") === "true" && (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-xl p-4 mb-6 text-sm">
            Checkout canceled. Your plan was not changed.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {tiers.map((tier) => {
            const isCurrent = currentPlan === tier.plan;
            return (
              <div
                key={tier.plan}
                className={`rounded-2xl border p-5 ${
                  tier.highlight
                    ? "border-brand-400 shadow-md shadow-brand-100"
                    : "border-gray-200"
                } ${isCurrent ? "ring-2 ring-brand-500" : ""}`}
              >
                {isCurrent && (
                  <span className="inline-block bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full mb-3">
                    Current plan
                  </span>
                )}
                <p className="font-semibold text-gray-900 mb-1">{tier.name}</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">{tier.price}</p>
                <ul className="space-y-2 mb-5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && tier.plan !== "free" && (
                  <button
                    onClick={() => checkout.mutate(tier.plan as "pro" | "business")}
                    disabled={checkout.isPending}
                    className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
                  >
                    {checkout.isPending ? "Redirecting…" : `Upgrade to ${tier.name}`}
                  </button>
                )}

                {isCurrent && tier.plan !== "free" && (
                  <button
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                    className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:border-gray-300 transition-colors disabled:opacity-60"
                  >
                    {portal.isPending ? "Loading…" : "Manage subscription"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {currentPlan !== "free" && (
          <div className="text-center">
            <button
              onClick={() => portal.mutate()}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Manage billing, invoices &amp; cancellation →
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
