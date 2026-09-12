from __future__ import annotations

import base64
import shutil
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"

ROOT_FILES = [
    "index.html",
    "404.html",
    "booking-status.html",
    "payment-success.html",
    "favicon.ico",
]

# Exact approved FrankiHolz logo from the user's shared Google Drive brand kit:
# 01 Primary Logos / FrankiHolz_Logo_Transparent_ForDark_512.png
APPROVED_LOGO_URL = (
    "https://drive.usercontent.google.com/download"
    "?id=1HlgZzD8beXvP2m_zboRzunQYK8JwVHOP&export=download&confirm=t"
)
APPROVED_LOGO_PATH = "frankiholz-logo-approved.png"
APPROVED_LOGO_SOURCE = "/assets/frankiholz-logo-approved.png?v=20260912f"


def inject_staging_safety(html: str) -> str:
    robots_tag = '<meta name="robots" content="noindex,nofollow">'
    if robots_tag not in html:
        html = html.replace("</head>", f"{robots_tag}</head>")
    return html


def copy_approved_logo() -> bytes:
    request = Request(
        APPROVED_LOGO_URL,
        headers={"User-Agent": "Mozilla/5.0 (FrankiHolz staging build)"},
    )
    with urlopen(request, timeout=30) as response:
        logo = response.read()

    # Fail instead of silently publishing the wrong or missing asset.
    if not logo.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Approved FrankiHolz Drive asset did not return a PNG")
    if len(logo) < 50_000:
        raise RuntimeError("Approved FrankiHolz Drive logo download is unexpectedly small")

    target = OUT / "assets" / APPROVED_LOGO_PATH
    target.write_bytes(logo)
    print(f"Copied approved Drive logo to {target} ({len(logo)} bytes)")
    return logo


def embed_header_logo(html: str, logo: bytes) -> str:
    """Embed the exact approved PNG in the header to avoid CDN/path/cache failures."""
    if APPROVED_LOGO_SOURCE not in html:
        raise RuntimeError("Public index does not reference the approved FrankiHolz logo source")
    data_uri = "data:image/png;base64," + base64.b64encode(logo).decode("ascii")
    return html.replace(APPROVED_LOGO_SOURCE, data_uri)


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in ROOT_FILES:
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)

    shutil.copytree(ROOT / "assets", OUT / "assets")
    approved_logo = copy_approved_logo()

    # Staging must never route a guest into live Stripe, regardless of the
    # production admin setting stored in Supabase. Keep this safety enforced
    # without displaying a banner on the guest-facing website.
    auth_file = OUT / "assets" / "authorization-flow.js"
    auth = auth_file.read_text(encoding="utf-8")
    needle = "const mode=await paymentEnvironment();"
    if needle not in auth:
        raise RuntimeError("Could not find Stripe environment selection in authorization-flow.js")
    auth = auth.replace(
        needle,
        "const mode='test'; // ShipStatic staging is always Stripe TEST",
    )
    auth_file.write_text(auth, encoding="utf-8")

    for page_name in ("index.html", "booking-status.html", "payment-success.html"):
        page = OUT / page_name
        html = page.read_text(encoding="utf-8")
        if page_name == "index.html":
            html = embed_header_logo(html, approved_logo)
        page.write_text(inject_staging_safety(html), encoding="utf-8")

    # Do not expose the production-data admin console from the staging host.
    # A separate Supabase staging backend can be added later if admin staging is needed.
    admin_html = """<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>FrankiHolz Staging Admin</title><link rel=\"stylesheet\" href=\"/assets/styles.css\"></head><body><main class=\"wrap\" style=\"padding:48px 20px;max-width:760px\"><section class=\"panel\"><span class=\"section-kicker\">Staging safety</span><h1>Admin disabled on ShipStatic staging</h1><p>This staging site shares the production Supabase project, so the admin console is intentionally disabled here to prevent accidental changes to live rooms, pricing, availability, content or payment settings.</p><p>The guest booking flow is forced to Stripe TEST mode.</p><p><a class=\"btn secondary\" href=\"/\">Back to staging website</a></p></section></main></body></html>"""
    (OUT / "admin.html").write_text(admin_html, encoding="utf-8")

    # Keep clean URLs working on static hosting.
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

    print(f"Built FrankiHolz ShipStatic staging site at {OUT}")


if __name__ == "__main__":
    build()
