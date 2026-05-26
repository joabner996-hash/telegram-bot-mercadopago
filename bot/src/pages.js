const { escapeHtml } = require("./messages");

function brl(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function layout({ title, body, status = 200 }) {
  return {
    status,
    html: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #231a14;
      --muted: #6c5d50;
      --line: #ead8c2;
      --paper: #fffaf3;
      --panel: #fffdf9;
      --brand: #7b2d12;
      --accent: #c8793f;
      --ok: #2f7d46;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.45;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 24px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr);
      gap: 28px;
      align-items: center;
      min-height: 92vh;
      padding: 22px 0 32px;
    }
    h1 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(40px, 7vw, 76px);
      line-height: .94;
      margin: 0 0 18px;
      color: var(--brand);
      letter-spacing: 0;
    }
    h2 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 30px;
      margin: 0 0 12px;
      color: var(--brand);
      letter-spacing: 0;
    }
    p { margin: 0 0 16px; color: var(--muted); font-size: 17px; }
    .lead { font-size: 20px; max-width: 680px; color: #48382d; }
    .price { font-size: 34px; font-weight: 800; color: var(--ink); margin: 18px 0; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 16px 45px rgba(70, 42, 22, .10);
    }
    .book {
      min-height: 430px;
      border-radius: 6px;
      background:
        linear-gradient(120deg, rgba(255,255,255,.16), rgba(255,255,255,0) 38%),
        linear-gradient(155deg, #8a3518, #d1904e 64%, #f4d6a2);
      border: 1px solid #a05222;
      padding: 32px;
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .book strong {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 46px;
      line-height: .95;
      letter-spacing: 0;
      display: block;
    }
    .book span { font-size: 22px; display: block; margin-top: 10px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 22px 0;
    }
    .stat {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fff;
    }
    .stat b { display: block; font-size: 20px; color: var(--brand); }
    label { display: block; font-weight: 700; margin: 12px 0 6px; }
    input {
      width: 100%;
      border: 1px solid #d6b995;
      border-radius: 6px;
      padding: 13px 12px;
      font-size: 16px;
      background: #fff;
    }
    button, .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      border: 0;
      border-radius: 6px;
      padding: 0 18px;
      background: var(--brand);
      color: white;
      font-weight: 800;
      font-size: 16px;
      text-decoration: none;
      cursor: pointer;
      width: 100%;
      margin-top: 16px;
    }
    .button.secondary { background: #fff; color: var(--brand); border: 1px solid #d6b995; }
    ul { margin: 16px 0 0; padding-left: 20px; color: var(--muted); }
    li { margin: 8px 0; }
    .center {
      min-height: 86vh;
      display: grid;
      place-items: center;
    }
    .status { max-width: 680px; width: 100%; }
    .ok { color: var(--ok); font-weight: 800; }
    .small { font-size: 13px; color: #7d6e62; }
    @media (max-width: 820px) {
      main { padding: 18px; }
      .hero { grid-template-columns: 1fr; min-height: auto; }
      .book { min-height: 330px; }
      .stats { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`,
  };
}

function homePage(config) {
  return layout({
    title: config.productName,
    body: `<main>
  <section class="hero">
    <div>
      <h1>Manual de Sobrevivência</h1>
      <p class="lead">Edição Cozinha: 500 receitas organizadas para aqueles dias em que a fome chega, a geladeira olha de volta e a ideia some.</p>
      <div class="stats">
        <div class="stat"><b>500</b><span>receitas</span></div>
        <div class="stat"><b>9</b><span>categorias</span></div>
        <div class="stat"><b>PDF</b><span>download imediato</span></div>
      </div>
      <p>Depois da aprovação pelo Mercado Pago, o botão de download é liberado no próprio site.</p>
    </div>
    <div class="panel">
      <div class="book">
        <div>
          <strong>Manual de Sobrevivência</strong>
          <span>Edição Cozinha</span>
        </div>
        <div>Carne bovina, suína, frango, peixes, saladas, molhos, massas e sobremesas.</div>
      </div>
      <div class="price">${brl(config.productPrice)}</div>
      <form method="post" action="/comprar">
        <label for="name">Nome</label>
        <input id="name" name="name" required maxlength="80" autocomplete="name" placeholder="Seu nome">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" required maxlength="120" autocomplete="email" placeholder="voce@email.com">
        <button type="submit">Comprar e baixar</button>
      </form>
      <form method="post" action="/recuperar">
        <label for="recover-email">Já comprou?</label>
        <input id="recover-email" name="email" type="email" required maxlength="120" autocomplete="email" placeholder="E-mail usado na compra">
        <button class="button secondary" type="submit">Recuperar acesso</button>
      </form>
      <p class="small">Pagamento processado pelo Mercado Pago. O e-mail ajuda a recuperar o acesso se você fechar a página.</p>
    </div>
  </section>
</main>`,
  });
}

function checkoutErrorPage(message) {
  return layout({
    title: "Nao foi possivel iniciar a compra",
    status: 500,
    body: `<main class="center"><section class="panel status">
      <h2>Não foi possível iniciar a compra</h2>
      <p>${escapeHtml(message)}</p>
      <a class="button secondary" href="/">Voltar</a>
    </section></main>`,
  });
}

function orderPage({ order, config, downloadToken }) {
  const approved = order?.paymentStatus === "approved" && order?.validAmount;
  const rejected = order?.paymentStatus === "rejected";
  const pending = !approved && !rejected;
  const body = approved
    ? `<h2 class="ok">Pagamento aprovado</h2>
       <p>Seu ebook está liberado. Clique abaixo para baixar o PDF.</p>
       <a class="button" href="/download/${encodeURIComponent(downloadToken)}">Baixar ebook agora</a>`
    : rejected
      ? `<h2>Pagamento não aprovado</h2>
         <p>O Mercado Pago informou que este pagamento não foi concluído. Você pode voltar e gerar uma nova compra.</p>
         <a class="button secondary" href="/">Voltar para a loja</a>`
      : `<h2>Estamos confirmando seu pagamento</h2>
         <p>Se você acabou de pagar, a aprovação pode levar alguns instantes. Esta página atualiza automaticamente.</p>
         <a class="button secondary" href="/pedido/${encodeURIComponent(order.orderId)}">Verificar novamente</a>
         <script>setTimeout(() => location.reload(), 6000)</script>`;

  return layout({
    title: approved ? "Download liberado" : "Confirmando pagamento",
    body: `<main class="center"><section class="panel status">
      ${body}
      <p class="small">Produto: ${escapeHtml(config.productName)} · Pedido ${escapeHtml(order.orderId.slice(0, 8))}</p>
    </section></main>`,
  });
}

function missingOrderPage() {
  return layout({
    title: "Pedido nao encontrado",
    status: 404,
    body: `<main class="center"><section class="panel status">
      <h2>Pedido não encontrado</h2>
      <p>Não encontrei este pedido. Volte para a loja e gere uma nova compra.</p>
      <a class="button secondary" href="/">Voltar</a>
    </section></main>`,
  });
}

module.exports = {
  checkoutErrorPage,
  homePage,
  layout,
  missingOrderPage,
  orderPage,
};
