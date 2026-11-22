"""Which real-photo panoramas make up each asset's 360° visit (Poly Haven, CC0)."""

# asset -> [(polyhaven id, english label, french label)]
TOURS: dict[str, list[tuple[str, str, str]]] = {
    "KST-NYC-001": [
        ("brown_photostudio_03", "Living room", "Le séjour"),
        ("glasshouse_interior", "Great room", "La grande pièce"),
        ("modern_bathroom", "Bathroom", "La salle de bain"),
        ("hotel_rooftop_balcony", "Terrace", "La terrasse"),
    ],
    "KST-NYC-002": [
        ("vestibule", "Lobby", "Le lobby"),
        ("warm_bar", "Rooftop bar", "Le bar"),
        ("hotel_room", "Suite", "La suite"),
        ("large_corridor", "Gallery", "La galerie"),
    ],
    "KST-NYC-003": [
        ("decor_shop", "Sales floor", "L'espace de vente"),
        ("art_studio", "Atelier", "L'atelier"),
        ("comfy_cafe", "Client lounge", "Le salon clients"),
        ("modern_evening_street", "The avenue", "L'avenue"),
    ],
    "KST-NYC-004": [
        ("cayley_interior", "Living room", "Le séjour"),
        ("brown_photostudio_04", "Bedroom", "La chambre"),
        ("modern_bathroom", "Bathroom", "La salle de bain"),
        ("hotel_rooftop_balcony", "Sky terrace", "La terrasse"),
    ],
    "KST-PAR-001": [
        ("combination_room", "Grand salon", "Le grand salon"),
        ("anniversary_lounge", "Drawing room", "Le salon de réception"),
        ("lythwood_room", "Bedroom", "La chambre"),
        ("treetop_balcony", "Terrace", "La terrasse"),
    ],
    "KST-PAR-002": [
        ("entrance_hall", "Lobby", "Le hall"),
        ("ballroom", "Salon d'honneur", "Le salon d'honneur"),
        ("relax_inn_seaview_suite", "Suite", "La suite"),
        ("warm_restaurant", "Restaurant", "Le restaurant"),
    ],
    "KST-PAR-003": [
        ("decor_shop", "Boutique", "La boutique"),
        ("large_corridor", "Gallery", "La galerie"),
        ("comfy_cafe", "Private salon", "Le salon privé"),
        ("art_studio", "Atelier", "L'atelier"),
    ],
    "KST-PAR-004": [
        ("old_room", "Salon", "Le salon"),
        ("reading_room", "Library", "La bibliothèque"),
        ("brown_photostudio_05", "Bedroom", "La chambre"),
        ("studio_country_hall", "Hall", "Le hall"),
    ],
    "KST-DXB-001": [
        ("pool", "Private pool", "La piscine privée"),
        ("lapa", "Pool lounge", "Le salon de piscine"),
        ("sundowner_deck", "Sunset deck", "La terrasse du couchant"),
        ("relax_inn_seaview_suite", "Master suite", "La suite"),
    ],
    "KST-DXB-002": [
        ("glasshouse_interior", "Living room", "Le séjour"),
        ("cayley_interior", "Lounge", "Le salon"),
        ("modern_bathroom", "Bathroom", "La salle de bain"),
        ("hotel_rooftop_balcony", "Terrace", "La terrasse"),
    ],
    "KST-DXB-003": [
        ("country_club", "Lobby lounge", "Le salon du lobby"),
        ("indoor_pool", "Spa", "Le spa"),
        ("hotel_room", "Room", "La chambre"),
        ("aft_lounge", "Yacht club lounge", "Le salon du yacht club"),
    ],
    "KST-DXB-004": [
        ("warm_restaurant", "Dining room", "La salle"),
        ("warm_bar", "Bar", "Le bar"),
        ("wooden_lounge", "Lounge", "Le salon"),
        ("sundowner_deck", "Terrace", "La terrasse"),
    ],
    "KST-LON-001": [
        ("lythwood_lounge", "Drawing room", "Le salon"),
        ("lythwood_room", "Bedroom", "La chambre"),
        ("reading_room", "Study", "Le bureau"),
        ("lythwood_terrace", "Garden", "Le jardin"),
    ],
    "KST-LON-002": [
        ("country_club", "Lobby", "Le lobby"),
        ("ballroom", "Ballroom", "La salle de bal"),
        ("hotel_room", "Room", "La chambre"),
        ("warm_bar", "Bar", "Le bar"),
    ],
    "KST-LON-003": [
        ("brown_photostudio_02", "Living room", "Le séjour"),
        ("fireplace", "Sitting room", "Le petit salon"),
        ("brown_photostudio_07", "Bedroom", "La chambre"),
        ("stone_alley", "The mews", "L'allée"),
    ],
    "KST-LON-004": [
        ("art_studio", "Gallery", "La galerie"),
        ("large_corridor", "Enfilade", "L'enfilade"),
        ("warm_restaurant", "Members' dining", "La salle du club"),
        ("music_hall_02", "Salon", "Le salon"),
    ],
    "KST-RAK-001": [
        ("historic_cloister_passage", "Gallery", "La galerie"),
        ("sepulchral_chapel_rotunda", "Hammam", "Le hammam"),
        ("medieval_cafe", "Courtyard", "La cour"),
        ("veranda", "Veranda", "La véranda"),
    ],
    "KST-RAK-002": [
        ("pool", "Pool", "La piscine"),
        ("lapa", "Garden lounge", "Le salon de jardin"),
        ("veranda", "Veranda", "La véranda"),
        ("relax_inn_seaview_suite", "Villa suite", "La suite"),
    ],
    "KST-RAK-003": [
        ("sepulchral_chapel_rotunda", "Rotunda", "La rotonde"),
        ("historic_cloister_passage", "Arcades", "Les arcades"),
        ("indoor_pool", "Spa", "Le spa"),
        ("entrance_hall", "Salon", "Le salon"),
    ],
    "KST-RAK-004": [
        ("lonely_road_afternoon", "Valley road", "La route de la vallée"),
        ("waterkloof_farm", "Farmland", "Les terres"),
        ("sabie_tent", "Guest lodge", "Le lodge"),
        ("stone_pines", "The grove", "Le bosquet"),
    ],
    "KST-MEL-001": [
        ("brown_photostudio_03", "Living room", "Le séjour"),
        ("glasshouse_interior", "Winter garden", "Le jardin d'hiver"),
        ("brown_photostudio_04", "Bedroom", "La chambre"),
        ("treetop_balcony", "Balcony", "Le balcon"),
    ],
    "KST-MEL-002": [
        ("music_hall_02", "Grand hall", "Le grand hall"),
        ("ballroom", "Ballroom", "La salle de bal"),
        ("hotel_room", "Room", "La chambre"),
        ("large_corridor", "Corridor", "Le couloir"),
    ],
    "KST-MEL-003": [
        ("sunny_country_road", "Estate road", "Le chemin du domaine"),
        ("straw_rolls_field_01", "The fields", "Les champs"),
        ("lythwood_terrace", "Cellar door terrace", "La terrasse du caveau"),
        ("sabie_tent", "Lodge", "Le lodge"),
    ],
    "KST-MEL-004": [
        ("illovo_beach_balcony", "Ocean deck", "La terrasse océan"),
        ("indoor_pool", "Hot springs", "Les sources chaudes"),
        ("relax_inn_seaview_suite", "Villa suite", "La suite"),
        ("sundowner_deck", "Sunset deck", "La terrasse du couchant"),
    ],
}
