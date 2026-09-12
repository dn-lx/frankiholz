alter table public.frankiholz_site_settings
  add column if not exists hero_title_size_desktop_px integer not null default 56,
  add column if not exists hero_title_size_mobile_px integer not null default 38;

update public.frankiholz_site_settings
set hero_title_size_desktop_px = 56,
    hero_title_size_mobile_px = 38,
    updated_at = now()
where id = 1;
