import { Link } from "react-router-dom";
import { Link2, BarChart2, Palette, Zap } from "lucide-react";

const features = [
  { icon: Link2, title: "All your links, one place", desc: "Share everything from one simple, beautiful page. Works with Instagram, TikTok, YouTube, and more." },
  { icon: BarChart2, title: "Analytics that matter", desc: "See who's clicking, where they're from, and which links perform best. Real data, no fluff." },
  { icon: Palette, title: "Make it yours", desc: "5 stunning themes, custom colors, and fonts. Your page, your brand." },
  { icon: Zap, title: "Live in 60 seconds", desc: "Sign up, add your links, share the URL. No design skills needed." },
];

const tiers = [
  { name: "Free", price: "$0", features: ["Up to 5 links", "Custom username", "Beautiful themes", "Mobile-optimized page"], cta: "Get started free", href: "/signup", highlight: false },
  { name: "Pro", price: "$7/mo", features: ["Unlimited links", "Full analytics", "Remove branding", "Custom domain", "All themes"], cta: "Start Pro", href: "/signup?plan=pro", highlight: true },
  { name: "Business", price: "$15/mo", features: ["Everything in Pro", "Multiple pages", "Team access", "Link scheduling", "CSV export", "API access"], cta: "Start Business", href: "/signup?plan=business", highlight: false },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-xl font-bold text-brand-600">LinkBio</span>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link to="/signup" className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-24 max-w-4xl mx-auto">
        <span className="inline-block bg-brand-50 text-brand-600 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          Trusted by 10,000+ creators
        </span>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          One link for everything<br />
          <span className="text-brand-600">you create online</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Stop sending people to different places. Put all your links on one beautiful page and share it everywhere.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/signup" className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors text-lg shadow-lg shadow-brand-200">
            Create your page — it's free
          </Link>
          <Link to="/login" className="text-gray-600 px-8 py-3.5 border border-gray-200 rounded-xl font-medium hover:border-gray-300 transition-colors text-lg">
            Log in
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">No credit card required</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            Everything you need to grow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Simple pricing</h2>
          <p className="text-center text-gray-500 mb-14">Start free. Upgrade when you need more.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 border ${
                  tier.highlight
                    ? "border-brand-500 bg-brand-600 text-white shadow-xl shadow-brand-200"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="mb-6">
                  <p className={`text-sm font-medium mb-1 ${tier.highlight ? "text-brand-100" : "text-gray-500"}`}>
                    {tier.name}
                  </p>
                  <p className={`text-3xl font-bold ${tier.highlight ? "text-white" : "text-gray-900"}`}>
                    {tier.price}
                  </p>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${tier.highlight ? "text-brand-100" : "text-gray-600"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${tier.highlight ? "bg-brand-500 text-white" : "bg-green-100 text-green-600"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={tier.href}
                  className={`block text-center py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    tier.highlight
                      ? "bg-white text-brand-600 hover:bg-brand-50"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} LinkBio · <Link to="/privacy" className="hover:text-gray-600">Privacy</Link> · <Link to="/terms" className="hover:text-gray-600">Terms</Link>
      </footer>
    </div>
  );
}
