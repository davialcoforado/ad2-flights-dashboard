# AD2 Flights Dashboard

Dashboard interno de cotacao com Google Sheets + Apps Script como fluxo principal.

## Fluxo recomendado

1. Crie uma planilha no Google Sheets.
2. Abra `Extensoes > Apps Script`.
3. Cole o conteudo de [Code.gs](/Users/analuisabarros/Documents/post/ad2-flights-dashboard/apps-script/Code.gs) ou use `clasp push` a partir deste projeto.
4. Publique em `Implantar > Nova implantacao > Aplicativo da web`.
5. Copie a URL final do Web App.
6. Abra [app.js](/Users/analuisabarros/Documents/post/ad2-flights-dashboard/app.js).
7. Preencha a constante `WEB_APP_URL`.

Exemplo:

```js
const WEB_APP_URL = 'https://script.google.com/macros/s/SEU_ID/exec';
```

## Como o projeto se comporta

- O caminho principal e salvar/ler da planilha.
- Se `WEB_APP_URL` ainda estiver vazio, o projeto avisa isso na interface.
- Em falha temporaria da planilha, ele ainda segura um fallback local para nao perder a cotacao.

## Estrutura da planilha

A aba `Cotacoes` sera criada automaticamente com colunas para cliente, rota, custos, lucro, parcelamento e texto final da oferta.

## Usando clasp

O projeto ja tem [`.clasp.json`](/Users/analuisabarros/Documents/post/ad2-flights-dashboard/.clasp.json) apontando para `apps-script`.

Com o binario local instalado no workspace, o fluxo fica:

```bash
cd /Users/analuisabarros/Documents/post/ad2-flights-dashboard
../.clasp-tools/node_modules/.bin/clasp status
../.clasp-tools/node_modules/.bin/clasp push
../.clasp-tools/node_modules/.bin/clasp open
```
