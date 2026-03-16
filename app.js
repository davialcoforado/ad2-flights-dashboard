// Formatação monetária em BRL
function formatBRL(value) {
  if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatPercent(value) {
  if (isNaN(value) || !isFinite(value)) return '0,00%';
  return (
    value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '%'
  );
}

function getFormValues() {
  const form = document.getElementById('quoteForm');
  const formData = new FormData(form);

  const values = {
    cliente: (formData.get('cliente') || '').toString().trim(),
    origem: (formData.get('origem') || '').toString().trim(),
    destino: (formData.get('destino') || '').toString().trim(),
    ida: formData.get('ida') || '',
    volta: formData.get('volta') || '',
    cia: (formData.get('cia') || '').toString().trim(),
    milhas: parseFloat(formData.get('milhas') || '0'),
    milheiro: parseFloat(formData.get('milheiro') || '0'),
    taxas: parseFloat(formData.get('taxas') || '0'),
    valorPaganteRef: parseFloat(formData.get('valorPaganteRef') || '0')
  };

  return values;
}

/**
 * custo = (milhas / 1000 * milheiro) + taxas
 * preço sugerido: ancorado na tarifa pagante, ~12% abaixo,
 * mas nunca menor que custo + 15%.
 */
function computeQuote(values) {
  const milhas = Math.max(0, values.milhas);
  const milheiro = Math.max(0, values.milheiro);
  const taxas = Math.max(0, values.taxas);
  const ref = Math.max(0, values.valorPaganteRef);

  const custoMilhas = (milhas / 1000) * milheiro;
  const custo = custoMilhas + taxas;

  let precoBaseDesconto = ref > 0 ? ref * 0.88 : custo * 1.2;
  let precoMinimoMargem = custo * 1.15;

  let precoSugerido = Math.max(precoBaseDesconto, precoMinimoMargem);

  const lucroReais = Math.max(0, precoSugerido - custo);
  const lucroPercentual = custo > 0 ? (lucroReais / custo) * 100 : 0;

  const descontoVsRef = ref > 0 ? ref - precoSugerido : 0;
  const descontoPercentual = ref > 0 ? ((ref - precoSugerido) / ref) * 100 : 0;

  return {
    custo,
    precoSugerido,
    lucroReais,
    lucroPercentual,
    descontoVsRef,
    descontoPercentual
  };
}

function buildOfferText(values, computed) {
  const ida = values.ida
    ? new Date(values.ida + 'T00:00:00').toLocaleDateString('pt-BR')
    : '';
  const volta = values.volta
    ? new Date(values.volta + 'T00:00:00').toLocaleDateString('pt-BR')
    : '';
  const trechoData = volta
    ? `${values.origem} ✈ ${values.destino} — Ida: ${ida} | Volta: ${volta}`
    : `${values.origem} ✈ ${values.destino} — Ida: ${ida}`;

  const descontoTexto =
    computed.descontoVsRef > 0
      ? `\n💸 Desconto estimado vs. tarifa pagante: ${formatBRL(
          computed.descontoVsRef
        )} (${formatPercent(computed.descontoPercentual)} mais barato).`
      : '';

  const clienteLinha = values.cliente ? `Olá, ${values.cliente}!` : 'Olá!';

  return (
    `${clienteLinha}\n\n` +
    `Encontrei uma excelente opção de emissão com a *AD2 Flights*:\n\n` +
    `✈ *Trecho*: ${trechoData}\n` +
    `🏷 *Companhia aérea*: ${values.cia}\n` +
    `🎯 *Preço final ao passageiro*: ${formatBRL(
      computed.precoSugerido
    )}\n\n` +
    `Detalhes da emissão:\n` +
    `• Emissão em milhas: ${values.milhas.toLocaleString('pt-BR')} milhas\n` +
    `• Valor do milheiro considerado: ${formatBRL(values.milheiro)}\n` +
    `• Taxas de embarque: ${formatBRL(values.taxas)}\n` +
    `• Tarifa pagante de referência: ${
      values.valorPaganteRef ? formatBRL(values.valorPaganteRef) : 'não informado'
    }\n` +
    `• Custo estimado da emissão: ${formatBRL(computed.custo)}\n` +
    `• Lucro estimado na operação: ${formatBRL(
      computed.lucroReais
    )} (${formatPercent(computed.lucroPercentual)} sobre o custo)\n` +
    `${descontoTexto}\n\n` +
    `Qualquer dúvida, fico à disposição para ajustar datas, horários ou cia aérea.`
  );
}

function updateUI() {
  const values = getFormValues();
  const computed = computeQuote(values);

  document.getElementById('metricCusto').textContent = formatBRL(computed.custo);
  document.getElementById('metricCustoDetalhe').textContent =
    '(' +
    formatBRL((values.milhas / 1000) * values.milheiro) +
    ' em milhas + ' +
    formatBRL(values.taxas) +
    ' de taxas)';

  document.getElementById('metricPrecoSugerido').textContent = formatBRL(
    computed.precoSugerido
  );

  document.getElementById('metricPrecoAnchoring').textContent =
    values.valorPaganteRef > 0
      ? `Ancorado na tarifa pagante de ${formatBRL(
          values.valorPaganteRef
        )}, com margem saudável.`
      : 'Informe a tarifa pagante de referência para uma ancoragem mais precisa.';

  document.getElementById('metricLucroReais').textContent = formatBRL(
    computed.lucroReais
  );
  document.getElementById('metricLucroPercentual').textContent =
    formatPercent(computed.lucroPercentual) + ' sobre o custo';

  document.getElementById('metricDescontoRef').textContent = formatBRL(
    computed.descontoVsRef
  );
  document.getElementById('metricDescontoPercentual').textContent =
    computed.descontoVsRef > 0
      ? `${formatPercent(
          computed.descontoPercentual
        )} mais barato que a tarifa pagante.`
      : 'Sem desconto frente à tarifa pagante (ou não informada).';

  const offerText = buildOfferText(values, computed);
  document.getElementById('offerPreview').value = offerText;

  return { values, computed, offerText };
}

function handleFakeSave() {
  const { values } = updateUI();
  const status = document.getElementById('calcStatus');

  if (!values.cliente || !values.origem || !values.destino || !values.ida) {
    status.textContent = 'Preencha pelo menos cliente, origem, destino e ida.';
    status.style.color = '#ff4d6a';
    return;
  }

  status.textContent =
    'Cotação calculada localmente. (Versão estática: não salva em planilha ainda.)';
  status.style.color = '#00e0c7';

  setTimeout(() => {
    status.style.color = 'var(--ad2-silver)';
  }, 3500);
}

function handleCopy() {
  const textArea = document.getElementById('offerPreview');
  const feedback = document.getElementById('copyFeedback');
  const text = textArea.value || '';

  if (!text.trim()) {
    feedback.textContent = 'Nada para copiar ainda. Preencha os dados primeiro.';
    feedback.style.color = '#ffcc00';
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(function () {
        feedback.textContent = 'Texto copiado! Cole no WhatsApp e envie ao cliente.';
        feedback.style.color = '#00e0c7';
        setTimeout(function () {
          feedback.textContent = '';
        }, 3500);
      })
      .catch(function () {
        fallbackCopy(text, feedback);
      });
  } else {
    fallbackCopy(text, feedback);
  }
}

function fallbackCopy(text, feedbackEl) {
  const dummy = document.createElement('textarea');
  dummy.value = text;
  dummy.setAttribute('readonly', '');
  dummy.style.position = 'absolute';
  dummy.style.left = '-9999px';
  document.body.appendChild(dummy);
  dummy.select();
  try {
    document.execCommand('copy');
    feedbackEl.textContent = 'Texto copiado! Cole no WhatsApp e envie ao cliente.';
    feedbackEl.style.color = '#00e0c7';
  } catch (e) {
    feedbackEl.textContent =
      'Não foi possível copiar automaticamente. Selecione e copie manualmente.';
    feedbackEl.style.color = '#ff4d6a';
  }
  document.body.removeChild(dummy);

  setTimeout(function () {
    feedbackEl.textContent = '';
  }, 3500);
}

document.addEventListener('DOMContentLoaded', function () {
  const inputs = document.querySelectorAll(
    '#quoteForm input[type="text"], #quoteForm input[type="number"], #quoteForm input[type="date"]'
  );
  inputs.forEach(function (input) {
    input.addEventListener('input', updateUI);
    input.addEventListener('change', updateUI);
  });

  document.getElementById('fakeSaveBtn').addEventListener('click', handleFakeSave);
  document.getElementById('copyBtn').addEventListener('click', handleCopy);

  updateUI();
});

