import path from "node:path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { findProduct, products, serializeProduct, type Product } from "./products";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const app = express();

app.use(cors()); // allow backend dan browser
app.use(express.json());

const PORT = process.env.SHOP_PORT || 3002;
const SHOP_WALLET_ADDRESS =
  process.env.SHOP_WALLET_ADDRESS || "0x0000000000000000000000000000000000000001";

function generateDigitalContent(product: Product, txHash: string) {
  switch (product.deliverable) {
    case "activation_code":
      return {
        type: "activation_code",
        code: `AGENTPAY-AI-${txHash.slice(2, 10).toUpperCase()}`,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        message: "Aktifkan di app.agentpay.id/activate",
      };
    case "download_link":
      return {
        type: "download_link",
        url: `https://files.agentpay.id/ebooks/${txHash.slice(2, 16)}.pdf`,
        filename: "panduan-web3-indonesia.pdf",
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    case "email_subscription":
      return {
        type: "email_subscription",
        message: "Subscription aktif! Kamu akan menerima newsletter setiap Senin.",
        subscriptionId: `SUB-${txHash.slice(2, 10).toUpperCase()}`,
      };
    case "course_access_link":
      return {
        type: "course_access",
        url: `https://learn.agentpay.id/courses/blockchain-dev?token=${txHash.slice(2, 20)}`,
        validUntil: "lifetime",
        message: "Akses seumur hidup. Mulai dari modul 1.",
      };
    case "license_key":
      return {
        type: "license_key",
        key: `AGPAY-SDK-${txHash.slice(2, 6).toUpperCase()}-${txHash.slice(6, 10).toUpperCase()}-${txHash
          .slice(10, 14)
          .toUpperCase()}`,
        type_license: "commercial",
        seats: 1,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    default:
      return { message: "Konten tersedia. Hubungi support@agentpay.id" };
  }
}

app.get("/", (_req, res) => {
  const ICONS: Record<string, string> = {
    subscription: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    ebook:        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    course:       `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    license:      `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
    zap:          `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    check:        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    shield:       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    cpu:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M9 2v2M9 20v2M2 15h2M20 15h2M2 9h2M20 9h2"/></svg>`,
    link:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    cart:         `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
    wallet:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
    loader:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    checkbig:     `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    copy:         `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  };

  const BADGES: Record<string, { label: string; color: string }> = {
    "ai-premium":       { label: "🔥 Populer",    color: "badge-orange" },
    "kursus-blockchain":{ label: "⭐ Best Value", color: "badge-purple" },
  };

  const CATEGORY_LABEL: Record<string, { id: string; en: string }> = {
    subscription: { id: "Langganan",  en: "Subscription" },
    ebook:        { id: "E-Book",     en: "E-Book"        },
    course:       { id: "Kursus",     en: "Course"        },
    license:      { id: "Lisensi",    en: "License"       },
  };

  const productCards = products.map((p, i) => {
    const icon  = ICONS[p.category] ?? ICONS.subscription;
    const badge = BADGES[p.id];
    const catId = CATEGORY_LABEL[p.category]?.id ?? p.category;
    const catEn = CATEGORY_LABEL[p.category]?.en ?? p.category;
    const animDelay = i * 80;

    return `
<article class="card" style="animation-delay:${animDelay}ms">
  ${badge ? `<span class="badge ${badge.color}">${badge.label}</span>` : ""}
  <div class="card-top">
    <div class="card-icon">${icon}</div>
    <span class="card-cat" data-i18n-id="${catId}" data-i18n-en="${catEn}">${catId}</span>
  </div>
  <h3 class="card-name">${p.name}</h3>
  <p class="card-desc">${p.description}</p>
  <ul class="card-features">
    <li>${ICONS.check} <span data-i18n="feat1">Pengiriman instan</span></li>
    <li>${ICONS.check} <span data-i18n="feat2">Bayar via IDRX</span></li>
    <li>${ICONS.check} <span data-i18n="feat3">AI agent compatible</span></li>
  </ul>
  <div class="card-footer">
    <div class="card-price">
      <span class="price-num">${p.priceDisplay.replace(" IDRX","")}</span>
      <span class="price-cur">IDRX</span>
    </div>
    <span class="x402-pill">${ICONS.zap}x402</span>
  </div>
  <button class="btn-buy" onclick="openModal('${p.id}','${p.name}','${p.priceDisplay}','${p.category}')">
    ${ICONS.cart} <span data-i18n="buyNow">Beli Sekarang</span>
  </button>
</article>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="id" id="htmlRoot">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>DigiStore — Toko Digital Web3</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

    :root{
      --bg:        #05080f;
      --surface:   #0c1220;
      --surface2:  #111827;
      --border:    rgba(99,179,237,.12);
      --border-h:  rgba(99,179,237,.4);
      --accent:    #60a5fa;
      --accent-h:  #93c5fd;
      --accent-dim:rgba(96,165,250,.1);
      --teal:      #2dd4bf;
      --green:     #34d399;
      --orange:    #fb923c;
      --purple:    #a78bfa;
      --text:      #f1f5f9;
      --muted:     #64748b;
      --muted2:    #94a3b8;
    }

    html{scroll-behavior:smooth}
    body{
      background:var(--bg);
      color:var(--text);
      font-family:'Inter',system-ui,sans-serif;
      line-height:1.6;
      min-height:100vh;
    }

    /* ── NAV ─────────────────────────────── */
    nav{
      position:sticky;top:0;z-index:50;
      display:flex;align-items:center;justify-content:space-between;
      padding:.9rem 2.5rem;
      background:rgba(5,8,15,.85);
      backdrop-filter:blur(16px);
      border-bottom:1px solid var(--border);
    }
    .logo{
      display:flex;align-items:center;gap:.6rem;
      font-family:'Syne',sans-serif;font-weight:800;font-size:1.15rem;
      color:var(--text);text-decoration:none;letter-spacing:-.01em;
    }
    .logo-mark{
      width:30px;height:30px;border-radius:8px;
      background:linear-gradient(135deg,var(--accent),var(--teal));
      display:flex;align-items:center;justify-content:center;
      font-size:.75rem;font-weight:800;color:#05080f;
      font-family:'JetBrains Mono',monospace;
    }
    .nav-right{display:flex;align-items:center;gap:.6rem}
    .pill{
      font-size:.68rem;font-family:'JetBrains Mono',monospace;font-weight:500;
      padding:.25rem .65rem;border-radius:99px;border:1px solid;
    }
    .pill-blue{color:var(--accent);border-color:rgba(96,165,250,.3);background:rgba(96,165,250,.07)}
    .pill-green{color:var(--green);border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.07)}
    .pill-teal{color:var(--teal);border-color:rgba(45,212,191,.3);background:rgba(45,212,191,.07)}

    /* ── HERO ────────────────────────────── */
    .hero{
      position:relative;overflow:hidden;
      padding:6rem 1.5rem 5rem;
      text-align:center;
    }
    .hero-glow{
      position:absolute;top:-120px;left:50%;transform:translateX(-50%);
      width:800px;height:400px;
      background:radial-gradient(ellipse at 50% 0%,rgba(96,165,250,.1) 0%,transparent 65%);
      pointer-events:none;
    }
    .hero-grid{
      position:absolute;inset:0;
      background-image:
        linear-gradient(var(--border) 1px,transparent 1px),
        linear-gradient(90deg,var(--border) 1px,transparent 1px);
      background-size:48px 48px;
      mask-image:radial-gradient(ellipse 70% 60% at 50% 0%,black 0%,transparent 100%);
      pointer-events:none;
    }
    .hero-inner{position:relative;z-index:1;max-width:640px;margin:0 auto}
    .hero-eyebrow{
      display:inline-flex;align-items:center;gap:.5rem;
      font-size:.72rem;font-family:'JetBrains Mono',monospace;
      color:var(--accent);
      border:1px solid rgba(96,165,250,.25);background:rgba(96,165,250,.06);
      border-radius:99px;padding:.3rem .9rem;margin-bottom:1.8rem;
    }
    .hero-eyebrow-dot{
      width:6px;height:6px;border-radius:50%;
      background:var(--green);box-shadow:0 0 6px var(--green);
      animation:pulse 2s ease-in-out infinite;
    }
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .hero h1{
      font-family:'Syne',sans-serif;font-weight:800;
      font-size:clamp(2.2rem,5.5vw,3.8rem);
      line-height:1.1;letter-spacing:-.02em;
      color:var(--text);margin-bottom:1.2rem;
      text-wrap:balance;
    }
    .hero h1 .grad{
      background:linear-gradient(135deg,var(--accent) 0%,var(--teal) 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    .hero-sub{
      font-size:1.05rem;color:var(--muted2);
      max-width:480px;margin:0 auto 2.5rem;line-height:1.65;
    }
    .stats-row{
      display:flex;justify-content:center;align-items:center;
      gap:0;flex-wrap:wrap;
      border:1px solid var(--border);border-radius:14px;
      background:var(--surface);
      overflow:hidden;
      max-width:480px;margin:0 auto;
    }
    .stat{
      flex:1;min-width:100px;
      padding:1.1rem .8rem;
      text-align:center;
      border-right:1px solid var(--border);
    }
    .stat:last-child{border-right:none}
    .stat-num{
      font-family:'Syne',sans-serif;font-weight:700;font-size:1.3rem;
      color:var(--accent);line-height:1;
    }
    .stat-label{font-size:.68rem;color:var(--muted);margin-top:.3rem;letter-spacing:.04em}

    /* ── SECTION HEADER ──────────────────── */
    .section-wrap{max-width:1120px;margin:0 auto;padding:0 2rem}
    .section-head{
      display:flex;align-items:center;gap:1rem;
      margin:4rem 0 2rem;
    }
    .section-head h2{
      font-family:'Syne',sans-serif;font-size:.8rem;font-weight:700;
      color:var(--muted2);white-space:nowrap;letter-spacing:.06em;text-transform:uppercase;
    }
    .sh-line{flex:1;height:1px;background:var(--border)}

    /* ── GRID ────────────────────────────── */
    .grid{
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
      gap:1.25rem;
    }

    /* ── CARD ────────────────────────────── */
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .card{
      position:relative;
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:16px;
      padding:1.6rem;
      display:flex;flex-direction:column;gap:.6rem;
      transition:border-color .25s,box-shadow .25s,transform .25s;
      animation:fadeUp .5s ease both;
      overflow:hidden;
    }
    .card::before{
      content:'';position:absolute;inset:0;border-radius:16px;
      background:linear-gradient(135deg,rgba(96,165,250,.04) 0%,transparent 60%);
      pointer-events:none;
    }
    .card:hover{
      border-color:var(--border-h);
      transform:translateY(-4px);
      box-shadow:0 12px 40px rgba(96,165,250,.1),0 4px 16px rgba(0,0,0,.4);
    }
    .badge{
      position:absolute;top:1.1rem;right:1.1rem;
      font-size:.62rem;font-weight:600;font-family:'JetBrains Mono',monospace;
      border-radius:99px;padding:.22rem .6rem;border:1px solid;
    }
    .badge-orange{color:var(--orange);border-color:rgba(251,146,60,.3);background:rgba(251,146,60,.1)}
    .badge-purple{color:var(--purple);border-color:rgba(167,139,250,.3);background:rgba(167,139,250,.1)}
    .card-top{display:flex;align-items:center;gap:.75rem;margin-bottom:.2rem}
    .card-icon{
      width:40px;height:40px;border-radius:10px;flex-shrink:0;
      background:var(--accent-dim);border:1px solid rgba(96,165,250,.18);
      display:flex;align-items:center;justify-content:center;
      color:var(--accent);
    }
    .card-cat{
      font-size:.65rem;font-family:'JetBrains Mono',monospace;
      color:var(--muted);letter-spacing:.07em;text-transform:uppercase;
    }
    .card-name{
      font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:700;
      color:var(--text);line-height:1.25;
    }
    .card-desc{font-size:.83rem;color:var(--muted2);line-height:1.6;flex:1}
    .card-features{
      list-style:none;display:flex;flex-direction:column;gap:.35rem;
      margin:.2rem 0;
    }
    .card-features li{
      display:flex;align-items:center;gap:.45rem;
      font-size:.76rem;color:var(--muted2);
    }
    .card-features li svg{color:var(--green);flex-shrink:0}
    .card-footer{
      display:flex;align-items:center;justify-content:space-between;
      padding-top:.9rem;margin-top:.3rem;
      border-top:1px solid var(--border);
    }
    .card-price{display:flex;align-items:baseline;gap:.35rem}
    .price-num{
      font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:700;
      color:var(--accent);
    }
    .price-cur{font-size:.72rem;color:var(--muted)}
    .x402-pill{
      display:flex;align-items:center;gap:.3rem;
      font-size:.64rem;font-family:'JetBrains Mono',monospace;font-weight:500;
      color:var(--green);
      background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.22);
      border-radius:99px;padding:.22rem .55rem;
    }

    /* ── HOW IT WORKS ────────────────────── */
    .how{
      margin:4rem 0 0;
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:20px;
      padding:2.5rem;
    }
    .how-title{
      font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:700;
      color:var(--text);margin-bottom:.5rem;
    }
    .how-sub{font-size:.85rem;color:var(--muted2);margin-bottom:2rem;line-height:1.55}
    .how-steps{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:1.2rem;
    }
    .how-step{
      background:var(--surface2);border:1px solid var(--border);
      border-radius:12px;padding:1.2rem;
    }
    .how-step-num{
      font-family:'JetBrains Mono',monospace;font-size:.65rem;font-weight:500;
      color:var(--accent);letter-spacing:.06em;margin-bottom:.7rem;
    }
    .how-step-icon{
      width:34px;height:34px;border-radius:8px;
      background:var(--accent-dim);border:1px solid rgba(96,165,250,.15);
      display:flex;align-items:center;justify-content:center;
      color:var(--accent);margin-bottom:.7rem;
    }
    .how-step h4{
      font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700;
      color:var(--text);margin-bottom:.3rem;
    }
    .how-step p{font-size:.76rem;color:var(--muted2);line-height:1.5}
    .code-pill{
      display:inline-block;
      font-family:'JetBrains Mono',monospace;font-size:.75rem;
      color:var(--accent);background:rgba(96,165,250,.1);
      border:1px solid rgba(96,165,250,.2);
      border-radius:6px;padding:.1rem .4rem;
    }

    /* ── FOOTER ──────────────────────────── */
    footer{
      border-top:1px solid var(--border);
      margin-top:4rem;padding:1.8rem 2.5rem;
      display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:1rem;
    }
    .footer-left{font-size:.78rem;color:var(--muted)}
    .footer-left strong{color:var(--muted2)}
    .footer-right{display:flex;gap:.6rem;flex-wrap:wrap}

    /* ── NAVBAR WALLET ──────────────────── */
    .btn-wallet{
      display:flex;align-items:center;gap:.5rem;
      padding:.45rem 1rem;
      background:linear-gradient(135deg,var(--accent),var(--teal));
      color:#05080f;font-weight:600;font-size:.78rem;
      border:none;border-radius:8px;cursor:pointer;
      font-family:'Inter',sans-serif;
      transition:opacity .2s,transform .15s;
      white-space:nowrap;
    }
    .btn-wallet:hover{opacity:.88;transform:translateY(-1px)}
    .btn-wallet:active{transform:scale(.97)}
    .wallet-connected{
      display:flex;align-items:center;gap:.5rem;
      background:var(--surface2);border:1px solid var(--border-h);
      border-radius:8px;padding:.4rem .8rem;
    }
    .wallet-dot{
      width:7px;height:7px;border-radius:50%;
      background:var(--green);box-shadow:0 0 6px var(--green);
      flex-shrink:0;
    }
    .wallet-addr{
      font-family:'JetBrains Mono',monospace;font-size:.72rem;
      color:var(--text);
    }
    .wallet-bal{
      font-family:'JetBrains Mono',monospace;font-size:.72rem;
      color:var(--accent);border-left:1px solid var(--border);
      padding-left:.5rem;white-space:nowrap;
    }
    .btn-disconnect{
      background:none;border:none;cursor:pointer;
      color:var(--muted);font-size:.8rem;padding:0 .1rem;
      transition:color .2s;line-height:1;
    }
    .btn-disconnect:hover{color:#f87171}

    /* ── BUY BUTTON ─────────────────────── */
    .btn-buy{
      display:flex;align-items:center;justify-content:center;gap:.5rem;
      width:100%;margin-top:.6rem;
      padding:.7rem 1rem;
      background:linear-gradient(135deg,var(--accent) 0%,var(--teal) 100%);
      color:#05080f;font-weight:600;font-size:.85rem;
      border:none;border-radius:10px;cursor:pointer;
      transition:opacity .2s,transform .15s,box-shadow .2s;
      font-family:'Inter',sans-serif;
    }
    .btn-buy:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 6px 20px rgba(96,165,250,.25)}
    .btn-buy:active{transform:scale(.97)}

    /* ── MODAL OVERLAY ───────────────────── */
    .modal-overlay{
      position:fixed;inset:0;z-index:200;
      background:rgba(0,0,0,.7);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;padding:1rem;
      opacity:0;pointer-events:none;transition:opacity .25s;
    }
    .modal-overlay.open{opacity:1;pointer-events:all}
    .modal{
      background:var(--surface);border:1px solid var(--border-h);
      border-radius:20px;width:100%;max-width:420px;
      padding:2rem;position:relative;
      transform:translateY(16px) scale(.97);transition:transform .25s;
    }
    .modal-overlay.open .modal{transform:none}
    .modal-close{
      position:absolute;top:1rem;right:1rem;
      width:30px;height:30px;border-radius:50%;
      background:var(--surface2);border:1px solid var(--border);
      color:var(--muted2);cursor:pointer;
      display:flex;align-items:center;justify-content:center;font-size:1rem;
      transition:background .2s;
    }
    .modal-close:hover{background:rgba(255,255,255,.08)}

    /* step panels */
    .modal-step{display:none}
    .modal-step.active{display:block}

    /* step 1 — pilih wallet */
    .modal-title{
      font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;
      color:var(--text);margin-bottom:.4rem;
    }
    .modal-sub{font-size:.82rem;color:var(--muted2);margin-bottom:1.4rem;line-height:1.5}
    .modal-product-info{
      background:var(--surface2);border:1px solid var(--border);
      border-radius:12px;padding:1rem;margin-bottom:1.4rem;
      display:flex;align-items:center;justify-content:space-between;gap:1rem;
    }
    .mpi-name{font-size:.88rem;font-weight:600;color:var(--text)}
    .mpi-price{
      font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;
      color:var(--accent);white-space:nowrap;
    }
    .wallet-options{display:flex;flex-direction:column;gap:.7rem}
    .wallet-btn{
      display:flex;align-items:center;gap:.8rem;
      padding:.85rem 1rem;
      background:var(--surface2);border:1px solid var(--border);
      border-radius:12px;cursor:pointer;
      transition:border-color .2s,background .2s;
      text-align:left;width:100%;color:var(--text);
      font-family:'Inter',sans-serif;
    }
    .wallet-btn:hover{border-color:var(--border-h);background:rgba(96,165,250,.05)}
    .wallet-logo{
      width:36px;height:36px;border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      font-size:1.2rem;flex-shrink:0;
    }
    .wallet-info{}
    .wallet-name{font-size:.88rem;font-weight:600}
    .wallet-desc{font-size:.72rem;color:var(--muted);margin-top:.1rem}

    /* step 2 — processing */
    .step-processing{text-align:center;padding:1rem 0}
    .step-processing .spin-wrap{
      width:64px;height:64px;border-radius:50%;
      background:var(--accent-dim);border:1px solid rgba(96,165,250,.2);
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 1.2rem;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    .spin{animation:spin .9s linear infinite}
    .proc-title{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--text);margin-bottom:.3rem}
    .proc-sub{font-size:.8rem;color:var(--muted2)}
    .proc-steps{
      margin:1.4rem 0 0;text-align:left;
      display:flex;flex-direction:column;gap:.6rem;
    }
    .proc-step{
      display:flex;align-items:center;gap:.6rem;
      font-size:.78rem;color:var(--muted);
    }
    .proc-step.done{color:var(--green)}
    .proc-step.active{color:var(--text)}
    .proc-dot{
      width:8px;height:8px;border-radius:50%;flex-shrink:0;
      background:var(--border);
    }
    .proc-step.done .proc-dot{background:var(--green)}
    .proc-step.active .proc-dot{background:var(--accent);box-shadow:0 0 6px var(--accent)}

    /* step 3 — success */
    .step-success{text-align:center;padding:.5rem 0}
    .success-icon{
      width:72px;height:72px;border-radius:50%;
      background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);
      display:flex;align-items:center;justify-content:center;
      color:var(--green);margin:0 auto 1.2rem;
      animation:popIn .4s cubic-bezier(.17,.67,.4,1.4);
    }
    @keyframes popIn{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
    .success-title{
      font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;
      color:var(--text);margin-bottom:.4rem;
    }
    .success-sub{font-size:.82rem;color:var(--muted2);margin-bottom:1.4rem}
    .receipt{
      background:var(--surface2);border:1px solid var(--border);
      border-radius:12px;padding:1rem;margin-bottom:1.4rem;
      text-align:left;
    }
    .receipt-row{
      display:flex;justify-content:space-between;align-items:center;
      font-size:.78rem;padding:.3rem 0;
      border-bottom:1px solid var(--border);
    }
    .receipt-row:last-child{border-bottom:none}
    .receipt-label{color:var(--muted)}
    .receipt-val{color:var(--text);font-weight:500;font-family:'JetBrains Mono',monospace;font-size:.72rem}
    .receipt-val.green{color:var(--green)}
    .txhash-row{
      display:flex;align-items:center;gap:.4rem;
      background:var(--surface2);border:1px solid var(--border);
      border-radius:8px;padding:.55rem .8rem;margin-bottom:1rem;
      font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--muted2);
      word-break:break-all;
    }
    .copy-btn{
      flex-shrink:0;background:none;border:none;cursor:pointer;
      color:var(--muted2);padding:.1rem;transition:color .2s;
    }
    .copy-btn:hover{color:var(--accent)}
    .btn-close-success{
      width:100%;padding:.75rem;
      background:linear-gradient(135deg,var(--accent),var(--teal));
      color:#05080f;font-weight:600;font-size:.88rem;
      border:none;border-radius:10px;cursor:pointer;
      font-family:'Inter',sans-serif;
      transition:opacity .2s;
    }
    .btn-close-success:hover{opacity:.9}

    @media(max-width:640px){
      nav{padding:.8rem 1.2rem}
      .hero{padding:4rem 1.2rem 3.5rem}
      .section-wrap{padding:0 1.2rem}
      .grid{grid-template-columns:1fr}
      .how{padding:1.5rem}
      .how-steps{grid-template-columns:1fr 1fr}
      footer{flex-direction:column;align-items:flex-start;padding:1.5rem 1.2rem}
    }
    @media(max-width:400px){
      .how-steps{grid-template-columns:1fr}
      .stats-row{flex-direction:column}
      .stat{border-right:none;border-bottom:1px solid var(--border)}
      .stat:last-child{border-bottom:none}
    }
  </style>
</head>
<body>

<!-- NAV -->
<nav>
  <a href="/" class="logo">
    <div class="logo-mark">DS</div>
    DigiStore
  </a>
  <div class="nav-right">
    <span class="pill pill-green" style="display:none" id="navNetworkBadge">
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:.3rem;vertical-align:middle;box-shadow:0 0 5px var(--green)"></span>
      BNB Testnet
    </span>
    <span class="pill pill-blue">x402</span>
    <!-- lang toggle -->
    <button class="pill pill-blue" id="btnLang" onclick="toggleLang()" style="cursor:pointer;border:1px solid rgba(96,165,250,.3);background:rgba(96,165,250,.07);font-family:'JetBrains Mono',monospace;font-size:.68rem;font-weight:500;padding:.25rem .65rem;border-radius:99px;color:var(--accent)">EN</button>
    <!-- wallet button — state: disconnected -->
    <button class="btn-wallet" id="btnConnect" onclick="connectWallet()">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
      <span data-i18n="connectWallet">Connect Wallet</span>
    </button>
    <!-- wallet button — state: connected -->
    <div class="wallet-connected" id="walletConnected" style="display:none">
      <div class="wallet-dot"></div>
      <span class="wallet-addr" id="walletAddr">0x...</span>
      <span class="wallet-bal" id="walletBal"></span>
      <button class="btn-disconnect" onclick="disconnectWallet()" title="Disconnect">✕</button>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-glow"></div>
  <div class="hero-grid"></div>
  <div class="hero-inner">
    <div class="hero-eyebrow">
      <span class="hero-eyebrow-dot"></span>
      AI-Native Digital Store
    </div>
    <h1><span data-i18n="heroTitle">Toko Digital untuk</span><br/><span class="grad">AI Agent</span></h1>
    <p class="hero-sub" data-i18n="heroSub">
      Produk digital yang dapat dibeli secara otomatis oleh AI agent via protokol x402 —
      tanpa approval manual, pembayaran langsung on-chain dengan IDRX.
    </p>
    <div class="stats-row">
      <div class="stat">
        <div class="stat-num">5</div>
        <div class="stat-label" data-i18n="statProducts">Produk</div>
      </div>
      <div class="stat">
        <div class="stat-num">x402</div>
        <div class="stat-label" data-i18n="statProtocol">Protokol</div>
      </div>
      <div class="stat">
        <div class="stat-num">IDRX</div>
        <div class="stat-label" data-i18n="statToken">Token</div>
      </div>
      <div class="stat">
        <div class="stat-num">0s</div>
        <div class="stat-label" data-i18n="statApproval">Approval</div>
      </div>
    </div>
  </div>
</section>

<!-- PRODUCTS -->
<div class="section-wrap">
  <div class="section-head">
    <div class="sh-line"></div>
    <h2 data-i18n="sectionProducts">Produk Tersedia</h2>
    <div class="sh-line"></div>
  </div>

  <div class="grid">
    ${productCards}
  </div>

  <!-- HOW IT WORKS -->
  <div class="how">
    <h3 class="how-title" data-i18n="howTitle">Bagaimana AI Agent Membeli di Sini?</h3>
    <p class="how-sub" data-i18n="howSub">
      AI agent dari <strong style="color:var(--accent)">LunasAI</strong> menggunakan tool
      <span class="code-pill">paid_fetch</span> dari MCP server.
      Proses pembayaran terjadi sepenuhnya otomatis — on-chain, tanpa intervensi manusia.
    </p>
    <div class="how-steps">
      <div class="how-step">
        <div class="how-step-num">STEP 01</div>
        <div class="how-step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </div>
        <h4>Fetch Endpoint</h4>
        <p>Agent request ke <span class="code-pill">/x402/products/:id/content</span></p>
      </div>
      <div class="how-step">
        <div class="how-step-num">STEP 02</div>
        <div class="how-step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
        </div>
        <h4>HTTP 402</h4>
        <p data-i18n="step2desc">Server balas dengan payment info — harga &amp; productId</p>
      </div>
      <div class="how-step">
        <div class="how-step-num">STEP 03</div>
        <div class="how-step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h4 data-i18n="step3title">Bayar IDRX</h4>
        <p data-i18n="step3desc">Agent bayar on-chain via ERC-20 IDRX di BNB Testnet</p>
      </div>
      <div class="how-step">
        <div class="how-step-num">STEP 04</div>
        <div class="how-step-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h4 data-i18n="step4title">Konten Dikirim</h4>
        <p data-i18n="step4desc">Fetch ulang dengan <span class="code-pill">X-Payment: txHash</span> — konten digital langsung diterima</p>
      </div>
    </div>
  </div>
</div>

<!-- PAYMENT MODAL -->
<div class="modal-overlay" id="modalOverlay" onclick="handleOverlayClick(event)">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">✕</button>

    <!-- STEP 1: Pilih Wallet -->
    <div class="modal-step active" id="step1">
      <div class="modal-title" data-i18n="modalTitle">Konfirmasi Pembayaran</div>
      <p class="modal-sub" data-i18n="modalSub">Pilih wallet untuk menyelesaikan transaksi on-chain via IDRX</p>
      <div class="modal-product-info">
        <div class="mpi-name" id="modalProductName">—</div>
        <div class="mpi-price" id="modalProductPrice">—</div>
      </div>
      <div class="wallet-options">
        <button class="wallet-btn" onclick="startPayment('metamask')">
          <div class="wallet-logo" style="background:#F6851B22">🦊</div>
          <div class="wallet-info">
            <div class="wallet-name">MetaMask</div>
            <div class="wallet-desc">Browser extension wallet</div>
          </div>
        </button>
        <button class="wallet-btn" onclick="startPayment('trust')">
          <div class="wallet-logo" style="background:#3375BB22">🔵</div>
          <div class="wallet-info">
            <div class="wallet-name">Trust Wallet</div>
            <div class="wallet-desc">Mobile & extension wallet</div>
          </div>
        </button>
        <button class="wallet-btn" onclick="startPayment('privy')">
          <div class="wallet-logo" style="background:#7C3AED22">⚡</div>
          <div class="wallet-info">
            <div class="wallet-name">Privy (Email/Google)</div>
            <div class="wallet-desc">Login tanpa seed phrase</div>
          </div>
        </button>
      </div>
    </div>

    <!-- STEP 2: Processing -->
    <div class="modal-step" id="step2">
      <div class="step-processing">
        <div class="spin-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin" style="color:var(--accent)"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <div class="proc-title" id="procTitle" data-i18n="procTitle">Menunggu konfirmasi wallet...</div>
        <div class="proc-sub" id="procSub" data-i18n="procDontClose">Jangan tutup halaman ini</div>
        <div class="proc-steps">
          <div class="proc-step" id="ps1">
            <div class="proc-dot"></div> <span data-i18n="ps1">Approve IDRX spending</span>
          </div>
          <div class="proc-step" id="ps2">
            <div class="proc-dot"></div> <span data-i18n="ps2">Kirim transaksi on-chain</span>
          </div>
          <div class="proc-step" id="ps3">
            <div class="proc-dot"></div> <span data-i18n="ps3">Menunggu konfirmasi blok</span>
          </div>
          <div class="proc-step" id="ps4">
            <div class="proc-dot"></div> <span data-i18n="ps4">Mengambil konten digital</span>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 3: Success -->
    <div class="modal-step" id="step3">
      <div class="step-success">
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <div class="success-title" data-i18n="successTitle">Pembayaran Berhasil!</div>
        <p class="success-sub" data-i18n="successSub">Produk telah dikirim. Transaksi tercatat on-chain di BNB Testnet.</p>
        <div class="receipt">
          <div class="receipt-row">
            <span class="receipt-label" data-i18n="rcpProduct">Produk</span>
            <span class="receipt-val" id="rcpProduct">—</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label" data-i18n="rcpAmount">Jumlah</span>
            <span class="receipt-val" id="rcpAmount">—</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label" data-i18n="rcpNetwork">Network</span>
            <span class="receipt-val">BNB Testnet</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label" data-i18n="rcpStatus">Status</span>
            <span class="receipt-val green">✓ Confirmed</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label" data-i18n="rcpTime">Waktu</span>
            <span class="receipt-val" id="rcpTime">—</span>
          </div>
        </div>
        <div class="txhash-row">
          <span id="rcpTxHash" style="flex:1">0x...</span>
          <button class="copy-btn" onclick="copyTxHash()" title="Copy tx hash">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
        <a id="scanLink" href="#" target="_blank" rel="noopener"
           style="display:flex;align-items:center;justify-content:center;gap:.4rem;font-size:.76rem;color:var(--accent);text-decoration:none;margin-bottom:.8rem;opacity:.8">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
          <span data-i18n="scanLink">Lihat di BscScan Testnet</span>
        </a>
        <button class="btn-close-success" onclick="closeModal()" data-i18n="btnDone">Selesai</button>
      </div>
    </div>
  </div>
</div>

<script>
  // ── i18n ──────────────────────────────────────────────────
  const STRINGS = {
    id: {
      heroTitle: "Toko Digital untuk",
      heroSub: "Produk digital yang dapat dibeli secara otomatis oleh AI agent via protokol x402 — tanpa approval manual, pembayaran langsung on-chain dengan IDRX.",
      statProducts: "Produk", statProtocol: "Protokol", statToken: "Token", statApproval: "Approval",
      sectionProducts: "Produk Tersedia",
      howTitle: "Bagaimana AI Agent Membeli di Sini?",
      howSub: "AI agent dari LunasAI menggunakan tool paid_fetch dari MCP server. Proses pembayaran terjadi sepenuhnya otomatis — on-chain, tanpa intervensi manusia.",
      step2desc: "Server balas dengan payment info — harga & productId",
      step3title: "Bayar IDRX", step3desc: "Agent bayar on-chain via ERC-20 IDRX di BNB Testnet",
      step4title: "Konten Dikirim", step4desc: "Fetch ulang dengan X-Payment: txHash — konten digital langsung diterima",
      catSubscription: "Langganan", catEbook: "E-Book", catCourse: "Kursus", catLicense: "Lisensi",
      feat1: "Pengiriman instan", feat2: "Bayar via IDRX", feat3: "AI agent compatible",
      buyNow: "Beli Sekarang",
      modalTitle: "Konfirmasi Pembayaran", modalSub: "Pilih wallet untuk menyelesaikan transaksi on-chain via IDRX",
      procTitle: "Menunggu konfirmasi wallet...", procDontClose: "Jangan tutup halaman ini",
      ps1: "Approve IDRX spending", ps2: "Kirim transaksi on-chain", ps3: "Menunggu konfirmasi blok", ps4: "Mengambil konten digital",
      successTitle: "Pembayaran Berhasil!", successSub: "Produk telah dikirim. Transaksi tercatat on-chain di BNB Testnet.",
      rcpProduct: "Produk", rcpAmount: "Jumlah", rcpNetwork: "Network", rcpStatus: "Status", rcpTime: "Waktu",
      scanLink: "Lihat di BscScan Testnet",
      btnDone: "Selesai",
      footerText: "Demo merchant untuk Indonesia Web3 Hackathon 2026",
      connectWallet: "Connect Wallet", connecting: "Menghubungkan...",
      walletNotFound: "Wallet tidak ditemukan.\\n\\nPastikan MetaMask sudah terinstall dan aktif di browser ini.",
      pendingRequest: "MetaMask sudah punya request pending.\\nBuka MetaMask dan approve/reject request yang ada dulu.",
      connectFailed: "Gagal connect: ",
      noAccountSelected: "Tidak ada akun yang dipilih",
      walletNotConnected: "Wallet belum terconnect. Klik \\"Connect Wallet\\" dulu di navbar.",
      txFailedTitle: "Transaksi Gagal",
      txCancelled: "Transaksi dibatalkan oleh pengguna.",
      txGenericError: "Terjadi kesalahan. Coba lagi.",
    },
    en: {
      heroTitle: "Digital Store for",
      heroSub: "Digital products that can be purchased automatically by AI agents via the x402 protocol — no manual approval, payments directly on-chain with IDRX.",
      statProducts: "Products", statProtocol: "Protocol", statToken: "Token", statApproval: "Approval",
      sectionProducts: "Available Products",
      howTitle: "How Does an AI Agent Buy Here?",
      howSub: "LunasAI's AI agent uses the paid_fetch tool from the MCP server. The payment process is fully automatic — on-chain, no human intervention.",
      step2desc: "Server responds with payment info — price & productId",
      step3title: "Pay IDRX", step3desc: "Agent pays on-chain via ERC-20 IDRX on BNB Testnet",
      step4title: "Content Delivered", step4desc: "Re-fetch with X-Payment: txHash — digital content received instantly",
      catSubscription: "Subscription", catEbook: "E-Book", catCourse: "Course", catLicense: "License",
      feat1: "Instant delivery", feat2: "Pay via IDRX", feat3: "AI agent compatible",
      buyNow: "Buy Now",
      modalTitle: "Confirm Payment", modalSub: "Choose a wallet to complete the on-chain transaction via IDRX",
      procTitle: "Waiting for wallet confirmation...", procDontClose: "Don't close this page",
      ps1: "Approve IDRX spending", ps2: "Send on-chain transaction", ps3: "Waiting for block confirmation", ps4: "Fetching digital content",
      successTitle: "Payment Successful!", successSub: "Product delivered. Transaction recorded on-chain on BNB Testnet.",
      rcpProduct: "Product", rcpAmount: "Amount", rcpNetwork: "Network", rcpStatus: "Status", rcpTime: "Time",
      scanLink: "View on BscScan Testnet",
      btnDone: "Done",
      footerText: "Demo merchant for Indonesia Web3 Hackathon 2026",
      connectWallet: "Connect Wallet", connecting: "Connecting...",
      walletNotFound: "Wallet not found.\\n\\nMake sure MetaMask is installed and active in this browser.",
      pendingRequest: "MetaMask already has a pending request.\\nOpen MetaMask and approve/reject the existing request first.",
      connectFailed: "Failed to connect: ",
      noAccountSelected: "No account selected",
      walletNotConnected: "Wallet not connected yet. Click \\"Connect Wallet\\" in the navbar first.",
      txFailedTitle: "Transaction Failed",
      txCancelled: "Transaction cancelled by user.",
      txGenericError: "Something went wrong. Please try again.",
    },
  };

  let currentLang = localStorage.getItem('ds-lang') || 'id';

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('ds-lang', lang);
    document.getElementById('htmlRoot').lang = lang;
    document.getElementById('btnLang').textContent = lang === 'id' ? 'EN' : 'ID';
    const s = STRINGS[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (s[key]) el.textContent = s[key];
    });
    document.querySelectorAll('[data-i18n-id]').forEach(el => {
      el.textContent = lang === 'id' ? el.dataset.i18nId : el.dataset.i18nEn;
    });
  }

  function toggleLang() {
    applyLang(currentLang === 'id' ? 'en' : 'id');
  }

  window.addEventListener('load', () => applyLang(currentLang));

  // ── Wallet connect (navbar) ──────────────────────────────
  // Cari provider MetaMask spesifik dari window.ethereum.providers[]
  function getProvider() {
    if (typeof window.ethereum === 'undefined') return null;
    // Kalau ada multiple providers (konflik extension)
    if (window.ethereum.providers && window.ethereum.providers.length) {
      // Cari yang isMetaMask = true
      const mm = window.ethereum.providers.find(p => p.isMetaMask && !p.isBraveWallet);
      if (mm) return mm;
      // Fallback: provider pertama yang ada
      return window.ethereum.providers[0];
    }
    return window.ethereum;
  }

  async function connectWallet() {
    const btn = document.getElementById('btnConnect');
    const provider = getProvider();
    const s = STRINGS[currentLang];

    if (!provider) {
      alert(s.walletNotFound);
      return;
    }

    const btnLabel = btn.querySelector('span');

    try {
      if (btnLabel) btnLabel.textContent = s.connecting;
      btn.disabled = true;

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) throw new Error(s.noAccountSelected);

      // Simpan provider aktif
      window._activeProvider = provider;
      await afterConnect(accounts[0]);
    } catch(e) {
      if (btnLabel) btnLabel.textContent = s.connectWallet;
      btn.disabled = false;
      if (e.code === 4001) {
        // user cancel
      } else if (e.code === -32002) {
        alert(s.pendingRequest);
      } else {
        alert(s.connectFailed + (e.message || JSON.stringify(e)));
      }
    }
  }

  // Selalu ambil provider aktif — pakai yang sudah dipilih atau cari lagi
  function getEth() {
    return window._activeProvider || getProvider();
  }

  async function afterConnect(address) {
    connectedWallet = address;
    const eth = getEth();
    if (!eth) return;

    // Switch ke BNB Testnet jika perlu
    try {
      const chainId = await eth.request({ method: 'eth_chainId' });
      if (chainId !== BNB_TESTNET_ID) {
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BNB_TESTNET_ID }] });
        } catch(sw) {
          if (sw.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: BNB_TESTNET_ID,
                chainName: 'BNB Smart Chain Testnet',
                nativeCurrency: { name:'tBNB', symbol:'tBNB', decimals:18 },
                rpcUrls: [
                  'https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg',
                  'https://bsc-testnet-rpc.publicnode.com',
                ],
                blockExplorerUrls: ['https://testnet.bscscan.com'],
              }],
            });
          }
        }
      }
    } catch(_) {}

    // Baca saldo IDRX
    const balData = '0x70a08231' + address.replace('0x','').padStart(64,'0');
    try {
      const raw = await eth.request({ method: 'eth_call', params: [{ to: IDRX_ADDRESS, data: balData }, 'latest'] });
      const idrxBal = (parseInt(raw, 16) / 100).toLocaleString('id-ID');
      document.getElementById('walletBal').textContent = idrxBal + ' IDRX';
    } catch(_) {
      document.getElementById('walletBal').textContent = '';
    }

    // Update UI navbar
    const short = address.slice(0,6) + '...' + address.slice(-4);
    document.getElementById('walletAddr').textContent = short;
    const btn = document.getElementById('btnConnect');
    btn.disabled = false;
    btn.style.display = 'none';
    document.getElementById('walletConnected').style.display = 'flex';
    document.getElementById('navNetworkBadge').style.display = 'inline-flex';

    // Listen events pada provider yang aktif
    try {
      eth.on('accountsChanged', accs => { if (accs.length) afterConnect(accs[0]); else disconnectWallet(); });
      eth.on('chainChanged', () => window.location.reload());
    } catch(_) {}
  }

  function disconnectWallet() {
    connectedWallet = null;
    window._activeProvider = null;
    document.getElementById('btnConnect').style.display      = 'flex';
    document.getElementById('walletConnected').style.display = 'none';
    document.getElementById('navNetworkBadge').style.display = 'none';
    document.getElementById('walletBal').textContent = '';
  }

  // Auto reconnect jika sudah pernah connect (tanpa prompt)
  window.addEventListener('load', async () => {
    const provider = getProvider();
    if (!provider) return;
    window._activeProvider = provider;
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts && accounts.length) await afterConnect(accounts[0]);
    } catch(_) {}
  });

  // ── Config ──────────────────────────────────────────────
  const IDRX_ADDRESS   = '0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996';
  const SHOP_WALLET    = '${SHOP_WALLET_ADDRESS}';
  const BNB_TESTNET_ID = '0x61'; // chainId 97 in hex
  const IDRX_DECIMALS  = 2;

  // ERC-20 ABI minimal (approve + transfer)
  const ERC20_APPROVE_ABI = {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
  };
  const ERC20_TRANSFER_ABI = {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  };

  // ── State ────────────────────────────────────────────────
  let currentProduct  = {};
  let connectedWallet = null;

  // ── Helpers ──────────────────────────────────────────────
  function encodeAddress(addr) {
    return addr.replace(/^0x/i,'').toLowerCase().padStart(64,'0');
  }
  function encodeUint256(val) {
    // val is a regular JS number — safe for IDRX amounts (max ~500000 * 100 = 50_000_000)
    const hex = Math.floor(val).toString(16);
    return hex.padStart(64,'0');
  }
  function encodeApprove(spender, amount) {
    return '0x095ea7b3' + encodeAddress(spender) + encodeUint256(amount);
  }
  function encodeTransfer(to, amount) {
    return '0xa9059cbb' + encodeAddress(to) + encodeUint256(amount);
  }
  function priceToRaw(priceDisplay) {
    // priceDisplay contoh: "5.000 IDRX" (id-ID format, titik = pemisah ribuan)
    // Ambil angka saja, hapus semua non-digit
    const digitsOnly = priceDisplay.replace(/[^0-9]/g, '');
    // digitsOnly "5000" → raw unit = 5000 * 100 = 500000 (2 desimal IDRX)
    return parseInt(digitsOnly, 10) * 100;
  }
  function showErr(msg) {
    document.getElementById('procTitle').textContent = STRINGS[currentLang].txFailedTitle;
    document.getElementById('procSub').textContent   = msg;
    document.getElementById('procSub').style.color   = '#f87171';
  }

  // ── Modal ────────────────────────────────────────────────
  function openModal(id, name, price, category) {
    currentProduct = { id, name, price, category };
    document.getElementById('modalProductName').textContent = name;
    document.getElementById('modalProductPrice').textContent = price;
    showStep(1);
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
  function handleOverlayClick(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  }
  function showStep(n) {
    [1,2,3].forEach(i =>
      document.getElementById('step'+i).classList.toggle('active', i===n)
    );
  }
  function setStepState(id, state) {
    const el = document.getElementById(id);
    el.classList.remove('done','active');
    if (state) el.classList.add(state);
  }
  function setProc(title, sub) {
    document.getElementById('procTitle').textContent = title;
    document.getElementById('procSub').textContent   = sub;
    document.getElementById('procSub').style.color   = '';
  }

  // ── Main payment flow ────────────────────────────────────
  async function startPayment(walletType) {
    const eth = getEth();
    if (!eth) {
      alert(STRINGS[currentLang].walletNotConnected);
      return;
    }

    showStep(2);
    ['ps1','ps2','ps3','ps4'].forEach(id => setStepState(id,''));
    setProc('Menghubungkan wallet...','Jangan tutup halaman ini');

    try {
      // 1. Pastikan punya akun
      setStepState('ps1','active');
      setProc('Minta akses wallet...','Konfirmasi di MetaMask');
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      connectedWallet = accounts[0];
      window._activeProvider = eth;

      // 2. Pastikan BNB Testnet
      const chainId = await eth.request({ method: 'eth_chainId' });
      if (chainId !== BNB_TESTNET_ID) {
        setProc('Ganti network ke BNB Testnet...','Konfirmasi di MetaMask');
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BNB_TESTNET_ID }] });
        } catch(sw) {
          if (sw.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: BNB_TESTNET_ID,
                chainName: 'BNB Smart Chain Testnet',
                nativeCurrency: { name:'tBNB', symbol:'tBNB', decimals:18 },
                rpcUrls: [
                  'https://bnb-testnet.g.alchemy.com/v2/alch_fJs5Yxe2OmAOq_F8HiyYg',
                  'https://bsc-testnet-rpc.publicnode.com',
                ],
                blockExplorerUrls: ['https://testnet.bscscan.com'],
              }],
            });
          } else throw sw;
        }
      }

      // 3. Approve IDRX
      setStepState('ps1','done');
      setStepState('ps2','active');
      const rawAmount = priceToRaw(currentProduct.price);
      const approveData = encodeApprove(SHOP_WALLET, rawAmount);
      console.log('[pay] rawAmount:', rawAmount);
      console.log('[pay] SHOP_WALLET:', SHOP_WALLET);
      console.log('[pay] approveData:', approveData);
      console.log('[pay] approveData length:', approveData.length);
      setProc('Approve IDRX...','Konfirmasi approve di MetaMask (1 dari 2)');
      const approveTx = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: connectedWallet, to: IDRX_ADDRESS, data: approveData, gas: '0x186A0' }],
      });
      setProc('Menunggu konfirmasi approve...','Transaksi dikirim');
      await waitForTx(approveTx, eth);

      // 4. Transfer IDRX
      setStepState('ps2','done');
      setStepState('ps3','active');
      setProc('Transfer IDRX ke merchant...','Konfirmasi di MetaMask (2 dari 2)');
      const transferTx = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: connectedWallet, to: IDRX_ADDRESS, data: encodeTransfer(SHOP_WALLET, rawAmount), gas: '0x186A0' }],
      });
      setProc('Menunggu konfirmasi blok...','Sedang di-mine di BNB Testnet');
      await waitForTx(transferTx, eth);

      // 5. Konten digital
      setStepState('ps3','done');
      setStepState('ps4','active');
      setProc('Mengambil konten digital...','Pembayaran terverifikasi');
      await new Promise(r => setTimeout(r, 1000));
      setStepState('ps4','done');
      showSuccess(transferTx);

    } catch(err) {
      console.error(err);
      if (err.code === 4001) showErr(STRINGS[currentLang].txCancelled);
      else showErr(err.message?.slice(0,100) || STRINGS[currentLang].txGenericError);
    }
  }

  async function waitForTx(txHash, eth, maxWait = 60000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const receipt = await eth.request({ method: 'eth_getTransactionReceipt', params: [txHash] });
      if (receipt) return receipt;
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Timeout menunggu konfirmasi transaksi');
  }

  function showSuccess(txHash) {
    const now = new Date().toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' });
    document.getElementById('rcpProduct').textContent = currentProduct.name;
    document.getElementById('rcpAmount').textContent  = currentProduct.price;
    document.getElementById('rcpTime').textContent    = now;
    document.getElementById('rcpTxHash').textContent  = txHash.slice(0,20) + '...' + txHash.slice(-8);
    document.getElementById('rcpTxHash').dataset.full = txHash;
    // Link ke BscScan testnet
    const scanLink = document.getElementById('scanLink');
    if (scanLink) scanLink.href = 'https://testnet.bscscan.com/tx/' + txHash;
    showStep(3);
  }

  function copyTxHash() {
    const full = document.getElementById('rcpTxHash').dataset.full;
    if (full && navigator.clipboard) navigator.clipboard.writeText(full).catch(()=>{});
    const btn = document.querySelector('.copy-btn');
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.style.color = ''; }, 1500);
  }

  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
</script>

<!-- FOOTER -->
<footer>
  <div class="footer-left">
    <strong>DigiStore</strong> &mdash; <span data-i18n="footerText">Demo merchant untuk Indonesia Web3 Hackathon 2026</span>
  </div>
  <div class="footer-right">
    <span class="pill pill-blue">x402 Protocol</span>
    <span class="pill pill-teal">Powered by LunasAI</span>
  </div>
</footer>

</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", shop: "DigiStore", wallet: SHOP_WALLET_ADDRESS });
});

app.get("/products", (_req, res) => {
  res.json(products.map(serializeProduct));
});

app.get("/products/:id", (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(serializeProduct(product));
});

app.post("/purchase", (req, res) => {
  const { productId, paymentTxHash } = req.body ?? {};
  console.log(`[SHOP] Purchase request: ${productId}`);

  const product = findProduct(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const orderId = `ORD-${Date.now()}`;
  console.log(`[SHOP] Order confirmed: ${orderId}, tx: ${paymentTxHash}`);

  res.json({
    success: true,
    message: `Pembelian ${product.name} berhasil!`,
    item: product.name,
    txHash: paymentTxHash,
    orderId,
  });
});

app.get("/x402/products/:id/content", (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const paymentHeader = req.headers["x-payment"] as string | undefined;

  if (!paymentHeader) {
    return res.status(402).json({
      error: "Payment Required",
      x402: {
        version: "1.0",
        scheme: "exact",
        network: "bnb-testnet",
        token: process.env.IDRX_TOKEN_ADDRESS || "0x4E45AABeED9b9BF1D15C09C538b63d9a32Bae996",
        amount: product.priceIdrx.toString(),
        amountDisplay: product.priceDisplay,
        recipient: SHOP_WALLET_ADDRESS,
        productId: product.id,
        productName: product.name,
        description: `Bayar ${product.priceDisplay} untuk akses ${product.name}`,
        instructions:
          "Gunakan MCP tool 'spend' dengan productId ini, lalu ulangi request dengan header X-Payment: <txHash>",
      },
    });
  }

  const txHash = paymentHeader.trim();
  if (!txHash.startsWith("0x") || txHash.length !== 66) {
    return res.status(400).json({ error: "Invalid payment txHash format" });
  }

  const content = generateDigitalContent(product, txHash);
  console.log(`[SHOP] x402 content delivered: ${product.id}, tx: ${txHash}`);
  return res.json({
    success: true,
    product: product.name,
    txHash,
    content,
  });
});

app.listen(PORT, () => {
  console.log(`[SHOP] Demo shop running on port ${PORT}`);
  console.log(`[SHOP] Shop wallet: ${SHOP_WALLET_ADDRESS}`);
});
