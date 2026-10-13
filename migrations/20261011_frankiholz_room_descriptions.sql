-- Conservative bilingual room-description correction.
-- Apply through the normal reviewed backend release; this repository branch does not write live Supabase data.
-- Only replace the known duplicated placeholder descriptions, preserving any later Admin edits.
UPDATE public.frankiholz_rooms
SET
  description = CASE slug
    WHEN 'room-1' THEN 'Cozy Holz is a private room in a shared three-bedroom apartment at Seehofstraße 20 in Frankfurt am Main. Shared facilities are described on this page. Please review the house rules and arrange check-in with the host.'
    WHEN 'room-2' THEN 'Castle Holz is a private room in a shared three-bedroom apartment at Seehofstraße 20 in Frankfurt am Main. Shared facilities are described on this page. Please review the house rules and arrange check-in with the host.'
    WHEN 'room-3' THEN 'Comfy Holz is a private room in a shared three-bedroom apartment at Seehofstraße 20 in Frankfurt am Main. Shared facilities are described on this page. Please review the house rules and arrange check-in with the host.'
    ELSE description
  END,
  description_de = CASE slug
    WHEN 'room-1' THEN 'Cozy Holz ist ein privates Zimmer in einer Dreizimmer-Wohngemeinschaft in der Seehofstraße 20 in Frankfurt am Main. Die gemeinsam nutzbaren Einrichtungen sind auf dieser Seite beschrieben. Bitte beachten Sie die Hausregeln und stimmen Sie den Check-in mit dem Gastgeber ab.'
    WHEN 'room-2' THEN 'Castle Holz ist ein privates Zimmer in einer Dreizimmer-Wohngemeinschaft in der Seehofstraße 20 in Frankfurt am Main. Die gemeinsam nutzbaren Einrichtungen sind auf dieser Seite beschrieben. Bitte beachten Sie die Hausregeln und stimmen Sie den Check-in mit dem Gastgeber ab.'
    WHEN 'room-3' THEN 'Comfy Holz ist ein privates Zimmer in einer Dreizimmer-Wohngemeinschaft in der Seehofstraße 20 in Frankfurt am Main. Die gemeinsam nutzbaren Einrichtungen sind auf dieser Seite beschrieben. Bitte beachten Sie die Hausregeln und stimmen Sie den Check-in mit dem Gastgeber ab.'
    ELSE description_de
  END,
  updated_at = now()
WHERE slug IN ('room-1','room-2','room-3')
  AND description = 'Franki Holz - A Room in 3-bedroom shared apartment'
  AND description_de = 'Franki Holz – Zimmer in einer 3-Personen-WG';
