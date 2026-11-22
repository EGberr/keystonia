"""Demo actors. Wallets are Anvil's default development accounts (public test keys, local chain only)."""

from __future__ import annotations

# Anvil's default mnemonic ("test test ... junk") derives these accounts; index -> role.
OPERATOR = 0  # platform operator: KYC agent, distributor, admin
TREASURY = 1

ISSUERS = {
    2: {"name": "SCI Lumière Paris", "country": 250, "kind": "issuer"},
    3: {"name": "Marais Hospitality SAS", "country": 250, "kind": "issuer"},
    4: {"name": "Thames Living Ltd", "country": 826, "kind": "issuer"},
    5: {"name": "Shoreditch Estates Ltd", "country": 826, "kind": "issuer"},
    6: {"name": "Dar Zellij SARL", "country": 504, "kind": "issuer"},
    7: {"name": "Atlas Agri Holding", "country": 504, "kind": "issuer"},
    8: {"name": "Tejo Imobiliária Lda", "country": 620, "kind": "issuer"},
    9: {"name": "Comporta Terra Lda", "country": 620, "kind": "issuer"},
}

ISSUER_FOR_ASSET = {
    "KST-PAR-001": 2,
    "KST-PAR-002": 2,
    "KST-PAR-003": 2,
    "KST-PAR-004": 3,
    "KST-PAR-005": 3,
    "KST-PAR-006": 2,
    "KST-LON-001": 4,
    "KST-LON-002": 4,
    "KST-LON-003": 4,
    "KST-LON-004": 5,
    "KST-LON-005": 5,
    "KST-LON-006": 4,
    "KST-RAK-001": 6,
    "KST-RAK-002": 6,
    "KST-RAK-003": 6,
    "KST-RAK-004": 6,
    "KST-RAK-005": 7,
    "KST-RAK-006": 6,
    "KST-LIS-001": 8,
    "KST-LIS-002": 8,
    "KST-LIS-003": 8,
    "KST-LIS-004": 8,
    "KST-LIS-005": 9,
    "KST-LIS-006": 8,
}

# ISO 3166-1 numeric: FR 250, GB 826, MA 504, PT 620, ES 724, DE 276, IT 380, BE 56, AE 784, US 840.
INVESTORS = {
    10: ("Inès Martin", 250),
    11: ("Lucas Bernard", 250),
    12: ("Chloé Dubois", 250),
    13: ("Hugo Lefèvre", 250),
    14: ("Amira Benali", 250),
    15: ("Oliver Hughes", 826),
    16: ("Amelia Clarke", 826),
    17: ("George Patel", 826),
    18: ("Isla Morgan", 826),
    19: ("Youssef El Amrani", 504),
    20: ("Salma Bennani", 504),
    21: ("Karim Tazi", 504),
    22: ("Lina Chraibi", 504),
    23: ("Tiago Ferreira", 620),
    24: ("Beatriz Costa", 620),
    25: ("Rui Almeida", 620),
    26: ("Lucía García", 724),
    27: ("Javier Ruiz", 724),
    28: ("Lena Schmidt", 276),
    29: ("Jonas Weber", 276),
    30: ("Giulia Rossi", 380),
    31: ("Marco Bianchi", 380),
    32: ("Elise Peeters", 56),
    33: ("Omar Haddad", 784),
    34: ("Sofia Romano", 380),
    35: ("Nathan Moreau", 250),
    36: ("Camille Laurent", 250),
    37: ("Henry Walker", 826),
    38: (
        "Ethan Brooks",
        840,
    ),  # US person: KYC'd but blocked by Regulation S on every offering
    39: ("Mia Johnson", 840),
}

DEMO_ACCOUNT = 10  # the profile recruiters land on in demo mode
US = 840
ACCOUNT_COUNT = 40
