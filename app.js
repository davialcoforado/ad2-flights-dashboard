const HISTORY_STORAGE_KEY = 'ad2-flights-history';
const MAX_HISTORY_ITEMS = 6;
const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbx42Eg3JaOltRoceQdgdqkbyvqA4LwdcmE5PJD3NR1DiqzFomWbfoG7mX_nLi3-WVFn/exec';

const INSTALLMENT_RATES = {
  1: 0.0363,
  2: 0.057,
  3: 0.0645,
  4: 0.074,
  5: 0.086,
  6: 0.099,
  7: 0.111,
  8: 0.123,
  9: 0.133,
  10: 0.142,
  11: 0.151,
  12: 0.163
};

function formatBRL(value) {
  if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatPercent(value) {
  if (isNaN(value) || !isFinite(value)) return '0,00%';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '%';
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}

function parseNumber(value) {
  const parsed = parseFloat(value || '0');
  return isNaN(parsed) ? 0 : parsed;
}

function getCompanyRows() {
  return Array.from(document.querySelectorAll('.company-row'));
}

function buildCompanyRow(defaults) {
  const template = document.getElementById('companyRowTemplate');
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector('.company-row');

  if (defaults) {
    row.querySelector('select[name="cia[]"]').value = defaults.cia || 'AZUL';
    row.querySelector('input[name="milhas[]"]').value = defaults.milhas || 0;
    row.querySelector('input[name="milheiro[]"]').value = defaults.milheiro || 0;
    row.querySelector('input[name="taxas[]"]').value = defaults.taxas || 0;
  }

  return row;
}

function renumberCompanyRows() {
  const rows = getCompanyRows();
  rows.forEach(function (row, index) {
    row.querySelector('.company-index').textContent = index + 1;
    row.querySelector('.remove-company').hidden = rows.length === 1;
  });
}

function getFormValues() {
  const companies = getCompanyRows().map(function (row) {
    return {
      cia: row.querySelector('select[name="cia[]"]').value,
      milhas: parseNumber(row.querySelector('input[name="milhas[]"]').value),
      milheiro: parseNumber(row.querySelector('input[name="milheiro[]"]').value),
      taxas: parseNumber(row.querySelector('input[name="taxas[]"]').value)
    };
  });

  return {
    cliente: document.getElementById('cliente').value.trim(),
    parcelamentoSemJuros: document.getElementById('parcelamentoSemJuros').value,
    bagagem: document.getElementById('bagagem').value,
    origem: document.getElementById('origem').value.trim().toUpperCase(),
    destino: document.getElementById('destino').value.trim().toUpperCase(),
    ida: document.getElementById('ida').value,
    volta: document.getElementById('volta').value,
    valorPaganteRef: parseNumber(document.getElementById('valorPaganteRef').value),
    comissao: parseNumber(document.getElementById('comissao').value),
    companies: companies
  };
}

function computeQuote(values) {
  const companies = values.companies.map(function (company) {
    const custoMilhas = (Math.max(0, company.milhas) / 1000) * Math.max(0, company.milheiro);
    const custoTotal = custoMilhas + Math.max(0, company.taxas);

    return {
      cia: company.cia,
      milhas: Math.max(0, company.milhas),
      milheiro: Math.max(0, company.milheiro),
      taxas: Math.max(0, company.taxas),
      custoMilhas: custoMilhas,
      custoTotal: custoTotal
    };
  });

  const custoTotal = companies.reduce(function (sum, company) {
    return sum + company.custoTotal;
  }, 0);

  const margemMinima = custoTotal * (1 + Math.max(0, values.comissao) / 100);
  const ancoraReferencia = values.valorPaganteRef > 0 ? values.valorPaganteRef * 0.9 : 0;
  const precoPix = Math.max(custoTotal > 0 ? custoTotal * 1.12 : 0, margemMinima, ancoraReferencia);

  const lucro = Math.max(0, precoPix - custoTotal);
  const lucroPercentual = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
  const economia = values.valorPaganteRef > 0 ? Math.max(0, values.valorPaganteRef - precoPix) : 0;
  const economiaPercentual =
    values.valorPaganteRef > 0 ? (economia / values.valorPaganteRef) * 100 : 0;
  const milhasTotais = companies.reduce(function (sum, company) {
    return sum + company.milhas;
  }, 0);

  let alertLevel = 'neutral';
  let alertLabel = 'Emissao neutra';
  let alertText = 'Ainda sem referencia suficiente para classificar a emissao.';

  if (custoTotal > 0 && lucroPercentual >= 18 && economia > 0) {
    alertLevel = 'good';
    alertLabel = 'Emissao boa';
    alertText = 'Margem saudavel e oferta competitiva frente ao pagante.';
  } else if (custoTotal > 0 && lucroPercentual >= 10) {
    alertLevel = 'tight';
    alertLabel = 'Emissao apertada';
    alertText = 'A operacao fecha, mas vale revisar taxas, milheiro ou referencia.';
  } else if (custoTotal > 0) {
    alertLevel = 'bad';
    alertLabel = 'Nao recomendada';
    alertText = 'Margem baixa ou inexistente. Melhor renegociar antes de ofertar.';
  }

  return {
    companies: companies,
    custoTotal: custoTotal,
    precoPix: precoPix,
    lucro: lucro,
    lucroPercentual: lucroPercentual,
    economia: economia,
    economiaPercentual: economiaPercentual,
    milhasTotais: milhasTotais,
    alertLevel: alertLevel,
    alertLabel: alertLabel,
    alertText: alertText
  };
}

function buildInstallments(totalPix, semJurosLimit) {
  const limit = semJurosLimit === 'pix' ? 0 : parseInt(semJurosLimit, 10);
  const installments = [];

  for (let i = 1; i <= 12; i += 1) {
    const rate = i <= limit ? 0 : INSTALLMENT_RATES[i] || 0;
    const totalWithRate = totalPix * (1 + rate);
    installments.push({
      times: i,
      perInstallment: i > 0 ? totalWithRate / i : 0,
      suffix: i <= limit ? 's/ juros' : 'c/ juros'
    });
  }

  return installments;
}

function buildOfferText(values, computed, installments) {
  const routeBase =
    values.origem && values.destino ? values.origem + ' x ' + values.destino : 'Trecho sob consulta';
  const routeDate = values.volta
    ? 'Ida ' + formatDate(values.ida) + ' | Volta ' + formatDate(values.volta)
    : values.ida
      ? 'Ida ' + formatDate(values.ida)
      : 'Datas a confirmar';
  const companiesText = Array.from(
    new Set(
      computed.companies.map(function (company) {
        return company.cia;
      })
    )
  ).join(', ');
  const featuredInstallment = installments[5];

  return (
    'AD2 Passagens Aereas\n\n' +
    'Cliente: ' + (values.cliente || 'Nao informado') + '\n' +
    'Trecho: ' + routeBase + '\n' +
    'Datas: ' + routeDate + '\n' +
    'Companhias: ' + (companiesText || 'A definir') + '\n' +
    'Bagagem: ' + values.bagagem + '\n\n' +
    'Total no Pix: ' + formatBRL(computed.precoPix) + '\n' +
    'Parcelamento destaque: 6x de ' +
    formatBRL(featuredInstallment.perInstallment) +
    ' (' +
    featuredInstallment.suffix +
    ')\n' +
    'Economia vs pagante: ' +
    (computed.economia > 0
      ? formatBRL(computed.economia) + ' (' + formatPercent(computed.economiaPercentual) + ')'
      : 'sem economia calculada') +
    '\n\n' +
    'Incluso:\n' +
    '- Taxas inclusas\n' +
    '- Remarcacao c/ custo\n' +
    '- Auxilio no check-in\n' +
    '- ' +
    values.bagagem +
    '\n' +
    '- Assistencia Juridica\n' +
    '- Sem reembolso'
  );
}

function buildHistoryEntry(payload) {
  return {
    id: payload.id || '',
    cliente: payload.cliente,
    route: payload.origem + ' - ' + payload.destino,
    precoPix: payload.precoPix,
    savedAt: payload.savedAt || new Date().toLocaleString('pt-BR')
  };
}

function buildPayload(values, computed, installments, offerText) {
  return {
    savedAt: new Date().toLocaleString('pt-BR'),
    cliente: values.cliente,
    origem: values.origem,
    destino: values.destino,
    ida: values.ida,
    volta: values.volta,
    bagagem: values.bagagem,
    parcelamentoSemJuros: values.parcelamentoSemJuros,
    valorPaganteRef: values.valorPaganteRef,
    comissao: values.comissao,
    companies: computed.companies,
    milhasTotais: computed.milhasTotais,
    custoTotal: computed.custoTotal,
    precoPix: computed.precoPix,
    lucro: computed.lucro,
    lucroPercentual: computed.lucroPercentual,
    economia: computed.economia,
    economiaPercentual: computed.economiaPercentual,
    installments: installments,
    offerText: offerText
  };
}

function updateInstallmentsUI(installments) {
  return installments;
}

function updateIncludedList(values) {
  const list = document.getElementById('includedList');
  const items = [
    'Taxas inclusas',
    'Remarcacao c/ custo',
    'Auxilio no check-in',
    '01 ' + values.bagagem.toLowerCase() + ' por passageiro',
    'Assistencia Juridica',
    'Sem reembolso'
  ];

  list.innerHTML = '';
  items.forEach(function (itemText) {
    const item = document.createElement('li');
    item.textContent = itemText;
    list.appendChild(item);
  });
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  const count = document.getElementById('historyCount');

  count.textContent = String(history.length);
  list.innerHTML = '';

  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Nenhuma cotacao salva ainda.';
    list.appendChild(empty);
    return;
  }

  history.forEach(function (entry) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML =
      '<strong>' +
      entry.cliente +
      '</strong><span>' +
      entry.route +
      '</span><span>' +
      formatBRL(entry.precoPix) +
      ' | ' +
      entry.savedAt +
      '</span>';
    list.appendChild(item);
  });
}

function updateUI() {
  const values = getFormValues();
  const computed = computeQuote(values);
  const installments = buildInstallments(computed.precoPix, values.parcelamentoSemJuros);
  const routeText =
    values.origem && values.destino ? values.origem + ' - ' + values.destino : 'Origem - Destino';
  const dateText = values.volta
    ? 'Ida ' + formatDate(values.ida) + ' | Volta ' + formatDate(values.volta)
    : values.ida
      ? 'Ida ' + formatDate(values.ida)
      : 'Datas a confirmar';
  const airlineText = computed.companies.length
    ? Array.from(
        new Set(
          computed.companies.map(function (company) {
            return company.cia;
          })
        )
      ).join(', ')
    : 'Companhia aerea a definir';
  const statusCard = document.querySelector('.status-card');

  document.getElementById('metricCusto').textContent = formatBRL(computed.custoTotal);
  document.getElementById('metricLucro').textContent =
    formatBRL(computed.lucro) + ' (' + formatPercent(computed.lucroPercentual) + ')';
  document.getElementById('metricPrecoFinal').textContent = formatBRL(computed.precoPix);
  document.getElementById('metricEconomia').textContent =
    computed.economia > 0
      ? formatBRL(computed.economia) + ' (' + formatPercent(computed.economiaPercentual) + ')'
      : 'R$ 0,00';

  document.getElementById('marketAlertLabel').textContent = computed.alertLabel;
  document.getElementById('marketAlertText').textContent = computed.alertText;
  statusCard.dataset.level = computed.alertLevel;

  document.getElementById('summaryPix').textContent = formatBRL(computed.precoPix);
  document.getElementById('summaryRoute').textContent = routeText;
  document.getElementById('summaryDates').textContent = dateText;
  document.getElementById('summaryAirline').textContent = airlineText;

  updateInstallmentsUI(installments);
  updateIncludedList(values);

  return {
    values: values,
    computed: computed,
    installments: installments,
    offerText: buildOfferText(values, computed, installments)
  };
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveLocalHistoryEntry(entry) {
  const history = loadLocalHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
}

function setFeedback(message, tone) {
  const feedback = document.getElementById('actionFeedback');
  feedback.textContent = message;
  feedback.style.color = tone ? 'var(' + tone + ')' : 'var(--text-700)';
}

function fallbackCopyText(text) {
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'absolute';
  helper.style.left = '-9999px';
  document.body.appendChild(helper);
  helper.select();

  let copied = false;

  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }

  document.body.removeChild(helper);
  return copied;
}

function copyOfferText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function () {
      if (!fallbackCopyText(text)) {
        throw new Error('copy_failed');
      }
    });
  }

  if (!fallbackCopyText(text)) {
    return Promise.reject(new Error('copy_failed'));
  }

  return Promise.resolve();
}

function buildRemoteUrl(action) {
  const url = new URL(WEB_APP_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('limit', String(MAX_HISTORY_ITEMS));
  return url.toString();
}

function fetchRemoteHistory() {
  return fetch(buildRemoteUrl('history'))
    .then(function (response) {
      if (!response.ok) throw new Error('history_request_failed');
      return response.json();
    })
    .then(function (data) {
      return Array.isArray(data.items) ? data.items : [];
    });
}

function saveRemoteQuote(payload) {
  const body = new URLSearchParams();
  body.set('action', 'save');
  body.set('payload', JSON.stringify(payload));

  return fetch(WEB_APP_URL, {
    method: 'POST',
    body: body
  })
    .then(function (response) {
      if (!response.ok) throw new Error('save_request_failed');
      return response.json();
    })
    .then(function (data) {
      if (!data.ok) throw new Error(data.error || 'save_failed');
      return data;
    });
}

function refreshHistory() {
  if (!WEB_APP_URL) {
    renderHistory(loadLocalHistory());
    setFeedback(
      'Cole a URL do seu Apps Script em WEB_APP_URL no app.js para ativar a planilha.',
      '--text-700'
    );
    return Promise.resolve();
  }

  return fetchRemoteHistory()
    .then(function (items) {
      renderHistory(
        items.map(function (item) {
          return {
            id: item.id || '',
            cliente: item.cliente || 'Sem cliente',
            route: (item.origem || '-') + ' - ' + (item.destino || '-'),
            precoPix: parseNumber(item.precoPix),
            savedAt: item.savedAt || ''
          };
        })
      );
    })
    .catch(function () {
      renderHistory(loadLocalHistory());
      setFeedback(
        'Nao consegui ler a planilha agora. Mantive o historico local como fallback.',
        '--warning'
      );
    });
}

function handleCopyAndSave() {
  const result = updateUI();

  if (!result.values.cliente || !result.values.origem || !result.values.destino || !result.values.ida) {
    setFeedback('Preencha cliente, origem, destino e ida antes de copiar e salvar.', '--danger');
    return;
  }

  const payload = buildPayload(
    result.values,
    result.computed,
    result.installments,
    result.offerText
  );
  const localEntry = buildHistoryEntry(payload);

  if (!WEB_APP_URL) {
    saveLocalHistoryEntry(localEntry);
    renderHistory(loadLocalHistory());
    copyOfferText(result.offerText)
      .then(function () {
        setFeedback(
          'Texto copiado. Falta configurar WEB_APP_URL no app.js para salvar na planilha.',
          '--warning'
        );
      })
      .catch(function () {
        setFeedback(
          'Configure WEB_APP_URL no app.js para salvar na planilha. A copia automatica tambem falhou.',
          '--danger'
        );
      });
    return;
  }

  setFeedback('Salvando cotacao na planilha...', '--text-700');

  const savePromise = saveRemoteQuote(payload)
    .then(function (data) {
      localEntry.id = data.id || '';
      localEntry.savedAt = data.savedAt || localEntry.savedAt;
    })
    .catch(function (error) {
      saveLocalHistoryEntry(localEntry);
      renderHistory(loadLocalHistory());
      throw error;
    });

  savePromise
    .then(function () {
      return refreshHistory();
    })
    .then(function () {
      return copyOfferText(result.offerText);
    })
    .then(function () {
      setFeedback('Cotacao copiada e salva na planilha.', '--success');
    })
    .catch(function () {
      copyOfferText(result.offerText)
        .then(function () {
          setFeedback(
            'Texto copiado. O salvamento na planilha falhou, mas guardei no historico local.',
            '--warning'
          );
        })
        .catch(function () {
          setFeedback(
            'Falha ao salvar na planilha e copiar automaticamente. Mantive a cotacao no historico local.',
            '--danger'
          );
        });
    });
}

function addCompany(defaults) {
  const list = document.getElementById('companiesList');
  list.appendChild(buildCompanyRow(defaults));
  renumberCompanyRows();
  bindCompanyRowEvents();
  updateUI();
}

function bindCompanyRowEvents() {
  getCompanyRows().forEach(function (row) {
    if (row.dataset.bound === 'true') return;

    row.dataset.bound = 'true';
    row.querySelectorAll('input, select').forEach(function (field) {
      field.addEventListener('input', updateUI);
      field.addEventListener('change', updateUI);
    });

    row.querySelector('.remove-company').addEventListener('click', function () {
      if (getCompanyRows().length === 1) return;
      row.remove();
      renumberCompanyRows();
      updateUI();
    });
  });
}

function bindStaticEvents() {
  document.querySelectorAll('#quoteForm input, #quoteForm select').forEach(function (field) {
    field.addEventListener('input', updateUI);
    field.addEventListener('change', updateUI);
  });

  document.getElementById('addCompanyBtn').addEventListener('click', function () {
    addCompany({
      cia: 'LATAM',
      milhas: 45000,
      milheiro: 16.2,
      taxas: 80
    });
  });

  document.getElementById('copySaveBtn').addEventListener('click', handleCopyAndSave);
  document.getElementById('historyBtn').addEventListener('click', function () {
    document.getElementById('historyPanel').classList.toggle('is-collapsed');
  });
  document.getElementById('newQuoteBtn').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  addCompany({
    cia: 'AZUL',
    milhas: 100000,
    milheiro: 15.5,
    taxas: 100
  });
  bindStaticEvents();
  refreshHistory();
  updateUI();
  document.getElementById('analysisPanel').open = false;
  setFeedback(
    WEB_APP_URL
      ? 'Apps Script configurado. Salvamento e historico da planilha ativos.'
      : 'Cole a URL do seu Apps Script em WEB_APP_URL no app.js para ativar a planilha.',
    '--text-700'
  );
});
