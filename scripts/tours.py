"""Which real-photo panoramas make up each asset's 360° visit (Poly Haven, CC0)."""

# asset -> [(polyhaven id, english label, french label)]
TOURS: dict[str, list[tuple[str, str, str]]] = {
    # residential
    "KST-PAR-001": [("photo_studio_loft_hall", "The atelier", "L'atelier"), ("brown_photostudio_02", "Living room", "Le séjour"), ("brown_photostudio_05", "Bedroom", "La chambre"), ("kiara_interior", "Kitchen", "La cuisine")],
    "KST-PAR-002": [("glasshouse_interior", "Salon with a view", "Le salon panoramique"), ("brown_photostudio_04", "Living room", "Le séjour"), ("brown_photostudio_07", "Bedroom", "La chambre"), ("treetop_balcony", "Balcony", "Le balcon")],
    "KST-PAR-006": [("combination_room", "Grand salon", "Le grand salon"), ("entrance_hall", "Entrance hall", "Le vestibule"), ("anniversary_lounge", "Drawing room", "Le salon de réception"), ("lythwood_room", "Bedroom", "La chambre")],
    "KST-LON-001": [("brown_photostudio_01", "The loft", "Le loft"), ("brown_photostudio_03", "Living space", "L'espace de vie"), ("cayley_interior", "Lounge", "Le salon"), ("brown_photostudio_06", "Bedroom", "La chambre")],
    "KST-LON-002": [("photo_studio_london_hall", "Warehouse flat", "L'appartement-entrepôt"), ("brown_photostudio_06", "Living room", "Le séjour"), ("kiara_interior", "Kitchen", "La cuisine"), ("urban_courtyard", "Courtyard", "La cour")],
    "KST-LON-006": [("lythwood_lounge", "Lounge", "Le salon"), ("lythwood_room", "Bedroom", "La chambre"), ("reading_room", "Study", "Le bureau"), ("lythwood_terrace", "Garden", "Le jardin")],
    "KST-LIS-001": [("vignaioli", "The view", "La vue"), ("cayley_interior", "Living room", "Le séjour"), ("brown_photostudio_04", "Bedroom", "La chambre"), ("stone_alley", "The lane", "La ruelle")],
    "KST-LIS-006": [("glasshouse_interior", "Living room", "Le séjour"), ("studio_country_hall", "Hall", "Le hall"), ("brown_photostudio_05", "Bedroom", "La chambre"), ("palermo_sidewalk", "The street", "La rue")],
    "KST-RAK-003": [("old_room", "Salon", "Le salon"), ("reading_room", "Library", "La bibliothèque"), ("veranda", "Veranda", "La véranda"), ("pool", "Garden pool", "La piscine")],
    # hospitality
    "KST-PAR-005": [("entrance_hall", "Lobby", "Le hall"), ("large_corridor", "Corridor", "Le couloir"), ("hotel_room", "Room", "La chambre"), ("warm_restaurant", "Restaurant", "Le restaurant")],
    "KST-LON-005": [("country_club", "Lobby lounge", "Le salon du hall"), ("ballroom", "Ballroom", "La salle de bal"), ("relax_inn_seaview_suite", "Suite", "La suite"), ("indoor_pool", "Spa", "Le spa")],
    "KST-RAK-002": [("pool", "Pool", "La piscine"), ("lapa", "Garden lounge", "Le salon de jardin"), ("veranda", "Veranda", "La véranda"), ("relax_inn_seaview_suite", "Villa suite", "La suite")],
    "KST-LIS-002": [("wooden_lounge", "Lounge", "Le salon"), ("hotel_room", "Room", "La chambre"), ("warm_restaurant", "Breakfast room", "La salle du petit-déjeuner"), ("hotel_rooftop_balcony", "Rooftop", "Le toit-terrasse")],
    "KST-RAK-001": [("historic_cloister_passage", "Gallery", "La galerie"), ("sepulchral_chapel_rotunda", "Hammam", "Le hammam"), ("medieval_cafe", "Courtyard", "La cour"), ("veranda", "Veranda", "La véranda")],
    "KST-RAK-006": [("medieval_cafe", "Courtyard", "La cour"), ("stone_alley_02", "The derb", "Le derb"), ("lapa", "Garden lounge", "Le salon de jardin"), ("pool", "Pool", "La piscine")],
    # student living
    "KST-PAR-003": [("newman_lobby", "Lobby", "Le hall"), ("small_empty_room_1", "Studio", "Le studio"), ("newman_cafeteria", "Canteen", "La cantine"), ("school_hall", "Study hall", "La salle d'étude")],
    "KST-LON-003": [("newman_lobby", "Lobby", "Le hall"), ("small_empty_room_3", "Studio", "Le studio"), ("newman_cafeteria", "Canteen", "La cantine"), ("urban_courtyard_02", "Courtyard", "La cour")],
    "KST-LIS-003": [("small_empty_room_1", "Studio", "Le studio"), ("school_hall", "Study hall", "La salle d'étude"), ("newman_cafeteria", "Canteen", "La cantine"), ("urban_courtyard_02", "Courtyard", "La cour")],
    # commercial
    "KST-PAR-004": [("decor_shop", "Boutique", "La boutique"), ("comfy_cafe", "Café corner", "Le coin café"), ("phone_shop", "Counter", "Le comptoir"), ("art_studio", "Atelier", "L'atelier")],
    "KST-RAK-004": [("decor_shop", "Concept store", "Le concept store"), ("art_studio", "Gallery", "La galerie"), ("comfy_cafe", "Café", "Le café"), ("palermo_sidewalk", "The street", "La rue")],
    "KST-LIS-004": [("industrial_wooden_attic", "Open floor", "Le plateau"), ("poly_haven_studio", "Studio", "Le studio"), ("events_hall_interior", "Event hall", "La salle d'événements"), ("unfinished_office", "Meeting room", "La salle de réunion")],
    "KST-LON-004": [("art_studio", "Studio floor", "Le plateau"), ("poly_haven_studio", "Office", "Le bureau"), ("events_hall_interior", "Event hall", "La salle d'événements"), ("unfinished_office", "Meeting room", "La salle de réunion")],
    # land
    "KST-LIS-005": [("stone_pines", "Stone pines", "Les pins parasols"), ("sunny_country_road", "Estate road", "Le chemin du domaine"), ("straw_rolls_field_01", "Harvested fields", "Les champs moissonnés"), ("lythwood_terrace", "Terrace", "La terrasse")],
    "KST-RAK-005": [("lonely_road_afternoon", "Valley road", "La route de la vallée"), ("waterkloof_farm", "Farmland", "Les terres"), ("sabie_tent", "Lodge", "Le lodge"), ("stone_pines", "The grove", "Le bosquet")],
}
