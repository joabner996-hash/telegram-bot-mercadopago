# Bot de venda do ebook no Telegram

Este bot vende o PDF `Manual de Sobrevivência: Edição Cozinha` pelo Mercado Pago e entrega o arquivo automaticamente no Telegram quando o pagamento for aprovado.

## Fluxo

1. Cliente chama o bot e toca em `Comprar ebook`.
2. O bot cria uma preferência no Mercado Pago com um `external_reference` único.
3. O cliente paga pelo Checkout Pro.
4. O Mercado Pago chama `POST /webhooks/mercadopago`.
5. O bot consulta o pagamento, valida valor/moeda/status e envia o PDF pelo Telegram.

## Configuração local

1. Copie o arquivo de exemplo:

```powershell
Copy-Item .\bot\.env.example .\bot\.env
```

2. Edite `bot/.env`:

```env
TELEGRAM_BOT_TOKEN=token_novo_do_bot
TELEGRAM_WEBHOOK_SECRET=texto_grande_aleatorio
MERCADOPAGO_ACCESS_TOKEN=access_token_do_mercado_pago
MERCADOPAGO_WEBHOOK_SECRET=assinatura_secreta_do_webhook
MP_USE_SANDBOX=true
PUBLIC_BASE_URL=https://sua-url-publica
PRODUCT_PRICE=8.99
```

3. Instale dependências e rode:

```powershell
npm install
npm run bot
```

## Webhooks

### Telegram

Depois que o app tiver uma URL pública HTTPS:

```powershell
npm run bot:setup-webhook
```

Para conferir:

```powershell
npm run bot:check-webhook
```

### Mercado Pago

No painel do Mercado Pago, configure:

- URL de teste: `https://sua-url-publica/webhooks/mercadopago`
- URL de produção: `https://sua-url-publica/webhooks/mercadopago`
- Evento/tópico: `Pagamentos` ou `payment`
- Assinatura secreta: copie a chave exibida pelo Mercado Pago para `MERCADOPAGO_WEBHOOK_SECRET`

O bot também envia `notification_url` em cada pagamento criado, então essa URL acompanha cada preferência.

## Hospedagem recomendada

Para começar com pouco atrito, use Railway:

- Ele gera HTTPS automaticamente.
- Permite variáveis de ambiente.
- Roda Node.js sem precisar configurar servidor manualmente.

Para produção mais estável e barata no longo prazo, uma VPS pequena com Node.js + PM2 também funciona muito bem.

## Segurança

- Não coloque tokens em código.
- Não suba `bot/.env` para GitHub.
- Antes de produção, regenere o token do Telegram no BotFather se ele já foi colado em chat, print ou documento.
- Troque `MP_USE_SANDBOX=false` quando usar o access token de produção do Mercado Pago.
