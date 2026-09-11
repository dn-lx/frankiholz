from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
BASE = "/frankiholz"

ROOT_FILES = [
    "index.html",
    "404.html",
    "booking-status.html",
    "payment-success.html",
    "favicon.ico",
]
TEXT_SUFFIXES = {".html", ".js", ".css", ".svg", ".txt", ".xml"}


def rewrite_root_paths(text: str) -> str:
    # GitHub project Pages lives under /frankiholz rather than the domain root.
    for quote in ('"', "'", "`"):
        text = re.sub(rf"{re.escape(quote)}/(?!/)", f"{quote}{BASE}/", text)
    text = re.sub(r"url\(/(?!/)", f"url({BASE}/", text)
    text = re.sub(r"\b(href|src|action)=/(?!/)", rf"\1={BASE}/", text)
    return text


def inject_staging_banner(html: str) -> str:
    tag = '<script src="/assets/staging-banner.js"></script>'
    if tag in html:
        return html
    return html.replace("</body>", f"{tag}</body>")


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in ROOT_FILES:
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)

    shutil.copytree(ROOT / "assets", OUT / "assets")

    # Staging must never route a guest into live Stripe, regardless of the
    # production admin setting stored in Supabase.
    auth_file = OUT / "assets" / "authorization-flow.js"
    auth = auth_file.read_text(encoding="utf-8")
    needle = "const mode=await paymentEnvironment();"
    if needle not in auth:
        raise RuntimeError("Could not find Stripe environment selection in authorization-flow.js")
    auth = auth.replace(needle, "const mode='test'; // GitHub Pages staging is always Stripe TEST")
    auth_file.write_text(auth, encoding="utf-8")

    # Visible staging banner on all guest-facing pages.
    banner = """(()=>{\n  const bar=document.createElement('div');\n  bar.setAttribute('role','status');\n  bar.textContent='STAGING · Stripe TEST mode · No real payments';\n  bar.style.cssText='position:sticky;top:0;z-index:99999;padding:8px 12px;text-align:center;font:800 12px/1.2 system-ui,sans-serif;letter-spacing:.04em;background:#fff3cd;color:#6b5200;border-bottom:1px solid #e6cc73';\n  document.body.prepend(bar);\n})();\n"""
    (OUT / "assets" / "staging-banner.js").write_text(banner, encoding="utf-8")

    for page_name in ("index.html", "booking-status.html", "payment-success.html"):
        page = OUT / page_name
        html = page.read_text(encoding="utf-8")
        page.write_text(inject_staging_banner(html), encoding="utf-8")

    # Do not expose the production-data admin console from the staging host.
    # A separate Supabase staging backend can be added later if admin staging is needed.
    admin_html = """<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>FrankiHolz Staging Admin</title><link rel=\"stylesheet\" href=\"/assets/styles.css\"></head><body><main class=\"wrap\" style=\"padding:48px 20px;max-width:760px\"><section class=\"panel\"><span class=\"section-kicker\">Staging safety</span><h1>Admin disabled on GitHub Pages staging</h1><p>This staging site shares the production Supabase project, so the admin console is intentionally disabled here to prevent accidental changes to live rooms, pricing, availability, content or payment settings.</p><p>The guest booking flow is forced to Stripe TEST mode.</p><p><a class=\"btn secondary\" href=\"/\">Back to staging website</a></p></section></main></body></html>"""
    (OUT / "admin.html").write_text(admin_html, encoding="utf-8")

    # GitHub Pages has no Netlify clean-URL redirects, so provide directory indexes.
    aliases = {
        "booking-status": "booking-status.html",
        "payment-success": "payment-success.html",
        "admin": "admin.html",
    }
    for route, source in aliases.items():
        route_dir = OUT / route
        route_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(OUT / source, route_dir / "index.html")

    # Keep staging out of search engines.
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    (OUT / ".nojekyll").write_text("", encoding="utf-8")

    # Rewrite domain-root paths to the GitHub Pages project base path.
    for path in OUT.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
            text = path.read_text(encoding="utf-8")
            path.write_text(rewrite_root_paths(text), encoding="utf-8")

    print(f"Built FrankiHolz staging site at {OUT}")


if __name__ == "__main__":
    build()
