# Resgate da Princesa

Aplicação **Angular 14** — jogo e rotas (`/`, `/xulia`).

## Requisitos

- **Node.js** 16+ (recomendado **18 LTS** para alinhar com o CI e com o Angular 14)
- **npm** 8+

## Desenvolvimento

```bash
npm install
npm start
```

Abre em `http://localhost:4200/`.

## Build de produção

```bash
npm run build:prod
```

Saída em **`dist/jj/`** (HTML, JS, CSS e assets com hash).

### GitHub Pages (`…/castelo/`)

Para o site em **`https://lisboa07.github.io/castelo/`**, o `base href` tem de ser o **caminho do site**, não o URL do repositório:

| Errado | Certo |
|--------|--------|
| `--base-href https://github.com/Lisboa07/castelo.git` | `--base-href /castelo/` |

Comandos:

```bash
npm run build:ghpages
```

Publicar na branch `gh-pages` (inclui `angular-cli-ghpages` no projeto):

```bash
npm run deploy:ghpages
```

Se o `git remote origin` já apontar para `castelo`, podes fazer só `npm run build:ghpages` e depois `npx angular-cli-ghpages --dir=dist/jj` (sem `--repo`).

## Publicar online

A app é uma **SPA** (Single Page Application). O servidor precisa de **fallback**: qualquer URL deve devolver `index.html` para o Angular Router funcionar (ex.: `/xulia`).

### Netlify

O repositório inclui `netlify.toml` (comando de build e pasta `dist/jj`). Conecte o repositório no painel Netlify ou use a CLI:

- **Build command:** `npm run build:prod` ou `npm ci && npm run build:prod`
- **Publish directory:** `dist/jj`

O ficheiro `src/_redirects` é copiado para a raiz do build como reforço das regras SPA.

### Vercel

- **Framework Preset:** Angular (ou “Other”)
- **Build Command:** `npm run build:prod`
- **Output Directory:** `dist/jj`

Incluído `vercel.json` com `rewrites` para SPA.

### GitHub Pages (subpasta — outro repositório)

Se o site for `https://usuario.github.io/nome-repo/`, o `base href` tem de ser **`/nome-repo/`** (com barras), nunca o link do GitHub:

```bash
npm run build:prod -- --base-href /nome-repo/
```

Publique o conteúdo de `dist/jj/` na branch `gh-pages` ou na pasta configurada nas Pages.

### Qualquer servidor estático

Sirva os ficheiros de `dist/jj/` e configure **rewrite** de todas as rotas para `index.html` (equivalente ao que fazem Netlify/Vercel).

## CI

O workflow `.github/workflows/ci.yml` executa `npm ci`, `npm run build:prod` e `npm run build:ghpages` em cada push/PR para `main` ou `master`, para validar tanto o build genérico como o de GitHub Pages (`/castelo/`).
