"use client";

import { useState } from "react";
import {
  ExternalLink, Zap, Store, BookOpen, GraduationCap, Key,
  Sparkles, ShoppingBag, ArrowRight, CheckCircle, Clock, Mail,
  Globe, Tag,
} from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useLangContext } from "@/components/LangProvider";
import { SHOP_URL } from "@/lib/constants";
import { t, type Lang } from "@/lib/i18n";

function useDigiProducts(lang: Lang) {
  const s = t.dashboard.shop;
  return [
    { id: "ai-premium", name: s.productAiPremium[lang], price: "5.000", icon: Sparkles, cat: s.catSubscription[lang] },
    { id: "ebook-web3", name: s.productEbook[lang], price: "15.000", icon: BookOpen, cat: s.catEbook[lang] },
    { id: "newsletter-pro", name: s.productNewsletter[lang], price: "25.000", icon: Mail, cat: s.catContent[lang] },
    { id: "kursus-blockchain", name: s.productCourse[lang], price: "150.000", icon: GraduationCap, cat: s.catCourse[lang] },
    { id: "software-license", name: s.productLicense[lang], price: "500.000", icon: Key, cat: s.catLicense[lang] },
  ];
}

function useMerchants(lang: Lang) {
  const s = t.dashboard.shop;
  return [
    {
      name: "NusaCart",
      desc: s.merchantNusaCartDesc[lang],
      category: s.merchantCatEcommerce[lang],
      logo: "🛒",
      color: "from-green-500/10 to-green-500/5",
      border: "border-green-500/20",
    },
    {
      name: "ZipRide",
      desc: s.merchantZipRideDesc[lang],
      category: s.merchantCatSuperApp[lang],
      logo: "🛵",
      color: "from-emerald-500/10 to-emerald-500/5",
      border: "border-emerald-500/20",
    },
    {
      name: "PageOne",
      desc: s.merchantPageOneDesc[lang],
      category: s.merchantCatMediaBooks[lang],
      logo: "📚",
      color: "from-blue-500/10 to-blue-500/5",
      border: "border-blue-500/20",
    },
    {
      name: "SkillLoop",
      desc: s.merchantSkillLoopDesc[lang],
      category: s.merchantCatEducation[lang],
      logo: "🎓",
      color: "from-purple-500/10 to-purple-500/5",
      border: "border-purple-500/20",
    },
  ];
}

// ── Waitlist form ─────────────────────────────────────────────────────────────
function WaitlistForm({ lang }: { lang: Lang }) {
  const s = t.dashboard.shop;
  const [form, setForm] = useState({ name: "", url: "", category: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    try {
      const existing = JSON.parse(localStorage.getItem("ds-waitlist") || "[]");
      existing.push({ ...form, ts: Date.now() });
      localStorage.setItem("ds-waitlist", JSON.stringify(existing));
    } catch (_) {}
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400">
          <CheckCircle size={28} />
        </div>
        <p className="font-semibold text-white">{s.formSuccessTitle[lang]}</p>
        <p className="text-sm text-gray-400 max-w-xs">
          {s.formSuccessDesc[lang].split("{email}")[0]}
          <span className="text-amber-400">{form.email}</span>
          {s.formSuccessDesc[lang].split("{email}")[1]}
        </p>
        <button
          onClick={() => { setSubmitted(false); setForm({ name:"", url:"", category:"", email:"" }); }}
          className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline"
        >
          {s.formRegisterAnother[lang]}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">{s.formMerchantName[lang]}</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={s.formMerchantPlaceholder[lang]}
          required
          className="bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">{s.formUrl[lang]}</label>
        <input
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          placeholder={s.formUrlPlaceholder[lang]}
          className="bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">{s.formCategory[lang]}</label>
        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
        >
          <option value="">{s.formCategoryPlaceholder[lang]}</option>
          <option>{s.catEcommerce[lang]}</option>
          <option>{s.catEducation[lang]}</option>
          <option>{s.catMedia[lang]}</option>
          <option>{s.catSoftware[lang]}</option>
          <option>{s.catOther[lang]}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">{s.formEmail[lang]}</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder={s.formEmailPlaceholder[lang]}
          required
          className="bg-[#111827] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <ArrowRight size={15} />
          {s.formSubmit[lang]}
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { lang } = useLangContext();
  const s = t.dashboard.shop;
  const shopUrl = SHOP_URL || "http://localhost:3002";
  const digiProducts = useDigiProducts(lang);
  const merchants = useMerchants(lang);
  const heroDescParts = s.digiStoreHeroDesc[lang].split("{code}");

  return (
    <div className="p-6 max-w-5xl">
      <Breadcrumb crumbs={[{ label: t.dashboard.breadcrumb.dashboard[lang], href: "/dashboard" }, { label: s.breadcrumb[lang] }]} />

      {/* Header */}
      <div className="mt-6 mb-8">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{s.title[lang]}</h1>
          <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/25 rounded-full px-2.5 py-0.5">
            {s.x402Enabled[lang]}
          </span>
          <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full px-2.5 py-0.5">
            IDRX
          </span>
        </div>
        <p className="text-gray-400 text-sm">{s.subtitle[lang]}</p>
      </div>

      {/* ── Section 1: DigiStore ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{s.digiStoreLabel[lang]}</h2>
          <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {s.live[lang]}
          </span>
        </div>

        {/* DigiStore hero card */}
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-5 mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-white font-semibold mb-1">{s.digiStoreHeroTitle[lang]}</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              {heroDescParts[0]}
              <code className="text-amber-400 font-mono text-xs bg-amber-500/10 px-1 rounded">paid_fetch</code>
              {heroDescParts[1]}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[s.tagProducts[lang], s.tagHttp402[lang], s.tagErc20[lang], s.tagInstant[lang]].map(tag => (
                <span key={tag} className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-md px-2 py-0.5 flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            {s.openDigiStore[lang]}
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Product grid mini */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {digiProducts.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-[#0c1220] border border-gray-800 rounded-xl p-3.5 hover:border-amber-500/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.cat}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-amber-400">{p.price}</p>
                  <p className="text-xs text-gray-500">IDRX</p>
                </div>
              </div>
            );
          })}
          {/* CTA card */}
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#0c1220] border border-dashed border-gray-700 rounded-xl p-3.5 text-sm text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
          >
            <ExternalLink size={14} />
            {s.viewAllProducts[lang]}
          </a>
        </div>
      </section>

      {/* ── Section 2: Featured Merchants ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Store size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{s.merchantPartner[lang]}</h2>
          <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 flex items-center gap-1">
            <Clock size={10} /> {s.comingSoon[lang]}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {merchants.map((m) => (
            <div
              key={m.name}
              className={`relative rounded-xl border ${m.border} bg-gradient-to-br ${m.color} p-4 overflow-hidden`}
            >
              <div className="absolute top-3 right-3">
                <span className="text-xs text-gray-500 bg-gray-800/80 border border-gray-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Clock size={9} /> {s.soon[lang]}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{m.logo}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400 mb-1">{m.category}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <Zap size={10} />
                <span>{s.willSupport[lang]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Waitlist ── */}
      <section>
        <div className="rounded-xl border border-dashed border-gray-700 p-6">
          <div className="flex items-start gap-4 mb-6 flex-wrap sm:flex-nowrap">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">{s.registerTitle[lang]}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.registerDesc[lang]}</p>
            </div>
          </div>
          <WaitlistForm lang={lang} />
        </div>
      </section>
    </div>
  );
}
