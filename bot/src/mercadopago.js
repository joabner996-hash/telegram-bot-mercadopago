const crypto = require("node:crypto");

class MercadoPagoClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = "https://api.mercadopago.com";
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Mercado Pago falhou: ${response.status} ${JSON.stringify(json)}`);
    }
    return json;
  }

  createPreference({
    orderId,
    externalReference,
    productName,
    productPrice,
    productCurrency,
    publicBaseUrl,
    buyerName,
    buyerEmail,
    telegramUserId,
    telegramChatId,
  }) {
    const body = {
      items: [
        {
          id: "manual-sobrevivencia-edicao-cozinha",
          title: productName,
          description: "Livro digital em PDF",
          category_id: "books",
          quantity: 1,
          currency_id: productCurrency,
          unit_price: productPrice,
        },
      ],
      external_reference: externalReference,
      metadata: {
        order_id: orderId,
        buyer_name: buyerName || "",
        buyer_email: buyerEmail || "",
        telegram_user_id: telegramUserId ? String(telegramUserId) : "",
        telegram_chat_id: telegramChatId ? String(telegramChatId) : "",
      },
      payer: buyerEmail ? { name: buyerName || undefined, email: buyerEmail } : undefined,
      notification_url: `${publicBaseUrl}/webhooks/mercadopago`,
      back_urls: {
        success: `${publicBaseUrl}/obrigado?order_id=${encodeURIComponent(orderId)}`,
        pending: `${publicBaseUrl}/pendente?order_id=${encodeURIComponent(orderId)}`,
        failure: `${publicBaseUrl}/falhou?order_id=${encodeURIComponent(orderId)}`,
      },
      auto_return: "approved",
      statement_descriptor: "MS COZINHA",
      expires: true,
      expiration_date_to: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };

    return this.request("/checkout/preferences", {
      method: "POST",
      headers: { "X-Idempotency-Key": orderId },
      body: JSON.stringify(body),
    });
  }

  getPayment(paymentId) {
    return this.request(`/v1/payments/${encodeURIComponent(paymentId)}`);
  }
}

function newOrderId() {
  return crypto.randomUUID();
}

function externalReference(orderId) {
  return `mscoz:${orderId}`;
}

function paymentIdFromNotification(req) {
  return (
    req.body?.data?.id ||
    req.body?.id ||
    req.query?.["data.id"] ||
    req.query?.id ||
    req.query?.payment_id ||
    null
  );
}

function notificationType(req) {
  return req.body?.type || req.body?.topic || req.query?.type || req.query?.topic || "";
}

function signatureParts(header) {
  return String(header || "")
    .split(",")
    .map((part) => part.trim().split("="))
    .reduce((acc, [key, value]) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {});
}

function timingSafeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhookSignature(req, secret) {
  if (!secret) return { ok: true, skipped: true };

  const xSignature = req.get("x-signature");
  const xRequestId = req.get("x-request-id");
  const dataId = req.query?.["data.id"] || req.body?.data?.id || req.body?.id || req.query?.id;
  const { ts, v1 } = signatureParts(xSignature);

  if (!xSignature || !xRequestId || !dataId || !ts || !v1) {
    return { ok: false, reason: "missing_signature_fields" };
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return {
    ok: timingSafeEqualHex(expected, v1),
    reason: "signature_mismatch",
  };
}

module.exports = {
  MercadoPagoClient,
  externalReference,
  newOrderId,
  notificationType,
  paymentIdFromNotification,
  verifyWebhookSignature,
};
