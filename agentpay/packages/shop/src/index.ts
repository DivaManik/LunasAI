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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", shop: "AgentPay Demo Shop", wallet: SHOP_WALLET_ADDRESS });
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
