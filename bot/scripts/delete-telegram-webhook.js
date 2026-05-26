const { config } = require("../src/config");
const { TelegramClient } = require("../src/telegram");

async function main() {
  const telegram = new TelegramClient(config.telegramToken);
  const result = await telegram.deleteWebhook(false);
  console.log(JSON.stringify({ ok: true, result }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
