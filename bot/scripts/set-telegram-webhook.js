const { config } = require("../src/config");
const { TelegramClient } = require("../src/telegram");

async function main() {
  if (!config.publicBaseUrl) throw new Error("PUBLIC_BASE_URL precisa estar configurada.");
  const telegram = new TelegramClient(config.telegramToken);
  const url = `${config.publicBaseUrl}/telegram/${config.telegramWebhookSecret}`;
  const result = await telegram.setWebhook(url, config.telegramWebhookSecret);
  console.log(JSON.stringify({ ok: true, webhookUrl: url, result }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
