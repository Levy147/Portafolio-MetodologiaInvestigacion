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

    $("#cursoMeta").textContent = `Curso: ${data.curso}.`;

    grid.innerHTML = data.secciones.map((sec) => {
      const items = sec.recursos
        .map((r) => {
          const tipo = r.tipo === "url" ? "url" : r.tipo === "assign" ? "assign" : "recurso";
          const ext = tipo === "url" ? "Enlace" : tipo === "assign" ? "Tarea" : "Recurso";
          const sub = tipo === "url" && r.link_externo ? r.link_externo.split("/")[2]?.replace("www.", "") || "Enlace externo" : "";
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

/* ---------- arranque ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadCurso();
});
