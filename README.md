# Portafolio Digital · Metodología de la Investigación

Portafolio estático para la **Licenciatura en Pedagogía y Administración Educativa**
(FAHUSAC · USAC). Sitio 100% estático para **GitHub Pages**, con el contenido del
curso **"Métodos de Investigación"** extraído del Aula Virtual.

## Estructura

```
.
├── index.html                    ← página principal
├── assets/
│   ├── css/styles.css            ← estilos
│   └── js/app.js                 ← lógica (curso + documentos automáticos)
├── contenido_curso/
│   ├── contenido.json            ← contenido del curso (se genera con el scraper)
│   └── downloads/                ← archivos descargados del curso (gitignored)
├── archivos/                     ← TUS documentos (subí aquí tus archivos)
├── scripts/
│   └── scrape_curso.py           ← scraper del Aula Virtual (Moodle)
├── .env                          ← credenciales (NUNCA se sube a GitHub)
└── .gitignore
```

## ⚠️ Seguridad

- El archivo `.env` contiene tu usuario y contraseña del Aula Virtual.
  **NO lo subas a GitHub** (ya está excluido en `.gitignore`).
- No compartas tus credenciales con nadie.

## Cómo actualizar el contenido del curso

```bash
python3 scripts/scrape_curso.py
```

Descarga el contenido y regenera `contenido_curso/contenido.json`
(leé las credenciales desde `.env`). Después haz commit del JSON y push.

## Cómo agregar documentos nuevos

1. Colocá tus archivos en la carpeta `archivos/`.
2. `git add archivos/ && git commit -m "agrego documentos" && git push`.
3. El deploy de GitHub Pages regenera el sitio y la sección **Documentos**
   los lista automáticamente (vía GitHub API, sin claves).

> La lista de archivos consulta la carpeta `archivos/` del repositorio.
> Por defecto el sitio detecta tu usuario/repo solo desde la URL de
> GitHub Pages. Si usás dominio propio, configurá `CONFIG` en `assets/js/app.js`.

## Deploy en GitHub Pages

1. Creá un repositorio nuevo en GitHub (ej: `portafolio-metodologia`).
2. Subí todo el contenido de esta carpeta al repo.
3. En GitHub: **Settings → Pages** →
   - Source: **Deploy from a branch**
   - Branch: `main`, carpeta `/ (root)` → **Save**.
4. En unos minutos el sitio queda en `https://TU_USUARIO.github.io/TU_REPO/`.

### Despliegue automático (recomendado)

Configurá GitHub Actions con el flujo de Pages para que cada `git push`
re-despliegue el sitio automáticamente:
**Settings → Pages → Source: GitHub Actions** y agregá el workflow oficial
`pages/static-html` (Actions → New workflow → "Static HTML").

## Demo local

```bash
cd "portafolio de metodologia de la investigacion"
python3 -m http.server 8000
# abre http://localhost:8000
```

> Nota: el listado de la carpeta `archivos/` usa la API de GitHub y solo
> funciona cuando el sitio está publicado en GitHub Pages. En local verás
> el mensaje de aviso (comportamiento esperado).
