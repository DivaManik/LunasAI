export interface Product {
  id: string;
  name: string;
  description: string;
  priceIdrx: bigint;
  priceDisplay: string;
  category: string;
  deliverable: string;
}

export const products: Product[] = [
  {
    id: "ai-premium",
    name: "Akses AI Premium",
    description: "Akses fitur AI premium selama 30 hari — unlimited query, priority response",
    priceIdrx: BigInt(500000),
    priceDisplay: "5.000 IDRX",
    category: "subscription",
    deliverable: "activation_code",
  },
  {
    id: "ebook-web3",
    name: "E-Book: Panduan Web3 Indonesia",
    description: "PDF 200+ halaman — DeFi, NFT, dan masa depan ekonomi digital Indonesia",
    priceIdrx: BigInt(1500000),
    priceDisplay: "15.000 IDRX",
    category: "ebook",
    deliverable: "download_link",
  },
  {
    id: "newsletter-pro",
    name: "Newsletter Pro — 1 Tahun",
    description: "Analisis crypto mingguan + alpha Web3 Indonesia langsung ke email",
    priceIdrx: BigInt(2500000),
    priceDisplay: "25.000 IDRX",
    category: "subscription",
    deliverable: "email_subscription",
  },
  {
    id: "kursus-blockchain",
    name: "Kursus Blockchain Developer",
    description: "Video course 40+ jam — Solidity, DeFi protocol, deploy smart contract di BNB Chain",
    priceIdrx: BigInt(15000000),
    priceDisplay: "150.000 IDRX",
    category: "course",
    deliverable: "course_access_link",
  },
  {
    id: "software-license",
    name: "Software License — AgentPay SDK",
    description: "Lisensi komersial SDK AgentPay untuk integrasi di aplikasi bisnis",
    priceIdrx: BigInt(50000000),
    priceDisplay: "500.000 IDRX",
    category: "license",
    deliverable: "license_key",
  },
];

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function serializeProduct(product: Product) {
  return {
    ...product,
    priceIdrx: product.priceIdrx.toString(),
  };
}
