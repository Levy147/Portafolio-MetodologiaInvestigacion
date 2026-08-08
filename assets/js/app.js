/* =========================================================
   Portafolio Digital · Metodología de la Investigación
   ========================================================= */

/* ---------- CONFIG ----------
 * Por defecto el proyecto detecta solo tu repo desde la URL
 * de GitHub Pages (usuario.github.io/repo).
 * Si usas dominio propio o quieres forzarlo, descomenta y edita:
 * const CONFIG = { GITHUB_USER: "tu_usuario", GITHUB_REPO: "tu_repo" };
 */
const CONFIG = { GITHUB_USER: "", GITHUB_REPO: "" };

const $ = (sel) => document.querySelector(sel);

/* ---------- utilidades ---------- */
const ICONS = {
  url: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>',
  assign: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  recurso: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
};

function esc(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function jesc(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/['"]/g, "\\$&");
}

/* ---------- visor inline ---------- */
function openViewer(url, title) {
  const viewer = $("#viewer");
  $("#viewerTitle").textContent = title || "Documento";
  $("#viewerFrame").src = url;
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeViewer() {
  $("#viewer").setAttribute("aria-hidden", "true");
  $("#viewerFrame").src = "about:blank";
  document.body.style.overflow = "";
}

$("#viewerClose")?.addEventListener("click", closeViewer);
$("#viewerBackdrop")?.addEventListener("click", closeViewer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeViewer(); });

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "def";
}

function fileKind(ext) {
  if (["pdf"].includes(ext)) return "pdf";
  if (["docx", "doc"].includes(ext)) return "docx";
  if (["pptx", "ppt"].includes(ext)) return "pptx";
  if (["xlsx", "xls", "csv"].includes(ext)) return "xlsx";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "img";
  if (["txt", "md"].includes(ext)) return "txt";
  return "def";
}

/* ---------- navegacion movil ---------- */
const nav = $("#nav");
const navToggle = $("#navToggle");
navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

/* ---------- reveal on scroll ---------- */
const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

/* =========================================================
   1. CURSO  → render desde contenido_curso/contenido.json
   ========================================================= */
async function loadCurso() {
  const grid = $("#cursoGrid");
  try {
    const res = await fetch("contenido_curso/contenido.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    $("#statSecciones").textContent = data.secciones.length;
    const total = data.secciones.reduce((n, s) => n + s.recursos.length, 0);
    $("#statRecursos").textContent = total;
    $("#cursoMeta").textContent = `Curso: ${data.curso} · Actualizado el ${new Date(data.fecha).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })}.`;

    grid.innerHTML = data.secciones.map((sec) => {
      const items = sec.recursos
        .map((r) => {
          const tipo = r.tipo === "url" ? "url" : r.tipo === "assign" ? "assign" : "recurso";
          const ext = tipo === "url" ? "Enlace" : tipo === "assign" ? "Tarea" : "Recurso";
          const sub = r.fechas ? r.fechas : tipo === "url" && r.link_externo ? r.link_externo.split("/")[2]?.replace("www.", "") || "Enlace externo" : "";
          const url = r.link_externo || r.url || "#";
          const estadoBadge =
            tipo === "assign" && r.estado
              ? r.estado === "entregado"
                ? '<span class="estado entregado">Entregado</span>'
                : r.estado === "pendiente"
                  ? '<span class="estado pendiente">Pendiente</span>'
                  : `<span class="estado">${esc(r.estado)}</span>`
              : "";
          const flecha = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
          const ojo = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
          const accion = r.local
            ? `<a class="res-dl" href="#" onclick="openViewer('${jesc(r.local)}','${jesc(r.nombre)}'); return false;">Ver ${ojo}</a>`
            : r.link_externo
              ? `<a class="res-dl" href="${esc(url)}" target="_blank" rel="noopener">Abrir ${flecha}</a>`
              : "";
          return `
            <div class="res-item">
              <span class="res-icon ${tipo}">${ICONS[tipo]}</span>
              <span class="res-body">
                <span class="res-name">${esc(r.nombre)}</span>
                <span class="res-sub">${esc(sub)}</span>
              </span>
              ${estadoBadge}
              <span class="res-type ${tipo}">${ext}</span>
              ${accion}
            </div>`;
        })
        .join("");
      return `
        <article class="course-card glass">
          <div class="course-card-head">
            <h3>
              <span class="sec-icon">${ICONS.recurso}</span>
              ${esc(sec.nombre)}
            </h3>
            <span class="sec-badge">${sec.recursos.length} ${sec.recursos.length === 1 ? "recurso" : "recursos"}</span>
          </div>
          <div class="res-list">${items}</div>
        </article>`;
    }).join("");
  } catch (e) {
    grid.innerHTML = `
      <div class="course-note glass">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <p>No se pudo cargar <code>contenido_curso/contenido.json</code>. Genera el contenido con <code>python3 scripts/scrape_curso.py</code> antes de desplegar.</p>
      </div>`;
  }
}

/* =========================================================
   2. DOCUMENTOS → listado automático de archivos/
   vía GitHub API (sin keys, repos público).
   ========================================================= */
function detectRepo() {
  if (CONFIG.GITHUB_USER && CONFIG.GITHUB_REPO) return { user: CONFIG.GITHUB_USER, repo: CONFIG.GITHUB_REPO };
  const host = location.hostname;
  if (host.endsWith("github.io")) {
    const parts = location.pathname.split("/").filter(Boolean);
    return { user: host.split(".")[0], repo: parts[0] || "" };
  }
  return null;
}

async function loadDocumentos() {
  const grid = $("#docsGrid");
  const status = $("#docsStatus");

  const repo = detectRepo();
  if (!repo || !repo.repo) {
    status.innerHTML = '<span class="pulse" style="animation:none"></span> Solo disponible cuando el sitio está publicado en GitHub Pages';
    status.className = "docs-status error";
    grid.innerHTML = `
      <div class="doc-empty">
        <p>El listado automático necesita que el sitio esté publicado en GitHub Pages.</p>
        <p style="margin-top:10px">Configura tu usuario/repo en el bloque <code>CONFIG</code> de <code>assets/js/app.js</code>.</p>
      </div>`;
    return;
  }

  const cacheKey = `archivos_${repo.user}/${repo.repo}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { files, ts } = JSON.parse(cached);
      if (Date.now() - ts < 10 * 60 * 1000) {
        renderDocumentos(files);
        return;
      }
    } catch (_) { /* cache invalida */ }
  }

  status.innerHTML = '<span class="pulse"></span> Consultando la carpeta archivos/…';
  status.className = "docs-status";

  try {
    const res = await fetch(`https://api.github.com/repos/${repo.user}/${repo.repo}/contents/archivos`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) {
      status.innerHTML = '<span class="pulse" style="animation:none"></span> No encontré la carpeta archivos/ en tu repo';
      status.className = "docs-status error";
      grid.innerHTML = `
        <div class="doc-empty">
          <p>Aún no hay documentos.</p>
          <p style="margin-top:10px">Crea la carpeta <code>archivos/</code> en la raíz del repo y súbela con <code>git push</code>. Se listarán aquí automáticamente.</p>
        </div>`;
      return;
    }
    if (res.status === 403) {
      status.innerHTML = '<span class="pulse" style="animation:none"></span> Límite de consultas de GitHub API alcanzado (60/h). Recarga en unos minutos.';
      status.className = "docs-status error";
      return;
    }
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const files = Array.isArray(data) ? data : [];
    localStorage.setItem(cacheKey, JSON.stringify({ files, ts: Date.now() }));
    renderDocumentos(files);
  } catch (e) {
    status.innerHTML = '<span class="pulse" style="animation:none"></span> No se pudo conectar con la API de GitHub';
    status.className = "docs-status error";
    grid.innerHTML = `
      <div class="doc-empty">
        <p>Ocurrió un error al listar los archivos.</p>
        <p style="margin-top:10px">Verifica la conexión o inténtalo más tarde. El sitio sigue funcionando con la sección del curso.</p>
      </div>`;
  }
}

function renderDocumentos(files) {
  const grid = $("#docsGrid");
  const status = $("#docsStatus");
  const onlyFiles = files.filter((f) => f.type === "file");

  if (onlyFiles.length === 0) {
    status.innerHTML = '<span class="pulse" style="animation:none"></span> La carpeta archivos/ está vacía por ahora';
    status.className = "docs-status";
    grid.innerHTML = `
      <div class="doc-empty">
        <p>Sube tus archivos a la carpeta <code>archivos/</code> del repositorio.</p>
        <p style="margin-top:10px">Después del próximo deploy de GitHub Pages aparecerán aquí automáticamente.</p>
      </div>`;
    return;
  }

  $("#statArchivos").textContent = onlyFiles.length;
  status.innerHTML = `<span class="pulse" style="animation:none"></span> ${onlyFiles.length} documento${onlyFiles.length === 1 ? "" : "s"} encontrados en archivos/`;
  status.className = "docs-status ok";

  grid.innerHTML = onlyFiles
    .map((f) => {
      const ext = extOf(f.name);
      const kind = fileKind(ext);
      const verBtn = kind === "pdf"
        ? `<a class="doc-btn" href="#" onclick="openViewer('${jesc(f.download_url)}','${jesc(f.name)}'); return false;">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
            Ver
          </a>`
        : `<a class="doc-btn" href="${esc(f.download_url)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
            Ver
          </a>`;
      return `
        <article class="doc-card glass">
          <span class="doc-icon ${kind}">${esc(ext).toUpperCase()}</span>
          <h3 class="doc-name">${esc(f.name)}</h3>
          <p class="doc-meta">${formatSize(f.size)} · ${esc(ext.toUpperCase())}</p>
          <div class="doc-actions">
            <a class="doc-btn" href="${esc(f.download_url)}" target="_blank" rel="noopener" download>
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
              Descargar
            </a>
            ${verBtn}
          </div>
        </article>`;
    })
    .join("");
}

/* ---------- arranque ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadCurso();
  loadDocumentos();
});
