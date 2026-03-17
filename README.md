# AD2 Flights Dashboard

Dashboard interno de cotacao com GitHub Pages no front e Supabase no historico remoto.

## Configuracao rapida

1. Crie um projeto no Supabase.
2. No SQL Editor, rode o conteudo de [supabase.sql](/Users/analuisabarros/Documents/post/ad2-flights-dashboard/supabase.sql).
3. Em `Project Settings > API`, copie:
   - `Project URL`
   - `anon public key`
4. Abra [app.js](/Users/analuisabarros/Documents/post/ad2-flights-dashboard/app.js).
5. Preencha:

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY';
const SUPABASE_TABLE = 'quotes';
```

## Como o projeto se comporta

- O botao gera a arte da cotacao e tenta copiar a imagem.
- O historico remoto usa Supabase via REST.
- Se o Supabase nao estiver configurado ou falhar, o projeto segura um fallback local em `localStorage`.

## Estrutura de dados

A tabela `quotes` guarda:

- cliente
- bagagem
- parcelamento
- custos
- preco final
- lucro
- economia
- companhias
- parcelamento detalhado
- texto da oferta

## Publicacao

Como o front fica no GitHub Pages, basta subir as alteracoes:

```bash
cd /Users/analuisabarros/Documents/post/ad2-flights-dashboard
git add .
git commit -m "Configura Supabase"
git push origin main
```
