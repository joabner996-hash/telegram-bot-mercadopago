const fs = require("node:fs");
const express = require("express");
const { config } = require("./config");
const { MercadoPagoClient, externalReference, newOrderId, notificationType, paymentIdFromNotification } = require("./mercadopago");
const { deliveryCaption, paymentCreated, pendingStatus, welcome } = require("./messages");
const { OrderStore } = require("./store");
const { TelegramClient, buyKeyboard, startKeyboard } = require("./telegram");

const app = express();
app.use(express.json({ limit: "1mb" }));

const store = new OrderStore(config.dataPath);
const telegram = new TelegramClient(config.telegramToken);
const mercadoPago = new MercadoPagoClient(config.mercadoPagoAccessToken);

function requirePublicUrl() {
  if (!config.publicBaseUrl) {
    throw new Error("PUBLIC_BASE_URL ainda nao foi configurada. Publique o app ou use um tunel HTTPS antes de vender.");
  }
}

function checkoutUrlFromPreference(preference) {
  if (config.mercadoPagoSandbox) return preference.sandbox_init_point || preference.init_point;
  return preference.init_point || preference.sandbox_init_point;
}

async function createOrderForTelegramUser({ userId, chatId }) {
  requirePublicUrl();

  const orderId = newOrderId();
  const externalRef = externalReference(orderId);
  const preference = await mercadoPago.createPreference({
    orderId,
    externalReference: externalRef,
    productName: config.productName,
    productPrice: config.productPrice,
    productCurrency: config.productCurrency,
    publicBaseUrl: config.publicBaseUrl,
    telegramUserId: userId,
    telegramChatId: chatId,
  });
  const checkoutUrl = checkoutUrlFromPreference(preference);

  return store.upsert({
    orderId,
    externalReference: externalRef,
    preferenceId: preference.id,
    checkoutUrl,
    telegramUserId: String(userId),
    telegramChatId: String(chatId),
    paymentStatus: "created",
    productName: config.productName,
    productPrice: config.productPrice,
    productCurrency: config.productCurrency,
  });
}

async function deliverOrder(order) {
  if (!order || order.deliveredAt) return order;
  if (!fs.existsSync(config.ebookPath)) {
    throw new Error(`PDF nao encontrado em ${config.ebookPath}`);
  }

  await telegram.sendDocument(
    order.telegramChatId,
    config.ebookPath,
    deliveryCaption(config.productName),
  );

  return store.update(order.orderId, {
    deliveredAt: new Date().toISOString(),
    deliveryStatus: "sent",
  });
}

async function sendStart(chatId) {
  await telegram.sendMessage(chatId, welcome(config.productName, config.productPrice), {
    reply_markup: startKeyboard(),
  });
}

async function sendBuy(chatId, userId) {
  try {
    const order = await createOrderForTelegramUser({ userId, chatId });
    await telegram.sendMessage(chatId, paymentCreated(config.productName, order.checkoutUrl), {
      reply_markup: buyKeyboard(order.checkoutUrl),
    });
  } catch (error) {
    console.error("Erro ao criar pagamento", error);
    const text = config.publicBaseUrl
      ? "Nao consegui gerar o pagamento agora. Tente novamente em alguns instantes."
      : "O bot ja esta montado, mas ainda falta configurar a URL publica de hospedagem para gerar pagamentos.";
    await telegram.sendMessage(chatId, text);
  }
}

async function sendStatus(chatId, userId) {
  const order = store.latestByTelegramUser(userId);
  await telegram.sendMessage(chatId, pendingStatus(order), {
    reply_markup: startKeyboard(),
  });
  if (order?.paymentStatus === "approved" && !order.deliveredAt) {
    await deliverOrder(order);
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from?.id || chatId;
  const text = String(message.text || "").trim().toLowerCase();

  if (["/start", "start", "oi", "ola", "olá"].includes(text)) {
    await sendStart(chatId);
    return;
  }
  if (["/comprar", "comprar", "comprar ebook"].includes(text)) {
    await sendBuy(chatId, userId);
    return;
  }
  if (["/status", "status", "ja paguei", "já paguei"].includes(text)) {
    await sendStatus(chatId, userId);
    return;
  }
  if (["/ajuda", "ajuda"].includes(text)) {
    await telegram.sendMessage(chatId, `Para suporte, fale por aqui mesmo: ${config.supportUrl}`, {
      reply_markup: startKeyboard(),
    });
    return;
  }

  await telegram.sendMessage(chatId, "Escolha uma opcao:", { reply_markup: startKeyboard() });
}

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  await telegram.answerCallbackQuery(callbackQuery.id);

  if (callbackQuery.data === "buy") {
    await sendBuy(chatId, userId);
    return;
  }
  if (callbackQuery.data === "status") {
    await sendStatus(chatId, userId);
  }
}

async function processPayment(paymentId) {
  const payment = await mercadoPago.getPayment(paymentId);
  const order = store.getByExternalReference(payment.external_reference)
    || store.getByPreferenceId(payment.preference_id);

  if (!order) {
    console.warn("Pagamento recebido sem pedido local correspondente", {
      paymentId,
      external_reference: payment.external_reference,
      preference_id: payment.preference_id,
      status: payment.status,
    });
    return null;
  }

  const amount = Number(payment.transaction_amount || 0);
  const expected = Number(order.productPrice || config.productPrice);
  const validAmount = payment.currency_id === order.productCurrency && amount + 0.001 >= expected;

  const updated = store.update(order.orderId, {
    paymentId: String(payment.id),
    paymentStatus: payment.status,
    paymentStatusDetail: payment.status_detail,
    paymentReceivedAt: new Date().toISOString(),
    validAmount,
  });

  if (payment.status === "approved" && validAmount) {
    await deliverOrder(updated);
  } else if (payment.status === "approved" && !validAmount) {
    await telegram.sendMessage(
      order.telegramChatId,
      "Recebi uma aprovacao de pagamento, mas o valor/moeda nao bate com o produto. Vou segurar a entrega para revisao manual.",
    );
  }

  return updated;
}

app.get("/", (_req, res) => {
  res.type("text/plain").send("MSCoz bot online");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    product: config.productName,
    price: config.productPrice,
    ebookExists: fs.existsSync(config.ebookPath),
    publicBaseUrlConfigured: Boolean(config.publicBaseUrl),
  });
});

app.get(["/obrigado", "/pendente", "/falhou"], (req, res) => {
  const status = req.path.includes("obrigado")
    ? "Obrigado pela compra. Assim que o pagamento for aprovado, o bot envia o PDF no Telegram."
    : req.path.includes("pendente")
      ? "Pagamento pendente. Volte ao Telegram; o bot enviara o PDF quando aprovar."
      : "Pagamento nao concluido. Volte ao Telegram para gerar um novo link.";
  res.type("html").send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body><h1>${status}</h1><p>Pode fechar esta pagina e voltar ao bot.</p></body></html>`);
});

app.post(`/telegram/${config.telegramWebhookSecret}`, async (req, res) => {
  const secret = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret && secret !== config.telegramWebhookSecret) {
    res.sendStatus(403);
    return;
  }

  res.sendStatus(200);
  try {
    if (req.body.message) await handleMessage(req.body.message);
    if (req.body.callback_query) await handleCallbackQuery(req.body.callback_query);
  } catch (error) {
    console.error("Erro ao processar update Telegram", error);
  }
});

app.post("/webhooks/mercadopago", async (req, res) => {
  res.sendStatus(200);
  try {
    const type = notificationType(req);
    const paymentId = paymentIdFromNotification(req);
    if (type && type !== "payment") return;
    if (!paymentId) {
      console.warn("Webhook Mercado Pago sem paymentId", { body: req.body, query: req.query });
      return;
    }
    await processPayment(paymentId);
  } catch (error) {
    console.error("Erro ao processar webhook Mercado Pago", error);
  }
});

app.listen(config.port, () => {
  console.log(`Bot online na porta ${config.port}`);
  console.log(`PDF: ${config.ebookPath}`);
});
