// Current approved bilingual content from the audited website. React escapes all editable text.
export const contentFields = [
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
export const defaultReviews = [
  {
    "author": "Katharina",
    "quote": "Central location, easy access to the city and a helpful, flexible host.",
    "quote_de": "Zentrale Lage, gute Erreichbarkeit der Stadt und ein hilfsbereiter, flexibler Gastgeber.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Catarina",
    "quote": "Welcoming hosts, a clean and comfortable room and convenient transportation. Check-in and check-out were easy.",
    "quote_de": "Herzliche Gastgeber, ein sauberes, bequemes Zimmer und gute Verkehrsanbindung. Check-in und Check-out waren unkompliziert.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Ke",
    "quote": "A friendly host and a pleasant stay.",
    "quote_de": "Ein freundlicher Gastgeber und ein angenehmer Aufenthalt.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Imanol",
    "quote": "Friendly and understanding hosting.",
    "quote_de": "Freundliche und verständnisvolle Gastfreundschaft.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Anas",
    "quote": "A great host and a well-located place that the guest recommends.",
    "quote_de": "Ein toller Gastgeber und eine gut gelegene Unterkunft, die der Gast weiterempfiehlt.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Patricia",
    "quote": "A friendly, accommodating host, with a cozy, clean room and a smooth stay.",
    "quote_de": "Ein freundlicher, entgegenkommender Gastgeber, ein gemütliches, sauberes Zimmer und ein reibungsloser Aufenthalt.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Kai",
    "quote": "Friendly hosting, a convenient location and good value for a budget-conscious traveler.",
    "quote_de": "Freundliche Gastgeber, eine praktische Lage und eine gute Option für preisbewusste Reisende.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Josephin Alina",
    "quote": "Everything went smoothly, and the guest would happily stay again.",
    "quote_de": "Alles verlief problemlos, und der Gast würde gerne wiederkommen.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Abhiram",
    "quote": "Comfortable, well-maintained accommodation with helpful hosts and a convenient location.",
    "quote_de": "Bequeme, gepflegte Unterkunft mit hilfsbereiten Gastgebern und praktischer Lage.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Sophie",
    "quote": "Welcoming and accommodating hosting, with a practical room for a short stay.",
    "quote_de": "Herzlicher, zuvorkommender Gastgeber und ein praktisches Zimmer für einen kurzen Aufenthalt.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Alexander",
    "quote": "A comfortable, clean space and an accommodating host, even when travel was delayed.",
    "quote_de": "Eine gemütliche, saubere Unterkunft und ein zuvorkommender Gastgeber, auch bei verspäteter Anreise.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  },
  {
    "author": "Dai",
    "quote": "A comfortable room with excellent amenities, even during warm summer weather.",
    "quote_de": "Ein bequemes Zimmer mit sehr guter Ausstattung, auch bei sommerlicher Wärme.",
    "url": "https://www.airbnb.com/rooms/1621684668409633226",
    "rating": 5,
    "kind": "summary"
  }
];
export const houseGuide = {
  "en": [
    {
      "title": "Make yourself at home",
      "items": [
        "After check-in, you may come and go at any time. Please keep noise low during quiet hours.",
        "You are welcome to bring your own food, prepare meals in the shared kitchen and enjoy the common areas respectfully."
      ]
    },
    {
      "title": "Your room & our shared home",
      "items": [
        "Please leave all room and property items in the accommodation when you depart.",
        "Accidents can happen. Please tell us immediately if anything is damaged.",
        "Switch off lights, fans, air conditioning and electrical appliances when leaving your room.",
        "For safety and privacy, outside guests are not allowed in the rooms. Please speak with us first about exceptional circumstances."
      ]
    },
    {
      "title": "Kitchen & food",
      "items": [
        "Breakfast and dinner are not included in your stay. Please use only food and drinks that you personally bring.",
        "Clean kitchen utensils and surfaces after use. Keep food in closed containers to avoid insects."
      ]
    },
    {
      "title": "Bathroom & toilet",
      "items": [
        "Please leave the bathroom and toilet clean after every use.",
        "We kindly ask everyone to use the toilet seated to help keep it clean and hygienic. Thank you for understanding.",
        "Never flush sanitary products, wipes or other non-flushable items. Use the bin provided.",
        "Keep the floor dry after showering and turn taps off properly.",
        "Please tell us immediately if you notice a plumbing problem."
      ]
    },
    {
      "title": "Quiet hours & safety",
      "items": [
        "Keep noise to a minimum from 22:00 to 07:00 out of respect for others in the house and our neighbours.",
        "Smoking is not permitted inside the house or rooms. Smoke only in designated outdoor areas.",
        "Illegal substances are not allowed on the property. Candles and open flames are not permitted in the rooms."
      ]
    },
    {
      "title": "Departure & key return",
      "items": [
        "Please check out by 11:00 on your departure date. Let us know before you leave so we can arrange the key return together.",
        "Leave your room in a respectful condition. We would love to hear your honest feedback and any suggestions for your next stay."
      ]
    }
  ],
  "de": [
    {
      "title": "Fühlen Sie sich wie zu Hause",
      "items": [
        "Nach dem Check-in können Sie jederzeit kommen und gehen. Bitte beachten Sie dabei die Ruhezeiten.",
        "Bringen Sie gerne eigene Lebensmittel mit, bereiten Sie Mahlzeiten in der Gemeinschaftsküche zu und nutzen Sie die gemeinsamen Räume rücksichtsvoll."
      ]
    },
    {
      "title": "Ihr Zimmer & unser gemeinsames Zuhause",
      "items": [
        "Bitte lassen Sie bei der Abreise alle Gegenstände aus dem Zimmer und der Unterkunft vor Ort.",
        "Missgeschicke können passieren. Informieren Sie uns bitte sofort, falls etwas beschädigt wird.",
        "Schalten Sie beim Verlassen des Zimmers Licht, Ventilatoren, Klimaanlage und elektrische Geräte aus.",
        "Aus Sicherheits- und Datenschutzgründen sind externe Besucher in den Zimmern nicht gestattet. Sprechen Sie bei Ausnahmen bitte vorher mit uns."
      ]
    },
    {
      "title": "Küche & Lebensmittel",
      "items": [
        "Frühstück und Abendessen sind nicht im Aufenthalt enthalten. Bitte verwenden Sie nur selbst mitgebrachte Speisen und Getränke.",
        "Reinigen Sie Küchenutensilien und Oberflächen nach Gebrauch. Bewahren Sie Lebensmittel in geschlossenen Behältern auf, um Insekten zu vermeiden."
      ]
    },
    {
      "title": "Badezimmer & Toilette",
      "items": [
        "Bitte hinterlassen Sie Badezimmer und Toilette nach jeder Nutzung sauber.",
        "Wir bitten alle Gäste, die Toilette im Sitzen zu benutzen, damit sie sauber und hygienisch bleibt. Vielen Dank für Ihr Verständnis.",
        "Spülen Sie keine Hygieneartikel, Feuchttücher oder andere ungeeignete Gegenstände hinunter. Nutzen Sie den bereitgestellten Mülleimer.",
        "Halten Sie den Boden nach dem Duschen trocken und drehen Sie Wasserhähne richtig zu.",
        "Informieren Sie uns sofort, wenn Sie ein Problem mit den Leitungen oder Abflüssen bemerken."
      ]
    },
    {
      "title": "Ruhezeiten & Sicherheit",
      "items": [
        "Bitte halten Sie den Geräuschpegel von 22:00 bis 07:00 aus Rücksicht auf die Hausbewohner und Nachbarn möglichst niedrig.",
        "Im Haus und in den Zimmern ist Rauchen nicht gestattet. Rauchen Sie nur in den vorgesehenen Außenbereichen.",
        "Illegale Substanzen sind auf dem Grundstück nicht erlaubt. Kerzen und offene Flammen sind in den Zimmern nicht gestattet."
      ]
    },
    {
      "title": "Abreise & Schlüsselrückgabe",
      "items": [
        "Bitte reisen Sie am Abreisetag bis 11:00 Uhr ab. Geben Sie uns vor der Abreise Bescheid, damit wir die Schlüsselrückgabe gemeinsam abstimmen können.",
        "Hinterlassen Sie Ihr Zimmer bitte in einem ordentlichen Zustand. Wir freuen uns über ehrliche Rückmeldungen und Anregungen für Ihren nächsten Aufenthalt."
      ]
    }
  ]
};
