from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"

ROOT_FILES = [
    "index.html",
    "404.html",
    "booking-status.html",
    "payment-success.html",
    "admin.html",
    "favicon.ico",
]

APPROVED_LOGO_PATH = ROOT / "assets" / "frankiholz-logo-approved.png"
APPROVED_LOGO_SHA256 = "4946f5561fb3bb769c985664623517cd5f06639ed12bcf4891b524af2269f827"


def inject_staging_safety(html: str) -> str:
    robots_tag = '<meta name="robots" content="noindex,nofollow">'
    if robots_tag not in html:
        html = html.replace("</head>", f"{robots_tag}</head>")
    return html


def verify_approved_logo() -> None:
    if not APPROVED_LOGO_PATH.exists():
        raise RuntimeError("Approved FrankiHolz logo is missing from assets")
    data = APPROVED_LOGO_PATH.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Approved FrankiHolz logo is not a PNG")
    digest = hashlib.sha256(data).hexdigest()
    if digest != APPROVED_LOGO_SHA256:
        raise RuntimeError(f"Approved FrankiHolz logo hash mismatch: {digest}")


def build() -> None:
    verify_approved_logo()

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in ROOT_FILES:
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)

    shutil.copytree(ROOT / "assets", OUT / "assets")

    # Staging guest payments must always stay in Stripe TEST mode.
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

    # Keep public staging pages out of search engines and force fresh branding assets.
    for page_name in ("index.html", "booking-status.html", "payment-success.html"):
        page = OUT / page_name
        html = page.read_text(encoding="utf-8")
        if page_name == "index.html":
            html = html.replace("brand-overrides.css?v=20260912f", "brand-overrides.css?v=20260912h")
            html = html.replace("frankiholz-logo-approved.png?v=20260912f", "frankiholz-logo-approved.png?v=20260912h")
        page.write_text(inject_staging_safety(html), encoding="utf-8")

    # Admin is intentionally enabled on staging. It uses the same configured
    # Supabase project as this branch, while the guest payment flow above is
    # still forced to Stripe TEST mode.
    if not (OUT / "admin.html").exists():
        raise RuntimeError("Staging admin.html was not copied")

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

    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    print(f"Built FrankiHolz ShipStatic staging site at {OUT}")


if __name__ == "__main__":
    build()
