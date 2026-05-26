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
        telegram_user_id: String(telegramUserId),
        telegram_chat_id: String(telegramChatId),
      },
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

module.exports = {
  MercadoPagoClient,
  externalReference,
  newOrderId,
  notificationType,
  paymentIdFromNotification,
};
