// Bilingual defaults preserved from the audited guest-information and copy editors.
export const guestFields = [
  {
    "key": "fhHostPhoto",
    "label": "Host avatar photo",
    "en": "/assets/host-inura.jpg",
    "de": "/assets/host-inura.jpg",
    "kind": "photo"
  },
  {
    "key": "fhHostName",
    "label": "Host message: host name",
    "en": "Inura",
    "de": "Inura",
    "kind": "input"
  },
  {
    "key": "fhHostRole",
    "label": "Host message: short introduction",
    "en": "Your host in Frankfurt",
    "de": "Ihr Gastgeber in Frankfurt",
    "kind": "input"
  },
  {
    "key": "fhHostTitle",
    "label": "Host message: heading",
    "en": "Message from your host",
    "de": "Eine Nachricht von Ihrem Gastgeber",
    "kind": "input"
  },
  {
    "key": "fhHostBody",
    "label": "Host message (separate paragraphs with a blank line)",
    "en": "We value our guests' privacy and personal space, while always being happy to help with recommendations for restaurants, nightlife, sightseeing or transportation.\n\nYour room is designed to be comfortable during the day, while warm ambient lighting and red mood lighting can create a more intimate atmosphere in the evening. Whether you're visiting Frankfurt alone, for work, nightlife, or enjoying a romantic stay together, you can make the space feel the way you like.\n\nEveryone is welcome. Come as you are, enjoy your privacy, and make yourself at home.",
    "de": "Wir schätzen die Privatsphäre und den persönlichen Freiraum unserer Gäste und helfen Ihnen zugleich gerne mit Empfehlungen für Restaurants, das Nachtleben, Sehenswürdigkeiten oder Verkehrsmittel.\n\nIhr Zimmer ist tagsüber ein gemütlicher Rückzugsort. Am Abend sorgen warmes, stimmungsvolles Licht und rote Akzentbeleuchtung auf Wunsch für eine intimere Atmosphäre. Ob Sie Frankfurt allein, beruflich, wegen des Nachtlebens oder für einen romantischen Aufenthalt zu zweit besuchen – gestalten Sie die Atmosphäre so, wie Sie sich wohlfühlen.\n\nAlle sind willkommen. Kommen Sie, wie Sie sind, genießen Sie Ihre Privatsphäre und fühlen Sie sich wie zu Hause.",
    "kind": "textarea"
  },
  {
    "key": "fhHeatingRule",
    "label": "House rules: heating controls",
    "en": "Please keep the radiator thermostat on, at a setting no higher than 3. Do not turn it off. If your room feels too cold, please let us know.",
    "de": "Bitte lassen Sie das Heizkörperthermostat eingeschaltet und stellen Sie es höchstens auf Stufe 3. Schalten Sie die Heizung nicht aus. Wenn es Ihnen zu kalt ist, sagen Sie uns bitte Bescheid.",
    "kind": "textarea"
  },
  {
    "key": "fhCheckIn",
    "label": "House rules: check-in",
    "en": "17:00",
    "de": "17:00",
    "kind": "input"
  },
  {
    "key": "fhCheckOut",
    "label": "House rules: check-out",
    "en": "11:00",
    "de": "11:00",
    "kind": "input"
  },
  {
    "key": "fhQuietHours",
    "label": "House rules: quiet hours",
    "en": "Please respect neighbours and keep noise low, especially at night. Exact quiet hours will be confirmed by the host.",
    "de": "Bitte nehmen Sie Rücksicht auf Nachbarn und vermeiden Sie insbesondere nachts Lärm. Die genauen Ruhezeiten bestätigt der Gastgeber.",
    "kind": "textarea"
  },
  {
    "key": "fhExtraGuests",
    "label": "House rules: additional guests",
    "en": "Only registered guests may stay overnight. Additional guests or visitors require the host’s approval in advance.",
    "de": "Nur angemeldete Gäste dürfen übernachten. Zusätzliche Gäste oder Besucher benötigen die vorherige Zustimmung des Gastgebers.",
    "kind": "textarea"
  },
  {
    "key": "fhOtherRules",
    "label": "House rules: additional information",
    "en": "Please treat the apartment and shared areas with care.",
    "de": "Bitte behandeln Sie die Wohnung und Gemeinschaftsbereiche sorgfältig.",
    "kind": "textarea"
  },
  {
    "key": "fhFacilities",
    "label": "Facilities (one per line)",
    "en": "Wi-Fi\nShared kitchen access\nLaundry (additional charge)\nGarden access\nHeating\nTV",
    "de": "WLAN\nGemeinschaftsküche\nWäschewaschen (gegen Gebühr)\nGartennutzung\nHeizung\nFernseher",
    "kind": "textarea"
  },
  {
    "key": "fhAboutTitle",
    "label": "About us: heading",
    "en": "About FrankiHolz",
    "de": "Über FrankiHolz",
    "kind": "input"
  },
  {
    "key": "fhAboutBody",
    "label": "About us: introduction",
    "en": "FrankiHolz offers private rooms in a shared three-bedroom apartment in Frankfurt am Main. Guests can contact the host directly with questions about their stay and the shared facilities. Our goal is to make expectations clear before arrival and offer a straightforward booking experience.",
    "de": "FrankiHolz bietet private Zimmer in einer Dreizimmer-Wohngemeinschaft in Frankfurt am Main. Bei Fragen zum Aufenthalt und den gemeinschaftlich genutzten Bereichen können Gäste den Gastgeber direkt kontaktieren. Wir möchten die Erwartungen vor der Anreise transparent machen und eine unkomplizierte Buchung ermöglichen.",
    "kind": "textarea"
  },
  {
    "key": "fhContactPhone",
    "label": "Contact: phone number",
    "en": "+49 176 62493 041",
    "de": "+49 176 62493 041",
    "kind": "input"
  },
  {
    "key": "fhAirbnbReviewsUrl",
    "label": "Reviews: official Airbnb listing URL (optional)",
    "en": "",
    "de": "",
    "kind": "input",
    "optional": true
  },
  {
    "key": "fhHeroReviews",
    "label": "Below-hero reviews: genuine Airbnb guest quotations (optional)",
    "en": "",
    "de": "",
    "kind": "textarea",
    "optional": true
  },
  {
    "key": "fhAirbnbRating",
    "label": "Airbnb listing rating (snapshot, manually updated)",
    "en": "4.74",
    "de": "4.74",
    "kind": "input",
    "optional": true
  },
  {
    "key": "fhAirbnbCount",
    "label": "Airbnb listing review count (snapshot, manually updated)",
    "en": "35",
    "de": "35",
    "kind": "input",
    "optional": true
  }
] as const;
export const homeCopyDefaults = [
  {
    "copy_key": "heroMinor",
    "label": "Hero: tagline",
    "text_en": "Thoughtful stays in Frankfurt-Sachsenhausen",
    "text_de": "Angenehm übernachten in Frankfurt-Sachsenhausen",
    "sort_order": 1200
  },
  {
    "copy_key": "eyebrow",
    "label": "Hero: location badge",
    "text_en": "Accommodation in Frankfurt am Main",
    "text_de": "Unterkunft in Frankfurt am Main",
    "sort_order": 1201
  },
  {
    "copy_key": "viewRooms",
    "label": "Hero: rooms button",
    "text_en": "View rooms",
    "text_de": "Zimmer ansehen",
    "sort_order": 1202
  },
  {
    "copy_key": "bookNow",
    "label": "Navigation: booking button",
    "text_en": "Book now",
    "text_de": "Jetzt buchen",
    "sort_order": 1203
  },
  {
    "copy_key": "liveAvailability",
    "label": "Highlight: availability title",
    "text_en": "Live availability",
    "text_de": "Live-Verfügbarkeit",
    "sort_order": 1204
  },
  {
    "copy_key": "approvedBlock",
    "label": "Highlight: availability description",
    "text_en": "Only confirmed bookings block dates",
    "text_de": "Nur bestätigte Buchungen blockieren Termine",
    "sort_order": 1205
  },
  {
    "copy_key": "clearPricing",
    "label": "Highlight: pricing title",
    "text_en": "Clear pricing",
    "text_de": "Transparente Preise",
    "sort_order": 1206
  },
  {
    "copy_key": "estimatedInstant",
    "label": "Highlight: pricing description",
    "text_en": "See your estimated stay total instantly",
    "text_de": "Gesamtpreis für den Aufenthalt sofort sehen",
    "sort_order": 1207
  },
  {
    "copy_key": "directBooking",
    "label": "Highlight: direct booking title",
    "text_en": "Direct booking",
    "text_de": "Direktbuchung",
    "sort_order": 1208
  },
  {
    "copy_key": "directHost",
    "label": "Highlight: direct booking description",
    "text_en": "Save your card securely with Stripe, then wait for host confirmation",
    "text_de": "Karte sicher bei Stripe hinterlegen und auf die Bestätigung warten",
    "sort_order": 1209
  }
];
