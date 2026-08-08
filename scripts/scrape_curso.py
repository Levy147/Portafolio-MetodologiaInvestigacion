#!/usr/bin/env python3
"""
Scraper Aula Virtual FAHUSAC (Moodle) - formato "tiles".
Extrae todas las secciones del curso, sus recursos y descarga best-effort
los archivos reales (Google Drive/Docs), generando:
  - contenido_curso/contenido.json   -> estructura usada por la web
  - contenido_curso/downloads/       -> archivos descargados

Uso: python3 scripts/scrape_curso.py
"""
import os
import re
import json
import pathlib
import datetime
import subprocess
import urllib.parse

import requests
from bs4 import BeautifulSoup

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
DL_DIR = BASE_DIR / "contenido_curso" / "vistas"


def load_env(path):
    env = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def login(session, base, user, pwd):
    login_url = f"{base}/login/index.php"
    r = session.get(login_url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    tok = soup.find("input", {"name": "logintoken"})
    token = tok.get("value", "") if tok else ""
    r = session.post(
        login_url,
        data={"username": user, "password": pwd, "logintoken": token},
        timeout=30,
        allow_redirects=True,
    )
    r.raise_for_status()
    if "Invalid login" in r.text or "loginerror" in r.text.lower():
        raise RuntimeError("Login fallido: revisa credenciales en .env")
    return True


def parse_section_activities(soup):
    """Deduplica actividades por id del href."""
    seen, items = set(), []
    for a in soup.select("li.activity .activityname a, li.activity a, .activity-item a"):
        href = a.get("href", "")
        m = re.search(r"id=(\d+)", href)
        if not m:
            continue
        aid = m.group(1)
        if aid in seen:
            continue
        seen.add(aid)
        name = a.get_text(" ", strip=True)
        icon = ""
        href_mod = re.search(r"mod/([^/]+)/view\.php", href)
        if href_mod:
            icon = href_mod.group(1)
        if not icon:
            ic = a.select_one("img.activityicon")
            if ic and ic.get("src"):
                mm = re.search(r"mod/([^/]+)/", ic["src"])
                if mm:
                    icon = mm.group(1)
        items.append({"id": aid, "tipo": icon or "recurso", "nombre": name, "url": href})
    return items


def get_url_details(session, res):
    """Para mod/url: extrae el link externo y la descripcion."""
    r = session.get(res["url"], timeout=30)
    if r.status_code != 200:
        return res
    soup = BeautifulSoup(r.text, "html.parser")
    main = soup.select_one("#region-main") or soup
    for a in main.select("a[href^='http']"):
        h = a.get("href", "")
        if "usac.edu.gt" in h or "moodle" in h.lower():
            continue
        res["link_externo"] = h
        break
    desc = soup.select_one(".activity-description, .no-overflow, .text_to_html, .generalbox")
    if desc:
        res["descripcion"] = desc.get_text(" ", strip=True)[:500]
    return res


def get_assign_details(session, res):
    """Para mod/assign: extrae descripcion, fechas, estado de entrega y adjuntos."""
    r = session.get(res["url"], timeout=30)
    if r.status_code != 200:
        return res
    soup = BeautifulSoup(r.text, "html.parser")
    desc = soup.select_one(".no-overflow, .activity-description, .intro, .generalbox")
    if desc:
        res["descripcion"] = desc.get_text(" ", strip=True)[:500]
    dates = soup.select_one(".description-inner")
    if dates:
        res["fechas"] = dates.get_text(" ", strip=True)[:200]
    estado = soup.select_one(".submissionstatustable")
    if estado:
        txt = estado.get_text(" ", strip=True)
        if "Todavía no" in txt or "no se han realizado" in txt:
            res["estado"] = "pendiente"
        elif "Enviado" in txt:
            res["estado"] = "entregado"
        else:
            res["estado"] = txt[:80]
    # adjuntos pluginfile (separar archivos de entrega del estudiante)
    main = soup.select_one("#region-main") or soup
    files, entregas = [], []
    for a in main.select("a[href*='pluginfile.php']"):
        fhref = a.get("href", "")
        if not fhref or fhref in files:
            continue
        files.append(fhref)
        if "assignsubmission_file/submission_files" in fhref:
            entregas.append(fhref)
    res["adjuntos"] = files
    res["entregas"] = entregas
    return res


def download_google_drive(session, url, fname):
    m = re.search(r"/file/d/([^/]+)/", url)
    if not m:
        return False
    fid = m.group(1)
    dl = f"https://drive.google.com/uc?export=download&id={fid}"
    try:
        r = session.get(dl, timeout=60, allow_redirects=True, stream=True)
        if r.status_code != 200:
            return False
        # pagina de confirmacion de archivos grandes
        if "confirm" in r.url and "uuid" in r.text:
            soup = BeautifulSoup(r.text, "html.parser")
            form = soup.select_one("form")
            if form:
                action = form.get("action", "")
                data = {}
                for inp in form.select("input[name]"):
                    data[inp["name"]] = inp.get("value", "")
                r = session.post(action if action.startswith("http") else f"https://drive.google.com{action}", data=data, timeout=60, stream=True)
        ctype = r.headers.get("Content-Type", "")
        if "html" in ctype and r.url and "uc?" in r.url and "id=" not in r.url:
            return False
        with open(DL_DIR / fname, "wb") as fh:
            for chunk in r.iter_content(chunk_size=65536):
                fh.write(chunk)
        size = (DL_DIR / fname).stat().st_size
        return size > 1000
    except Exception:
        return False


def download_google_doc(session, url, fname):
    m = re.search(r"/document/d/([^/]+)/", url)
    if not m:
        return False
    did = m.group(1)
    dl = f"https://docs.google.com/document/d/{did}/export?format=docx"
    try:
        r = session.get(dl, timeout=60, stream=True)
        if r.status_code != 200:
            return False
        with open(DL_DIR / fname, "wb") as fh:
            for chunk in r.iter_content(chunk_size=65536):
                fh.write(chunk)
        return (DL_DIR / fname).stat().st_size > 1000
    except Exception:
        return False


def docx_to_pdf(docx_path):
    """Convierte docx -> pdf (best effort). Devuelve el path del pdf o None."""
    try:
        subprocess.run(
            ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", str(docx_path.parent), str(docx_path)],
            capture_output=True, timeout=120)
        pdf = docx_path.with_suffix(".pdf")
        return str(pdf) if pdf.exists() else None
    except Exception:
        return None


def try_download_external(session, res):
    url = res.get("link_externo", "")
    if not url:
        return
    safe = re.sub(r'[^\w]+', '_', res["nombre"]).strip("_")[:80] or "recurso"
    if "drive.google.com/file" in url:
        if download_google_drive(session, url, f"{safe}.pdf"):
            res["descargado"] = f"{safe}.pdf"
    elif "docs.google.com/document" in url:
        if download_google_doc(session, url, f"{safe}.docx"):
            res["descargado"] = f"{safe}.docx"
            pdf = docx_to_pdf(DL_DIR / f"{safe}.docx")
            if pdf:
                res["local"] = f"contenido_curso/vistas/{pathlib.Path(pdf).name}"
    else:
        res["link_externo"] = url  # queda como enlace
    if res.get("descargado") and not res.get("local"):
        res["local"] = f"contenido_curso/vistas/{res['descargado']}"


def _filename_from_response(rr, i):
    cd = rr.headers.get("Content-Disposition", "")
    m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)', cd)
    if m:
        return urllib.parse.unquote(m.group(1)).strip('"')
    m2 = re.search(r"/([^/]+)$", rr.url)
    return urllib.parse.unquote(m2.group(1)) if m2 else f"adjunto_{i}"


def download_attachments(session, res):
    """Descarga adjuntos de la tarea. Los archivos de ENTREGA del estudiante
    se nombran con el nombre del recurso + '_ENTREGA'."""
    dl = []
    entregas = res.get("entregas", []) or []
    for i, fhref in enumerate(res.get("adjuntos", [])):
        try:
            rr = session.get(fhref, timeout=60, allow_redirects=True)
            if rr.status_code != 200:
                continue
            fname = _filename_from_response(rr, i)
            if fname in dl:
                continue
            if fhref in entregas:
                base = re.sub(r'[^\w]+', '_', res["nombre"]).strip("_")[:80] or "entrega"
                ext = pathlib.Path(fname).suffix
                fname = f"{base}_ENTREGA{ext}"
            fname = re.sub(r'[^\w.\-]+', '_', fname)
            with open(DL_DIR / fname, "wb") as fh:
                fh.write(rr.content)
            dl.append(fname)
        except Exception:
            continue
    if dl:
        res["descargado"] = ";".join(dl)
        res["local"] = ";".join(f"contenido_curso/vistas/{f}" for f in dl)


def main():
    env = load_env(BASE_DIR / ".env")
    base = env["MOODLE_URL"].rstrip("/")
    cid = env["MOODLE_COURSE_ID"]
    user, pwd = env["MOODLE_USER"], env["MOODLE_PASS"]

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

    print("[*] Login...")
    login(session, base, user, pwd)
    print("[*] Login OK")

    DL_DIR.mkdir(exist_ok=True)
    course_url = f"{base}/course/view.php?id={cid}"
    r = session.get(course_url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    h1 = soup.find("h1")
    course_title = h1.get_text(strip=True) if h1 else f"Curso {cid}"

    sections = []
    total_files = 0

    # Seccion 0 (general) + tiles 1..4
    for secnum in range(0, 5):
        url = course_url if secnum == 0 else f"{course_url}&section={secnum}"
        rr = session.get(url, timeout=30)
        if rr.status_code != 200:
            continue
        ssoup = BeautifulSoup(rr.text, "html.parser")
        secel = ssoup.select_one(".course-section, li.section, .section, .current")
        name = ""
        ne = (secel.select_one(".sectiontitle h2, .sectionname, h3 a") if secel else None) \
            or ssoup.select_one(".sectiontitle h2, .sectionname")
        if ne:
            name = ne.get_text(" ", strip=True)
        if not name:
            name = "General" if secnum == 0 else f"Sección {secnum}"

        items = parse_section_activities(ssoup)
        if not items and secnum != 0:
            continue  # tiles vacios

        for res in items:
            if res["tipo"] == "url":
                res = get_url_details(session, res)
                try_download_external(session, res)
            elif res["tipo"] == "assign":
                res = get_assign_details(session, res)
                download_attachments(session, res)
            if res.get("descargado"):
                total_files += 1
            print(f"  [{'v' if res.get('descargado') else ' '}] {res['nombre'][:55]}")

        sections.append({
            "numero": secnum,
            "nombre": name,
            "recursos": items,
        })

    data = {
        "curso": course_title,
        "id": cid,
        "url": course_url,
        "fecha": datetime.datetime.now().isoformat(),
        "secciones": sections,
        "archivos_descargados": total_files,
    }
    (BASE_DIR / "contenido_curso" / "contenido.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(len(s["recursos"]) for s in sections)
    print(f"\n[OK] Curso: {course_title}")
    print(f"[OK] {len(sections)} secciones, {total} recursos, {total_files} archivos descargados")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
