"""Which real-photo panoramas make up each asset's 360° visit (Poly Haven, CC0)."""

# asset -> [(polyhaven id, english label, french label)]
TOURS: dict[str, list[tuple[str, str, str]]] = {
    "KST-NYC-001": [
        ("glasshouse_interior", "Great room", "La grande pièce"),
        ("cayley_interior", "Lounge", "Le salon"),
        ("modern_bathroom", "Bathroom", "La salle de bain"),
        ("hotel_rooftop_balcony", "Terrace", "La terrasse"),
    ],
    "KST-NYC-002": [
        ("vestibule", "Lobby", "Le lobby"),
        ("aft_lounge", "Lounge bar", "Le bar lounge"),
        ("hotel_room", "Suite", "La suite"),
        ("large_corridor", "Gallery", "La galerie"),
    ],
    "KST-NYC-003": [
        ("music_hall_02", "Sales floor", "L'espace de vente"),
        ("large_corridor", "Gallery", "La galerie"),
        ("anniversary_lounge", "Private salon", "Le salon privé"),
        ("aft_lounge", "VIP lounge", "Le salon VIP"),
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
        ("hotel_rooftop_balcony", "Terrace", "La terrasse"),
    ],
    "KST-PAR-002": [
        ("entrance_hall", "Lobby", "Le hall"),
        ("ballroom", "Salon d'honneur", "Le salon d'honneur"),
        ("relax_inn_seaview_suite", "Suite", "La suite"),
        ("country_club", "Salon", "Le salon"),
    ],
    "KST-PAR-003": [
        ("large_corridor", "Gallery", "La galerie"),
        ("vestibule", "Boutique hall", "Le hall de la boutique"),
        ("anniversary_lounge", "Private salon", "Le salon privé"),
        ("entrance_hall", "Fitting salons", "Les salons d'essayage"),
    ],
    "KST-PAR-004": [
        ("lythwood_lounge", "Salon", "Le salon"),
        ("entrance_hall", "Vestibule", "Le vestibule"),
        ("lythwood_room", "Bedroom", "La chambre"),
        ("fireplace", "Library", "La bibliothèque"),
    ],
    "KST-DXB-001": [
        ("pool", "Private pool", "La piscine privée"),
        ("sundowner_deck", "Sunset deck", "La terrasse du couchant"),
        ("relax_inn_seaview_suite", "Master suite", "La suite"),
        ("illovo_beach_balcony", "Sea balcony", "Le balcon sur la mer"),
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
        ("aft_lounge", "Dining room", "La salle"),
        ("wooden_lounge", "Lounge", "Le salon"),
        ("country_club", "Private room", "Le salon privé"),
        ("sundowner_deck", "Terrace", "La terrasse"),
    ],
    "KST-LON-001": [
        ("lythwood_lounge", "Drawing room", "Le salon"),
        ("lythwood_room", "Bedroom", "La chambre"),
        ("anniversary_lounge", "Study", "Le bureau"),
        ("lythwood_terrace", "Garden", "Le jardin"),
    ],
    "KST-LON-002": [
        ("country_club", "Lobby", "Le lobby"),
        ("ballroom", "Ballroom", "La salle de bal"),
        ("hotel_room", "Room", "La chambre"),
        ("wooden_lounge", "Bar", "Le bar"),
    ],
    "KST-LON-003": [
        ("brown_photostudio_03", "Living room", "Le séjour"),
        ("fireplace", "Sitting room", "Le petit salon"),
        ("brown_photostudio_04", "Bedroom", "La chambre"),
        ("lythwood_terrace", "Garden", "Le jardin"),
    ],
    "KST-LON-004": [
        ("large_corridor", "Gallery", "La galerie"),
        ("music_hall_02", "Salon", "Le salon"),
        ("vestibule", "Hall", "Le hall"),
        ("ballroom", "Members' dining", "La salle du club"),
    ],
    "KST-RAK-001": [
        ("historic_cloister_passage", "Gallery", "La galerie"),
        ("sepulchral_chapel_rotunda", "Hammam", "Le hammam"),
        ("pool", "Patio pool", "Le bassin du patio"),
        ("sundowner_deck", "Roof terrace", "La terrasse"),
    ],
    "KST-RAK-002": [
        ("pool", "Pool", "La piscine"),
        ("sundowner_deck", "Sunset deck", "La terrasse du couchant"),
        ("relax_inn_seaview_suite", "Villa suite", "La suite"),
        ("stone_pines", "Gardens", "Les jardins"),
    ],
    "KST-RAK-003": [
        ("sepulchral_chapel_rotunda", "Rotunda", "La rotonde"),
        ("historic_cloister_passage", "Arcades", "Les arcades"),
        ("indoor_pool", "Spa", "Le spa"),
        ("entrance_hall", "Salon", "Le salon"),
    ],
    "KST-RAK-004": [
        ("stone_pines", "The grove", "Le bosquet"),
        ("sunny_country_road", "Estate road", "Le chemin du domaine"),
        ("lythwood_terrace", "Guest house", "La maison d'hôtes"),
        ("sundowner_deck", "Valley deck", "La terrasse sur la vallée"),
    ],
    "KST-MEL-001": [
        ("brown_photostudio_03", "Living room", "Le séjour"),
        ("glasshouse_interior", "Winter garden", "Le jardin d'hiver"),
        ("brown_photostudio_04", "Bedroom", "La chambre"),
        ("hotel_rooftop_balcony", "Sky terrace", "La terrasse"),
    ],
    "KST-MEL-002": [
        ("music_hall_02", "Grand hall", "Le grand hall"),
        ("ballroom", "Ballroom", "La salle de bal"),
        ("hotel_room", "Room", "La chambre"),
        ("large_corridor", "Corridor", "Le couloir"),
    ],
    "KST-MEL-003": [
        ("sunny_country_road", "Estate road", "Le chemin du domaine"),
        ("stone_pines", "The grounds", "Le parc"),
        ("lythwood_terrace", "Cellar door terrace", "La terrasse du caveau"),
        ("sundowner_deck", "Tasting deck", "La terrasse de dégustation"),
    ],
    "KST-MEL-004": [
        ("illovo_beach_balcony", "Ocean deck", "La terrasse océan"),
        ("indoor_pool", "Hot springs", "Les sources chaudes"),
        ("relax_inn_seaview_suite", "Villa suite", "La suite"),
        ("sundowner_deck", "Sunset deck", "La terrasse du couchant"),
    ],
}
