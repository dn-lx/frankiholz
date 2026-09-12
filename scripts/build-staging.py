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
APPROVED_LOGO_SHA256 = "cbc29dcb36419a3395bde838c88262b6c54891a00ecbff2cb74241c2d3796312"
APPROVED_LOGO_SIZE = 758364


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
    if len(data) != APPROVED_LOGO_SIZE:
        raise RuntimeError(f"Approved FrankiHolz logo size mismatch: {len(data)}")
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
            html = html.replace("brand-overrides.css?v=20260912f", "brand-overrides.css?v=20260912k")
            html = html.replace("brand-overrides.css?v=20260912h", "brand-overrides.css?v=20260912k")
            html = html.replace("frankiholz-logo-approved.png?v=20260912f", "frankiholz-logo-approved.png?v=20260912k")
            html = html.replace("frankiholz-logo-approved.png?v=20260912h", "frankiholz-logo-approved.png?v=20260912k")
            # Staging-only Admin shortcut. This is intentionally not added to production source HTML.
            if 'href="/admin/"' not in html:
                marker = '<div class="nav-actions">'
                html = html.replace(marker, marker + '<a class="nav-link staging-admin-link" href="/admin/">Admin</a>', 1)
        page.write_text(inject_staging_safety(html), encoding="utf-8")

    # Admin is intentionally enabled on staging. It uses the configured Supabase
    # project, while the guest payment flow above remains forced to Stripe TEST.
    admin_page = OUT / "admin.html"
    if not admin_page.exists():
        raise RuntimeError("Staging admin.html was not copied")
    admin = admin_page.read_text(encoding="utf-8")
    staging_badge = '<div style="display:inline-flex;margin-bottom:12px;padding:6px 10px;border-radius:999px;background:#0C3447;color:#fff;font-size:11px;font-weight:800;letter-spacing:.08em">FRANKIHOLZ STAGING</div>'
    if "FRANKIHOLZ STAGING" not in admin:
        admin = admin.replace('<section id="loginView" class="login-card">', '<section id="loginView" class="login-card">' + staging_badge, 1)
    # Use the same approved logo asset inside the staging Admin instead of a Drive thumbnail.
    admin = admin.replace(
        'src="https://drive.google.com/thumbnail?id=1Fs139HGtDBC0urpm3KaiQDWNNtroavlg&sz=w1000&v=20260912d"',
        'src="/assets/frankiholz-logo-approved.png?v=20260912k"',
    )
    admin_page.write_text(admin, encoding="utf-8")

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
