const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config();

const ROOT = path.resolve(__dirname, "..", "..");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  return value;
}

function optional(name, fallback = "") {
  return process.env[name] || fallback;
}

function money(name, fallback) {
  const raw = optional(name, fallback);
  const parsed = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Valor invalido em ${name}: ${raw}`);
  }
  return parsed;
}

function bool(name, fallback = false) {
  const raw = optional(name, fallback ? "true" : "false").toLowerCase();
  return ["1", "true", "yes", "sim", "on"].includes(raw);
}

const config = {
  root: ROOT,
  port: Number(optional("PORT", "3000")),
  nodeEnv: optional("NODE_ENV", "development"),
  telegramToken: optional("TELEGRAM_BOT_TOKEN", "telegram-disabled"),
  telegramWebhookSecret: optional("TELEGRAM_WEBHOOK_SECRET", "telegram-disabled"),
  mercadoPagoAccessToken: required("MERCADOPAGO_ACCESS_TOKEN"),
  mercadoPagoWebhookSecret: optional("MERCADOPAGO_WEBHOOK_SECRET"),
  mercadoPagoSandbox: bool("MP_USE_SANDBOX", true),
  publicBaseUrl: optional("PUBLIC_BASE_URL").replace(/\/+$/, ""),
  productName: optional("PRODUCT_NAME", "Manual de Sobrevivencia: Edicao Cozinha"),
  productPrice: money("PRODUCT_PRICE", "8.99"),
  productCurrency: optional("PRODUCT_CURRENCY", "BRL"),
  ebookPath: path.resolve(ROOT, optional("EBOOK_PATH", "output/manual_sobrevivencia_edicao_cozinha.pdf")),
  supportUrl: optional("SUPPORT_URL", "https://t.me/MSCoz_bot"),
  dataPath: path.resolve(ROOT, optional("ORDERS_PATH", "bot/data/orders.json")),
};

module.exports = { config };
