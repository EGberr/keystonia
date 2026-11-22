"""Demo actors. Wallets are Anvil's default development accounts (public test keys, local chain only)."""

from __future__ import annotations

# Anvil's default mnemonic ("test test ... junk") derives these accounts; index -> role.
OPERATOR = 0  # platform operator: KYC agent, distributor, admin
TREASURY = 1

ISSUERS = {
    2: {"name": "SCI Montaigne Patrimoine", "country": 250, "kind": "issuer"},
    3: {"name": "Rive Gauche Hospitality SAS", "country": 250, "kind": "issuer"},
    4: {"name": "Belgravia Estates Ltd", "country": 826, "kind": "issuer"},
    5: {"name": "Mayfair Hospitality Ltd", "country": 826, "kind": "issuer"},
    6: {"name": "Dar Zellij SARL", "country": 504, "kind": "issuer"},
    # The New York assets are held through a UK holding: the tokens block U.S. persons (Regulation S).
    7: {"name": "Hudson & Fifth Holdings Ltd", "country": 826, "kind": "issuer"},
    8: {"name": "Palm Signature Holdings", "country": 784, "kind": "issuer"},
    9: {"name": "Yarra Estates Pty Ltd", "country": 36, "kind": "issuer"},
}

ISSUER_FOR_ASSET = {
    **{f"KST-PAR-00{i}": n for i, n in zip(range(1, 5), (2, 3, 3, 2), strict=True)},
    **{f"KST-LON-00{i}": n for i, n in zip(range(1, 5), (4, 5, 4, 5), strict=True)},
    **{f"KST-RAK-00{i}": 6 for i in range(1, 5)},
    **{f"KST-NYC-00{i}": 7 for i in range(1, 5)},
    **{f"KST-DXB-00{i}": 8 for i in range(1, 5)},
    **{f"KST-MEL-00{i}": 9 for i in range(1, 5)},
}

# ISO 3166-1 numeric: FR 250, GB 826, MA 504, AU 36, PT 620, ES 724, DE 276, IT 380, BE 56, AE 784, US 840.
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
