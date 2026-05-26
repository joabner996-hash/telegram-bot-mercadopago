const fs = require("node:fs");
const path = require("node:path");

class OrderStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { orders: [] };
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.save();
      return;
    }
    const raw = fs.readFileSync(this.filePath, "utf8");
    this.data = raw.trim() ? JSON.parse(raw) : { orders: [] };
    if (!Array.isArray(this.data.orders)) this.data.orders = [];
  }

  save() {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  all() {
    return this.data.orders;
  }

  get(orderId) {
    return this.data.orders.find((order) => order.orderId === orderId);
  }

  getByExternalReference(externalReference) {
    return this.data.orders.find((order) => order.externalReference === externalReference);
  }

  getByPreferenceId(preferenceId) {
    return this.data.orders.find((order) => order.preferenceId === preferenceId);
  }

  latestByTelegramUser(telegramUserId) {
    return [...this.data.orders]
      .filter((order) => String(order.telegramUserId) === String(telegramUserId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }

  upsert(order) {
    const index = this.data.orders.findIndex((item) => item.orderId === order.orderId);
    const saved = {
      ...order,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) this.data.orders[index] = { ...this.data.orders[index], ...saved };
    else this.data.orders.push({ ...saved, createdAt: order.createdAt || new Date().toISOString() });
    this.save();
    return this.get(order.orderId);
  }

  update(orderId, patch) {
    const order = this.get(orderId);
    if (!order) return null;
    Object.assign(order, patch, { updatedAt: new Date().toISOString() });
    this.save();
    return order;
  }
}

module.exports = { OrderStore };
