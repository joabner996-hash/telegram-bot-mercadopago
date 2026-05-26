const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");
const { config } = require("./config");
const { MercadoPagoClient, externalReference, newOrderId, notificationType, paymentIdFromNotification, verifyWebhookSignature } = require("./mercadopago");
const { deliveryCaption, paymentCreated, pendingStatus, welcome } = require("./messages");
const { checkoutErrorPage, homePage, missingOrderPage, orderPage } = require("./pages");
const { OrderStore } = require("./store");
const { TelegramClient, buyKeyboard, startKeyboard } = require("./telegram");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

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

function render(res, page) {
  res.status(page.status || 200).type("html").send(page.html);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function downloadToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createWebOrder({ name, email }) {
  requirePublicUrl();

  const orderId = newOrderId();
  const externalRef = externalReference(orderId);
  const token = downloadToken();
  const preference = await mercadoPago.createPreference({
    orderId,
    externalReference: externalRef,
    productName: config.productName,
    productPrice: config.productPrice,
    productCurrency: config.productCurrency,
    publicBaseUrl: config.publicBaseUrl,
    buyerName: name,
    buyerEmail: email,
  });
  const checkoutUrl = checkoutUrlFromPreference(preference);

  return store.upsert({
    orderId,
    externalReference: externalRef,
    preferenceId: preference.id,
    checkoutUrl,
    buyerName: name,
    buyerEmail: email,
    downloadToken: token,
    paymentStatus: "created",
    productName: config.productName,
    productPrice: config.productPrice,
    productCurrency: config.productCurrency,
  });
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
  if (!order || order.deliveredAt || !order.telegramChatId) return order;
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
  render(res, homePage(config));
});

app.post("/comprar", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!name || !validEmail(email)) {
    render(res, checkoutErrorPage("Informe nome e e-mail validos para iniciar a compra."));
    return;
  }

  try {
    const order = await createWebOrder({ name, email });
    res.redirect(order.checkoutUrl);
  } catch (error) {
    console.error("Erro ao criar compra web", error);
    render(res, checkoutErrorPage("Nao consegui gerar o pagamento agora. Confira as configuracoes do Mercado Pago e tente novamente."));
  }
});

app.post("/recuperar", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!validEmail(email)) {
    render(res, checkoutErrorPage("Informe um e-mail valido para recuperar o acesso."));
    return;
  }

  const order = store.latestByEmail(email);
  if (!order) {
    render(res, missingOrderPage());
    return;
  }

  res.redirect(`/pedido/${encodeURIComponent(order.orderId)}`);
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    product: config.productName,
    price: config.productPrice,
    ebookExists: fs.existsSync(config.ebookPath),
    publicBaseUrlConfigured: Boolean(config.publicBaseUrl),
    mercadoPagoWebhookSignatureEnabled: Boolean(config.mercadoPagoWebhookSecret),
  });
});

app.get(["/obrigado", "/pendente", "/falhou"], (req, res) => {
  const order = store.get(req.query.order_id);
  if (!order) {
    render(res, missingOrderPage());
    return;
  }
  render(res, orderPage({ order, config, downloadToken: order.downloadToken }));
});

app.get("/pedido/:orderId", (req, res) => {
  const order = store.get(req.params.orderId);
  if (!order) {
    render(res, missingOrderPage());
    return;
  }
  render(res, orderPage({ order, config, downloadToken: order.downloadToken }));
});

app.get("/download/:token", (req, res) => {
  const order = store.getByDownloadToken(req.params.token);
  if (!order || order.paymentStatus !== "approved" || !order.validAmount) {
    render(res, missingOrderPage());
    return;
  }
  if (!fs.existsSync(config.ebookPath)) {
    render(res, checkoutErrorPage("O arquivo do ebook nao foi encontrado no servidor. Entre em contato com o suporte."));
    return;
  }

  store.update(order.orderId, {
    downloadedAt: new Date().toISOString(),
    downloadCount: Number(order.downloadCount || 0) + 1,
  });

  res.download(config.ebookPath, "manual-sobrevivencia-edicao-cozinha.pdf");
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
  const signature = verifyWebhookSignature(req, config.mercadoPagoWebhookSecret);
  if (!signature.ok) {
    console.warn("Webhook Mercado Pago recusado por assinatura invalida", signature);
    res.sendStatus(401);
    return;
  }

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
