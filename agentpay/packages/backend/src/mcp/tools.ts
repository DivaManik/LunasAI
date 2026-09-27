import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const agentPayTools: Tool[] = [
  {
    name: "get_card_info",
    description:
      "Lihat informasi spending card: sisa budget, auto-approve limit, status aktif/expired",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_products",
    description: "Lihat daftar produk yang tersedia di demo shop beserta harganya",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "spend",
    description:
      "Beli produk menggunakan spending card. Jika harga melebihi auto-approve limit, akan membutuhkan approval dari pemilik card.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID produk yang ingin dibeli" },
        chatId: {
          type: "string",
          description: "Telegram chat ID untuk notifikasi approval (opsional)",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "get_history",
    description: "Lihat riwayat transaksi dari sebuah spending card",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "paid_fetch",
    description:
      "Akses konten berbayar menggunakan x402 protocol. Otomatis: coba fetch URL → jika 402, bayar dengan spending card → fetch ulang dengan bukti pembayaran → kembalikan konten digital.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL konten yang ingin diakses (endpoint x402)",
        },
        chatId: {
          type: "string",
          description: "Telegram chat ID untuk notifikasi approval jika harga melebihi auto-approve limit (opsional)",
        },
      },
      required: ["url"],
    },
  },
];
