const { config } = require("../src/config");
const { TelegramClient } = require("../src/telegram");

async function main() {
  const telegram = new TelegramClient(config.telegramToken);
  const me = await telegram.getMe();
  const webhook = await telegram.getWebhookInfo();
  console.log(JSON.stringify({ me, webhook }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
