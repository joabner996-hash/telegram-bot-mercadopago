const fs = require("node:fs/promises");
const path = require("node:path");

class TelegramClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async call(method, body) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) {
      throw new Error(`Telegram ${method} falhou: ${response.status} ${JSON.stringify(json)}`);
    }
    return json.result;
  }

  getMe() {
    return this.call("getMe");
  }

  getWebhookInfo() {
    return this.call("getWebhookInfo");
  }

  setWebhook(url, secretToken) {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
  }

  deleteWebhook(dropPendingUpdates = false) {
    return this.call("deleteWebhook", { drop_pending_updates: dropPendingUpdates });
  }

  sendMessage(chatId, text, options = {}) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...options,
    });
  }

  answerCallbackQuery(callbackQueryId, text = "") {
    return this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  }

  async sendDocument(chatId, filePath, caption) {
    const bytes = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
    form.append("document", new Blob([bytes], { type: "application/pdf" }), fileName);

    const response = await fetch(`${this.baseUrl}/sendDocument`, {
      method: "POST",
      body: form,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) {
      throw new Error(`Telegram sendDocument falhou: ${response.status} ${JSON.stringify(json)}`);
    }
    return json.result;
  }
}

function buyKeyboard(url) {
  return {
    inline_keyboard: [
      [{ text: "Comprar agora - R$ 8,99", url }],
      [{ text: "Ja paguei", callback_data: "status" }],
    ],
  };
}

function startKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Comprar ebook", callback_data: "buy" }],
      [{ text: "Ver status da compra", callback_data: "status" }],
    ],
  };
}

module.exports = { TelegramClient, buyKeyboard, startKeyboard };
