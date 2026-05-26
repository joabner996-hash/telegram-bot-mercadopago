# Loja do ebook com Mercado Pago

Este app vende o PDF `Manual de Sobrevivência: Edição Cozinha` em uma página web, recebe confirmação do Mercado Pago por webhook e libera o download seguro no próprio site.

O bot do Telegram continua no código como opção secundária, mas o fluxo principal agora é site + checkout + download.

## Fluxo principal

1. Cliente acessa a página inicial.
2. Informa nome e e-mail.
3. O app cria um pedido com `external_reference` único.
4. O Mercado Pago abre o checkout.
5. O Mercado Pago chama `POST /webhooks/mercadopago`.
6. O app consulta o pagamento e valida status, valor e moeda.
7. Se aprovado, a página `/obrigado?order_id=...` libera um botão de download.
8. O PDF sai por `/download/:token`, sem expor o caminho real do arquivo.

## Variáveis de ambiente

```env
PORT=3000
NODE_ENV=production

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

MERCADOPAGO_ACCESS_TOKEN=access_token_do_mercado_pago
MERCADOPAGO_WEBHOOK_SECRET=assinatura_secreta_do_webhook
MP_USE_SANDBOX=true

PUBLIC_BASE_URL=https://seu-dominio-publico

PRODUCT_NAME=Manual de Sobrevivência: Edição Cozinha
PRODUCT_PRICE=8.99
PRODUCT_CURRENCY=BRL
EBOOK_PATH=output/manual_sobrevivencia_edicao_cozinha.pdf
SUPPORT_URL=https://t.me/MSCoz_bot
ORDERS_PATH=/data/orders.json
```

Se ainda não tiver a assinatura secreta do Mercado Pago, deixe `MERCADOPAGO_WEBHOOK_SECRET` sem valor. Preencha depois que o painel do Mercado Pago mostrar a chave.

## Endpoints

- `GET /` - página de venda
- `POST /comprar` - cria pedido e redireciona para o checkout
- `POST /recuperar` - recupera a compra pelo e-mail
- `GET /obrigado?order_id=...` - mostra status e libera download se aprovado
- `GET /pedido/:orderId` - consulta status do pedido
- `GET /download/:token` - entrega o PDF se o pedido estiver aprovado
- `POST /webhooks/mercadopago` - recebe notificações do Mercado Pago
- `GET /health` - health check para Railway

## Railway

Use:

```text
npm run bot
```

Para não perder pedidos em redeploys, crie um Volume no Railway montado em:

```text
/data
```

E configure:

```env
ORDERS_PATH=/data/orders.json
```

Configure no Mercado Pago:

```text
https://SEU-DOMINIO/webhooks/mercadopago
```

Evento/tópico:

```text
Pagamentos / payment
```

Depois de trocar para produção:

```env
MP_USE_SANDBOX=false
MERCADOPAGO_ACCESS_TOKEN=token_de_producao
```

## Segurança

- Não suba `.env` para GitHub.
- Não exponha o caminho direto do PDF.
- Use a assinatura secreta do webhook quando estiver disponível.
- Mantenha `PRODUCT_PRICE=8.99` com ponto.
