const SHEET_NAME = 'Cotacoes';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'health';

  if (action === 'history') {
    return jsonOutput({
      ok: true,
      items: getHistory_(Number((e.parameter && e.parameter.limit) || 6))
    });
  }

  return jsonOutput({
    ok: true,
    service: 'ad2-flights-dashboard',
    date: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'save';

    if (action !== 'save') {
      return jsonOutput({ ok: false, error: 'invalid_action' });
    }

    const rawPayload =
      (e && e.parameter && e.parameter.payload) ||
      (e && e.postData && e.postData.contents) ||
      '{}';
    const payload = JSON.parse(rawPayload);
    const saved = saveQuote_(payload);

    return jsonOutput({
      ok: true,
      id: saved.id,
      savedAt: saved.savedAt
    });
  } catch (error) {
    return jsonOutput({
      ok: false,
      error: error.message || 'unexpected_error'
    });
  }
}

function saveQuote_(payload) {
  const sheet = getOrCreateSheet_();
  const savedAt =
    payload.savedAt ||
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  const id = Utilities.getUuid();

  sheet.appendRow([
    id,
    savedAt,
    payload.cliente || '',
    payload.origem || '',
    payload.destino || '',
    payload.ida || '',
    payload.volta || '',
    payload.bagagem || '',
    payload.parcelamentoSemJuros || '',
    Number(payload.valorPaganteRef || 0),
    Number(payload.comissao || 0),
    Number(payload.milhasTotais || 0),
    Number(payload.custoTotal || 0),
    Number(payload.precoPix || 0),
    Number(payload.lucro || 0),
    Number(payload.lucroPercentual || 0),
    Number(payload.economia || 0),
    Number(payload.economiaPercentual || 0),
    JSON.stringify(payload.companies || []),
    JSON.stringify(payload.installments || []),
    payload.offerText || ''
  ]);

  return {
    id: id,
    savedAt: savedAt
  };
}

function getHistory_(limit) {
  const sheet = getOrCreateSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) return [];

  const headers = values[0];

  return values
    .slice(1)
    .reverse()
    .slice(0, limit)
    .map(function (row) {
      return rowToObject_(headers, row);
    });
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'id',
      'savedAt',
      'cliente',
      'origem',
      'destino',
      'ida',
      'volta',
      'bagagem',
      'parcelamentoSemJuros',
      'valorPaganteRef',
      'comissao',
      'milhasTotais',
      'custoTotal',
      'precoPix',
      'lucro',
      'lucroPercentual',
      'economia',
      'economiaPercentual',
      'companies',
      'installments',
      'offerText'
    ]);
  }

  return sheet;
}

function rowToObject_(headers, row) {
  return headers.reduce(function (accumulator, header, index) {
    accumulator[header] = row[index];
    return accumulator;
  }, {});
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
