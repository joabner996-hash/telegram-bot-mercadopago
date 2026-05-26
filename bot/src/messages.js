function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[char]));
}

function welcome(productName, price) {
  return [
    `<b>${escapeHtml(productName)}</b>`,
    "",
    "Seu guia digital com 500 receitas organizadas por categoria, pronto para consultar direto no celular.",
    "",
    `<b>Valor:</b> R$ ${price.toFixed(2).replace(".", ",")}`,
    "",
    "Toque em <b>Comprar ebook</b> para gerar um link de pagamento seguro. Assim que o pagamento for aprovado, eu envio o PDF automaticamente aqui na conversa.",
  ].join("\n");
}

function paymentCreated(productName, checkoutUrl) {
  return [
    `Pedido criado para <b>${escapeHtml(productName)}</b>.`,
    "",
    "Finalize o pagamento pelo botão abaixo. Depois da aprovação, o PDF chega automaticamente aqui.",
    "",
    `<a href="${escapeHtml(checkoutUrl)}">Abrir pagamento</a>`,
  ].join("\n");
}

function pendingStatus(order) {
  if (!order) {
    return "Ainda nao encontrei uma compra sua por aqui. Toque em <b>Comprar ebook</b> para gerar o pagamento.";
  }
  if (order.deliveredAt) return "Seu pagamento ja foi aprovado e o ebook ja foi enviado nesta conversa.";
  if (order.paymentStatus === "approved") return "Pagamento aprovado. Estou enviando o ebook agora.";
  if (order.paymentStatus === "pending" || order.paymentStatus === "in_process") {
    return "Seu pagamento ainda esta em analise ou aguardando compensacao. Assim que aprovar, eu envio o PDF automaticamente.";
  }
  if (order.paymentStatus === "rejected") {
    return "O pagamento apareceu como recusado. Gere um novo link de pagamento para tentar novamente.";
  }
  return "Seu pedido foi criado, mas ainda nao recebi a confirmacao de pagamento.";
}

function deliveryCaption(productName) {
  return [
    `Pagamento aprovado. Aqui esta o seu <b>${escapeHtml(productName)}</b>.`,
    "",
    "Bom apetite e boas receitas!",
  ].join("\n");
}

module.exports = {
  deliveryCaption,
  escapeHtml,
  paymentCreated,
  pendingStatus,
  welcome,
};
