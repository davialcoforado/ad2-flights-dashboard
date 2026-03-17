const HISTORY_STORAGE_KEY = 'ad2-flights-history';
const SETTINGS_STORAGE_KEY = 'ad2-flights-settings';
const MAX_HISTORY_ITEMS = 6;
const SUPABASE_URL = 'https://vzupqsmahouhhrqofgyh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dXBxc21haG91aGhycW9mZ3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzU3MzQsImV4cCI6MjA4OTM1MTczNH0.BUsoJTRM3jMbxb0UOFoXe2slXhUKNwU4xUQ57Yn8pEk';
const SUPABASE_TABLE = 'quotes';

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

const DEFAULT_SETTINGS = {
  taxaMercadoPago: 0,
  taxaExtra: 0,
  companies: [
    { name: 'AZUL', milheiro: 15.5 },
    { name: 'LATAM', milheiro: 16.2 },
    { name: 'GOL', milheiro: 15 },
    { name: 'TAP', milheiro: 18 },
    { name: 'AMERICAN', milheiro: 20 }
  ]
};

let appSettings = loadSettings();

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

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      taxaMercadoPago: parseNumber(parsed.taxaMercadoPago || DEFAULT_SETTINGS.taxaMercadoPago),
      taxaExtra: parseNumber(parsed.taxaExtra || DEFAULT_SETTINGS.taxaExtra),
      companies:
        Array.isArray(parsed.companies) && parsed.companies.length
          ? parsed.companies.map(function (company) {
              return {
                name: String(company.name || '').trim().toUpperCase(),
                milheiro: parseNumber(company.milheiro)
              };
            })
          : DEFAULT_SETTINGS.companies.slice()
    };
  } catch (error) {
    return {
      taxaMercadoPago: DEFAULT_SETTINGS.taxaMercadoPago,
      taxaExtra: DEFAULT_SETTINGS.taxaExtra,
      companies: DEFAULT_SETTINGS.companies.slice()
    };
  }
}

function persistSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function getCompanyOptions() {
  return (appSettings.companies || []).filter(function (company) {
    return company.name;
  });
}

function findCompanySetting(name) {
  return getCompanyOptions().find(function (company) {
    return company.name === name;
  });
}

function populateCompanySelect(select, selectedValue) {
  const options = getCompanyOptions();
  select.innerHTML = '';

  options.forEach(function (company) {
    const option = document.createElement('option');
    option.value = company.name;
    option.textContent = company.name;
    select.appendChild(option);
  });

  if (selectedValue && options.some(function (company) { return company.name === selectedValue; })) {
    select.value = selectedValue;
  } else if (options.length) {
    select.value = options[0].name;
  }
}

function applyDefaultMilheiro(row) {
  const companyName = row.querySelector('select[name="cia[]"]').value;
  const milheiroInput = row.querySelector('input[name="milheiro[]"]');
  const companySetting = findCompanySetting(companyName);

  if (companySetting) {
    milheiroInput.value = companySetting.milheiro;
  }
}

function syncCompanyRowMode(row) {
  const ciaSelect = row.querySelector('select[name="cia[]"]');
  const modalidadeSelect = row.querySelector('select[name="modalidade[]"]');
  const pointsMoneyOption = modalidadeSelect.querySelector('option[value="pontos_dinheiro"]');
  const isAzul = ciaSelect.value === 'AZUL';
  const isPointsMoney = modalidadeSelect.value === 'pontos_dinheiro';

  pointsMoneyOption.disabled = !isAzul;

  if (!isAzul && isPointsMoney) {
    modalidadeSelect.value = 'milhas';
  }

  row.querySelectorAll('.company-extra-field').forEach(function (field) {
    field.hidden = !(isAzul && modalidadeSelect.value === 'pontos_dinheiro');
  });
}

function createSettingsCompanyRow(company) {
  const row = document.createElement('div');
  row.className = 'settings-company-row';
  row.innerHTML =
    '<label class="field">' +
    '<span>Companhia</span>' +
    '<input type="text" class="settings-company-name" value="' +
    (company.name || '') +
    '" />' +
    '</label>' +
    '<label class="field field-compact">' +
    '<span>Milheiro padrão</span>' +
    '<input type="number" class="settings-company-milheiro" min="0" step="0.01" value="' +
    (company.milheiro || 0) +
    '" />' +
    '</label>' +
    '<button class="remove-company" type="button" title="Remover companhia">x</button>';

  row.querySelector('.remove-company').addEventListener('click', function () {
    row.remove();
  });

  return row;
}

function renderSettingsCompanies() {
  const list = document.getElementById('settingsCompaniesList');
  list.innerHTML = '';
  getCompanyOptions().forEach(function (company) {
    list.appendChild(createSettingsCompanyRow(company));
  });
}

function fillSettingsForm() {
  document.getElementById('settingsMercadoPago').value = appSettings.taxaMercadoPago;
  document.getElementById('settingsTaxaExtra').value = appSettings.taxaExtra;
  renderSettingsCompanies();
}

function readSettingsForm() {
  const companies = Array.from(document.querySelectorAll('.settings-company-row'))
    .map(function (row) {
      return {
        name: row.querySelector('.settings-company-name').value.trim().toUpperCase(),
        milheiro: parseNumber(row.querySelector('.settings-company-milheiro').value)
      };
    })
    .filter(function (company) {
      return company.name;
    });

  return {
    taxaMercadoPago: parseNumber(document.getElementById('settingsMercadoPago').value),
    taxaExtra: parseNumber(document.getElementById('settingsTaxaExtra').value),
    companies: companies.length ? companies : DEFAULT_SETTINGS.companies.slice()
  };
}

function syncAllCompanyRows() {
  getCompanyRows().forEach(function (row) {
    const select = row.querySelector('select[name="cia[]"]');
    const previousValue = select.value;
    populateCompanySelect(select, previousValue);
    if (select.value !== previousValue) {
      applyDefaultMilheiro(row);
    }
    syncCompanyRowMode(row);
  });
}

function setActiveView(view) {
  const quoteView = document.getElementById('quoteView');
  const settingsView = document.getElementById('settingsView');
  const summaryCard = document.getElementById('summaryCard');
  const isSettings = view === 'settings';

  quoteView.classList.toggle('is-hidden', isSettings);
  settingsView.classList.toggle('is-hidden', !isSettings);
  summaryCard.classList.toggle('is-hidden', isSettings);

  document.getElementById('newQuoteBtn').classList.toggle('menu-item-active', !isSettings);
  document.getElementById('settingsBtn').classList.toggle('menu-item-active', isSettings);
}

function getCompanyRows() {
  return Array.from(document.querySelectorAll('.company-row'));
}

function buildCompanyRow(defaults) {
  const template = document.getElementById('companyRowTemplate');
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector('.company-row');

  if (defaults) {
    populateCompanySelect(row.querySelector('select[name="cia[]"]'), defaults.cia || 'AZUL');
    row.querySelector('select[name="modalidade[]"]').value = defaults.modalidade || 'milhas';
    row.querySelector('input[name="milhas[]"]').value = defaults.milhas || 0;
    row.querySelector('input[name="milheiro[]"]').value = defaults.milheiro || 0;
    row.querySelector('input[name="taxas[]"]').value = defaults.taxas || 0;
    row.querySelector('input[name="valorDinheiro[]"]').value = defaults.valorDinheiro || 0;
    row.querySelector('input[name="taxaResgate[]"]').value = defaults.taxaResgate || 0;
    row.querySelector('input[name="cartaoTavi[]"]').checked = Boolean(defaults.cartaoTavi);
  } else {
    populateCompanySelect(row.querySelector('select[name="cia[]"]'));
    applyDefaultMilheiro(row);
  }

  syncCompanyRowMode(row);

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
      modalidade: row.querySelector('select[name="modalidade[]"]').value,
      milhas: parseNumber(row.querySelector('input[name="milhas[]"]').value),
      milheiro: parseNumber(row.querySelector('input[name="milheiro[]"]').value),
      taxas: parseNumber(row.querySelector('input[name="taxas[]"]').value),
      valorDinheiro: parseNumber(row.querySelector('input[name="valorDinheiro[]"]').value),
      taxaResgate: parseNumber(row.querySelector('input[name="taxaResgate[]"]').value),
      cartaoTavi: row.querySelector('input[name="cartaoTavi[]"]').checked
    };
  });

  return {
    cliente: document.getElementById('cliente').value.trim(),
    parcelamentoSemJuros: document.getElementById('parcelamentoSemJuros').value,
    bagagem: document.getElementById('bagagem').value,
    origem: '',
    destino: '',
    ida: '',
    volta: '',
    valorPaganteRef: parseNumber(document.getElementById('valorPaganteRef').value),
    comissao: parseNumber(document.getElementById('comissao').value),
    taxaMercadoPago: appSettings.taxaMercadoPago,
    taxaExtra: appSettings.taxaExtra,
    companies: companies
  };
}

function computeQuote(values) {
  const companies = values.companies.map(function (company) {
    const custoMilhas = (Math.max(0, company.milhas) / 1000) * Math.max(0, company.milheiro);
    const valorDinheiroBase =
      company.modalidade === 'pontos_dinheiro' ? Math.max(0, company.valorDinheiro) : 0;
    const descontoTavi =
      company.modalidade === 'pontos_dinheiro' && company.cartaoTavi ? valorDinheiroBase * 0.1 : 0;
    const valorDinheiroLiquido = valorDinheiroBase - descontoTavi;
    const taxaResgate =
      company.modalidade === 'pontos_dinheiro' ? Math.max(0, company.taxaResgate) : 0;
    const custoTotal =
      custoMilhas + valorDinheiroLiquido + Math.max(0, company.taxas) + taxaResgate;

    return {
      cia: company.cia,
      modalidade: company.modalidade,
      milhas: Math.max(0, company.milhas),
      milheiro: Math.max(0, company.milheiro),
      taxas: Math.max(0, company.taxas),
      valorDinheiro: valorDinheiroBase,
      descontoTavi: descontoTavi,
      valorDinheiroLiquido: valorDinheiroLiquido,
      taxaResgate: taxaResgate,
      cartaoTavi: company.cartaoTavi,
      custoMilhas: custoMilhas,
      custoTotal: custoTotal
    };
  });

  const custoTotalBase = companies.reduce(function (sum, company) {
    return sum + company.custoTotal;
  }, 0);
  const custoTotal = custoTotalBase + Math.max(0, values.taxaExtra);

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
  let alertLabel = 'Emissão neutra';
  let alertText = 'Ainda sem referência suficiente para classificar a emissão.';

  if (custoTotal > 0 && lucroPercentual >= 18 && economia > 0) {
    alertLevel = 'good';
    alertLabel = 'Emissão boa';
    alertText = 'Margem saudável e oferta competitiva frente ao pagante.';
  } else if (custoTotal > 0 && lucroPercentual >= 10) {
    alertLevel = 'tight';
    alertLabel = 'Emissão apertada';
    alertText = 'A operação fecha, mas vale revisar taxas, milheiro ou referência.';
  } else if (custoTotal > 0) {
    alertLevel = 'bad';
    alertLabel = 'Não recomendada';
    alertText = 'Margem baixa ou inexistente. Melhor renegociar antes de ofertar.';
  }

  return {
    companies: companies,
    custoTotal: custoTotal,
    custoTotalBase: custoTotalBase,
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
  const mercadoPagoRate = arguments.length > 2 ? Math.max(0, arguments[2]) / 100 : 0;
  const limit = semJurosLimit === 'pix' ? 0 : parseInt(semJurosLimit, 10);
  const installments = [];

  for (let i = 1; i <= 12; i += 1) {
    const rate = i <= limit ? 0 : INSTALLMENT_RATES[i] || 0;
    const totalWithRate = totalPix * (1 + rate + mercadoPagoRate);
    installments.push({
      times: i,
      perInstallment: i > 0 ? totalWithRate / i : 0,
      suffix: i <= limit ? 's/ juros' : 'c/ juros'
    });
  }

  return installments;
}

function buildOfferText(values, computed, installments) {
  const companiesText = Array.from(
    new Set(
      computed.companies.map(function (company) {
        return company.cia;
      })
    )
  ).join(', ');
  const featuredInstallment = installments[5];

  return (
    'AD2 Flights\n\n' +
    'Cliente: ' + (values.cliente || 'Não informado') + '\n' +
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
    '- Remarcação c/ custo\n' +
    '- Auxílio no check-in\n' +
    '- ' +
    values.bagagem +
    '\n' +
    '- Assistência Jurídica\n' +
    '- Sem reembolso'
  );
}

function buildHistoryEntry(payload) {
  return {
    id: payload.id || '',
    cliente: payload.cliente,
    route: payload.origem + ' - ' + payload.destino,
    precoPix: payload.precoPix,
    savedAt: payload.savedAt || new Date().toLocaleString('pt-BR'),
    payload: payload
  };
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_TABLE);
}

function getSupabaseEndpoint(query) {
  const url = new URL('/rest/v1/' + SUPABASE_TABLE, SUPABASE_URL);

  Object.keys(query || {}).forEach(function (key) {
    url.searchParams.set(key, query[key]);
  });

  return url.toString();
}

function getSupabaseHeaders(extraHeaders) {
  return Object.assign(
    {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    extraHeaders || {}
  );
}

function toSupabaseRecord(payload) {
  return {
    saved_at: payload.savedAt,
    cliente: payload.cliente || '',
    origem: payload.origem || '',
    destino: payload.destino || '',
    ida: payload.ida || '',
    volta: payload.volta || '',
    bagagem: payload.bagagem || '',
    parcelamento_sem_juros: payload.parcelamentoSemJuros || '',
    valor_pagante_ref: Number(payload.valorPaganteRef || 0),
    comissao: Number(payload.comissao || 0),
    milhas_totais: Number(payload.milhasTotais || 0),
    custo_total: Number(payload.custoTotal || 0),
    preco_pix: Number(payload.precoPix || 0),
    lucro: Number(payload.lucro || 0),
    lucro_percentual: Number(payload.lucroPercentual || 0),
    economia: Number(payload.economia || 0),
    economia_percentual: Number(payload.economiaPercentual || 0),
    companies: payload.companies || [],
    installments: payload.installments || [],
    offer_text: payload.offerText || ''
  };
}

function fromSupabaseRow(row) {
  return {
    id: row.id || '',
    cliente: row.cliente || 'Sem cliente',
    route: (row.origem || '-') + ' - ' + (row.destino || '-'),
    precoPix: parseNumber(row.preco_pix),
    savedAt: row.saved_at || '',
    payload: {
      id: row.id || '',
      savedAt: row.saved_at || '',
      cliente: row.cliente || '',
      origem: row.origem || '',
      destino: row.destino || '',
      ida: row.ida || '',
      volta: row.volta || '',
      bagagem: row.bagagem || 'Mochila + 10kg',
      parcelamentoSemJuros: row.parcelamento_sem_juros || 'pix',
      valorPaganteRef: parseNumber(row.valor_pagante_ref),
      comissao: parseNumber(row.comissao),
      companies: Array.isArray(row.companies) ? row.companies : [],
      milhasTotais: parseNumber(row.milhas_totais),
      custoTotal: parseNumber(row.custo_total),
      precoPix: parseNumber(row.preco_pix),
      lucro: parseNumber(row.lucro),
      lucroPercentual: parseNumber(row.lucro_percentual),
      economia: parseNumber(row.economia),
      economiaPercentual: parseNumber(row.economia_percentual),
      installments: Array.isArray(row.installments) ? row.installments : [],
      offerText: row.offer_text || ''
    }
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
  const table = document.getElementById('installmentsTable');
  table.innerHTML = '';

  installments.forEach(function (installment) {
    const item = document.createElement('div');
    item.className = 'installment-item';
    item.innerHTML =
      '<span>' +
      installment.times +
      'x</span><strong>' +
      formatBRL(installment.perInstallment) +
      '</strong><small>(' +
      installment.suffix +
      ')</small>';
    table.appendChild(item);
  });
}

function updateIncludedList(values) {
  const list = document.getElementById('includedList');
  const items = [
    'Taxas inclusas',
    'Remarcação c/ custo',
    'Auxílio no check-in',
    '01 ' + values.bagagem.toLowerCase() + ' por passageiro',
    'Assistência Jurídica',
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
    empty.textContent = 'Nenhuma cotação salva ainda.';
    list.appendChild(empty);
    return;
  }

  history.forEach(function (entry) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML =
      '<div class="history-item-content"><strong>' +
      entry.cliente +
      '</strong><span>' +
      'Cotação salva' +
      '</span><span>' +
      formatBRL(entry.precoPix) +
      ' | ' +
      entry.savedAt +
      '</span></div><button class="history-delete" type="button" title="Excluir">×</button>';

    item.querySelector('.history-item-content').addEventListener('click', function () {
      if (entry.payload) {
        loadQuoteIntoForm(entry.payload);
      }
    });

    item.querySelector('.history-delete').addEventListener('click', function (event) {
      event.stopPropagation();
      deleteHistoryEntry(entry);
    });

    list.appendChild(item);
  });
}

function loadQuoteIntoForm(payload) {
  document.getElementById('cliente').value = payload.cliente || '';
  document.getElementById('parcelamentoSemJuros').value = payload.parcelamentoSemJuros || 'pix';
  document.getElementById('bagagem').value = payload.bagagem || 'Mochila + 10kg';
  document.getElementById('valorPaganteRef').value = payload.valorPaganteRef || 0;
  document.getElementById('comissao').value = payload.comissao || 18;

  const list = document.getElementById('companiesList');
  list.innerHTML = '';

  (payload.companies || []).forEach(function (company) {
    addCompany({
      cia: company.cia || 'AZUL',
      modalidade: company.modalidade || 'milhas',
      milhas: company.milhas || 0,
      milheiro: company.milheiro || 0,
      taxas: company.taxas || 0,
      valorDinheiro: company.valorDinheiro || 0,
      taxaResgate: company.taxaResgate || 0,
      cartaoTavi: Boolean(company.cartaoTavi)
    });
  });

  if (!getCompanyRows().length) {
    addCompany({
      cia: 'AZUL',
      modalidade: 'milhas',
      milhas: 100000,
      milheiro: 15.5,
      taxas: 100,
      valorDinheiro: 0,
      taxaResgate: 0,
      cartaoTavi: false
    });
  }

  setActiveView('quote');
  updateUI();
  setFeedback('Cotação carregada a partir do histórico.', '--success');
}

function removeLocalHistoryEntry(id, savedAt) {
  const filtered = loadLocalHistory().filter(function (entry) {
    if (id) return entry.id !== id;
    return entry.savedAt !== savedAt;
  });
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
}

function deleteRemoteQuote(id) {
  return fetch(getSupabaseEndpoint({ id: 'eq.' + id }), {
    method: 'DELETE',
    headers: getSupabaseHeaders()
  }).then(function (response) {
    if (!response.ok) throw new Error('delete_failed');
  });
}

function deleteHistoryEntry(entry) {
  if (!entry) return;

  if (entry.id && isSupabaseConfigured()) {
    deleteRemoteQuote(entry.id)
      .then(function () {
        removeLocalHistoryEntry(entry.id, entry.savedAt);
        return refreshHistory();
      })
      .then(function () {
        setFeedback('Cotação excluída do histórico.', '--success');
      })
      .catch(function () {
        removeLocalHistoryEntry(entry.id, entry.savedAt);
        renderHistory(loadLocalHistory());
        setFeedback('Não consegui excluir no Supabase. Removi do histórico local.', '--warning');
      });
    return;
  }

  removeLocalHistoryEntry(entry.id, entry.savedAt);
  renderHistory(loadLocalHistory());
  setFeedback('Cotação excluída do histórico local.', '--success');
}

function updateUI() {
  const values = getFormValues();
  const computed = computeQuote(values);
  const installments = buildInstallments(
    computed.precoPix,
    values.parcelamentoSemJuros,
    values.taxaMercadoPago
  );
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

function canvasToBlob(canvas) {
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('blob_failed'));
    }, 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function copyImageBlob(blob) {
  if (
    navigator.clipboard &&
    window.ClipboardItem &&
    typeof navigator.clipboard.write === 'function'
  ) {
    return navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
  }

  return Promise.reject(new Error('image_clipboard_unavailable'));
}

function copyOfferCardImage() {
  const card = document.getElementById('quoteCard');

  if (!card || typeof window.html2canvas !== 'function') {
    return Promise.reject(new Error('image_renderer_unavailable'));
  }

  const summaryCard = document.querySelector('.summary-card');
  summaryCard.classList.add('is-exporting');

  return window
    .html2canvas(card, {
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio > 1 ? 2 : 1.6,
      useCORS: true
    })
    .then(function (canvas) {
      return canvasToBlob(canvas);
    })
    .finally(function () {
      summaryCard.classList.remove('is-exporting');
    });
}

function copyOfferCardToClipboard() {
  return copyOfferCardImage().then(function (blob) {
    return copyImageBlob(blob);
  });
}

function downloadOfferCardImage() {
  return copyOfferCardImage().then(function (blob) {
    downloadBlob(blob, 'cotacao-ad2.png');
  });
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

function fetchRemoteHistory() {
  return fetch(
    getSupabaseEndpoint({
      select:
        'id,cliente,origem,destino,bagagem,parcelamento_sem_juros,valor_pagante_ref,comissao,milhas_totais,custo_total,preco_pix,lucro,lucro_percentual,economia,economia_percentual,companies,installments,offer_text,saved_at,ida,volta',
      order: 'created_at.desc',
      limit: String(MAX_HISTORY_ITEMS)
    }),
    {
      headers: getSupabaseHeaders()
    }
  )
    .then(function (response) {
      if (!response.ok) throw new Error('history_request_failed');
      return response.json();
    })
    .then(function (data) {
      return Array.isArray(data) ? data : [];
    });
}

function saveRemoteQuote(payload) {
  return fetch(getSupabaseEndpoint(), {
    method: 'POST',
    headers: getSupabaseHeaders({
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(toSupabaseRecord(payload))
  })
    .then(function (response) {
      if (!response.ok) throw new Error('save_request_failed');
      return response.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || !data.length) throw new Error('save_failed');
      return data[0];
    });
}

function persistQuote(payload, localEntry) {
  if (!isSupabaseConfigured()) {
    saveLocalHistoryEntry(localEntry);
    renderHistory(loadLocalHistory());
    return Promise.resolve({ mode: 'local_only' });
  }

  return saveRemoteQuote(payload)
    .then(function (data) {
      localEntry.id = data.id || '';
      localEntry.savedAt = data.saved_at || localEntry.savedAt;
      return refreshHistory().then(function () {
        return { mode: 'remote', data: data };
      });
    })
    .catch(function () {
      saveLocalHistoryEntry(localEntry);
      renderHistory(loadLocalHistory());
      return Promise.reject(new Error('save_failed'));
    });
}

function refreshHistory() {
  if (!isSupabaseConfigured()) {
    renderHistory(loadLocalHistory());
    setFeedback(
      'Preencha SUPABASE_URL e SUPABASE_ANON_KEY no app.js para ativar o histórico remoto.',
      '--text-700'
    );
    return Promise.resolve();
  }

  return fetchRemoteHistory()
    .then(function (items) {
      renderHistory(items.map(fromSupabaseRow));
    })
    .catch(function () {
      renderHistory(loadLocalHistory());
      setFeedback(
        'Não consegui ler o Supabase agora. Mantive o histórico local como fallback.',
        '--warning'
      );
    });
}

function handleCopyAndSave() {
  const result = updateUI();

  if (!result.values.cliente) {
    setFeedback('Preencha pelo menos o cliente antes de copiar e salvar.', '--danger');
    return;
  }

  const payload = buildPayload(
    result.values,
    result.computed,
    result.installments,
    result.offerText
  );
  const localEntry = buildHistoryEntry(payload);
  setFeedback('Copiando a arte da cotação...', '--text-700');

  copyOfferCardToClipboard()
    .then(function () {
      setFeedback('Imagem copiada. Salvando cotação...', '--text-700');
      return persistQuote(payload, localEntry)
        .then(function (resultInfo) {
          if (resultInfo.mode === 'remote') {
            setFeedback('Imagem copiada e cotação salva no Supabase.', '--success');
            return;
          }

          setFeedback(
            'Imagem copiada. Falta configurar SUPABASE_URL e SUPABASE_ANON_KEY no app.js.',
            '--warning'
          );
        })
        .catch(function () {
          setFeedback(
            'Imagem copiada, mas o salvamento no Supabase falhou. Guardei no histórico local.',
            '--warning'
          );
        });
    })
    .catch(function () {
      return copyOfferText(result.offerText)
        .then(function () {
          setFeedback('Não consegui copiar a imagem. Copiei o texto e estou salvando...', '--warning');

          return persistQuote(payload, localEntry)
            .then(function (resultInfo) {
              if (resultInfo.mode === 'remote') {
                setFeedback('Texto copiado e cotação salva no Supabase.', '--warning');
                return;
              }

              setFeedback(
                'Texto copiado. Falta configurar SUPABASE_URL e SUPABASE_ANON_KEY no app.js.',
                '--warning'
              );
            })
            .catch(function () {
              setFeedback(
                'Texto copiado, mas o salvamento no Supabase falhou. Guardei no histórico local.',
                '--warning'
              );
            });
        })
        .catch(function () {
          return persistQuote(payload, localEntry)
            .then(function (resultInfo) {
              if (resultInfo.mode === 'remote') {
                setFeedback(
                  'Não consegui copiar automaticamente, mas a cotação foi salva no Supabase.',
                  '--warning'
                );
                return;
              }

              setFeedback(
                'Não consegui copiar automaticamente. A cotação ficou salva só no histórico local.',
                '--warning'
              );
            })
            .catch(function () {
              setFeedback(
                'Falha ao copiar e ao salvar no Supabase. Mantive a cotação no histórico local.',
                '--danger'
              );
            });
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

    row.querySelector('select[name="cia[]"]').addEventListener('change', function () {
      applyDefaultMilheiro(row);
      syncCompanyRowMode(row);
      updateUI();
    });

    row.querySelector('select[name="modalidade[]"]').addEventListener('change', function () {
      syncCompanyRowMode(row);
      updateUI();
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
    setActiveView('quote');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('settingsBtn').addEventListener('click', function () {
    setActiveView('settings');
  });
  document.getElementById('addSettingsCompanyBtn').addEventListener('click', function () {
    document.getElementById('settingsCompaniesList').appendChild(
      createSettingsCompanyRow({ name: '', milheiro: 0 })
    );
  });
  document.getElementById('saveSettingsBtn').addEventListener('click', function () {
    appSettings = readSettingsForm();
    persistSettings(appSettings);
    syncAllCompanyRows();
    setActiveView('quote');
    updateUI();
    setFeedback('Configurações salvas. Os parâmetros internos foram atualizados.', '--success');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  fillSettingsForm();
  addCompany({
    cia: 'AZUL',
    modalidade: 'milhas',
    milhas: 100000,
    milheiro: 15.5,
    taxas: 100,
    valorDinheiro: 0,
    taxaResgate: 0,
    cartaoTavi: false
  });
  bindStaticEvents();
  refreshHistory();
  updateUI();
  setFeedback(
    isSupabaseConfigured()
      ? 'Supabase configurado. O botão gera a arte da cotação e tenta salvar no histórico remoto.'
      : 'Preencha SUPABASE_URL e SUPABASE_ANON_KEY no app.js para ativar o histórico remoto.',
    '--text-700'
  );
});
