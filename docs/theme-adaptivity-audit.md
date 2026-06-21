# Theme-adaptivity audit — `src/components/home/home-showcase.css`

Total hard-coded colour occurrences scanned: **345** → **148 actionable** violations + **197 intentional** (leave).

## Actionable theme-adaptivity violations (the real Phase-2 scope)

| Section | Count |
|---|---|
| A propos | 6 |
| Buttons (shared) | 6 |
| Catalogue (filters) | 3 |
| Catalogue (products) | 12 |
| Categories | 9 |
| Contact | 31 |
| Hero / shared type | 7 |
| Marques | 4 |
| Nav / header | 16 |
| Other | 50 |
| Pagination | 3 |
| Section headers (shared) | 1 |
| **TOTAL** | **148** |

### Detail — all in `home-showcase.css`

| line | literal | section | kind | → use |
|---|---|---|---|---|
| 57 | `rgba(124,224,195,0.16)` | Hero / shared type | mint accent | var(--cyan) |
| 129 | `rgba(124,224,195,0.22)` | Nav / header | mint accent | var(--cyan) |
| 129 | `rgba(58,112,138,0.22)` | Nav / header | steel accent | var(--blue) |
| 131 | `rgba(124,224,195,0.20)` | Nav / header | mint accent | var(--cyan) |
| 131 | `rgba(124,224,195,0.30)` | Nav / header | mint accent | var(--cyan) |
| 146 | `rgba(255,255,255,0.04)` | Nav / header | white surface | color-mix(currentColor) / --bg-* |
| 147 | `rgba(124,224,195,0.10)` | Nav / header | mint accent | var(--cyan) |
| 147 | `rgba(124,224,195,0.40)` | Nav / header | mint accent | var(--cyan) |
| 158 | `rgba(124,224,195,0.30)` | Nav / header | mint accent | var(--cyan) |
| 174 | `rgba(124,224,195,0.18)` | Buttons (shared) | mint accent | var(--cyan) |
| 174 | `rgba(124,224,195,0.22)` | Buttons (shared) | mint accent | var(--cyan) |
| 178 | `rgba(124,224,195,0.30)` | Buttons (shared) | mint accent | var(--cyan) |
| 178 | `rgba(124,224,195,0.34)` | Buttons (shared) | mint accent | var(--cyan) |
| 182 | `rgba(255,255,255,0.55)` | Buttons (shared) | white surface | color-mix(currentColor) / --bg-* |
| 191 | `rgba(124,224,195,0.05)` | Buttons (shared) | mint accent | var(--cyan) |
| 204 | `rgba(124,224,195,0.5)` | Hero / shared type | mint accent | var(--cyan) |
| 208 | `rgba(124,224,195,0.5)` | Other | mint accent | var(--cyan) |
| 209 | `rgba(124,224,195,0.8)` | Other | mint accent | var(--cyan) |
| 215 | `#FFFFFF` | Hero / shared type | hardcoded hex | token |
| 294 | `rgba(255,255,255,0.06)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 339 | `rgba(124,224,195,0.55)` | Other | mint accent | var(--cyan) |
| 380 | `rgba(124,224,195,0.7)` | Other | mint accent | var(--cyan) |
| 397 | `rgba(255,255,255,0.65)` | Section headers (shared) | white surface | color-mix(currentColor) / --bg-* |
| 420 | `rgba(124,224,195,0.0)` | Categories | mint accent | var(--cyan) |
| 420 | `rgba(124,224,195,0.45)` | Categories | mint accent | var(--cyan) |
| 420 | `rgba(124,224,195,0.0)` | Categories | mint accent | var(--cyan) |
| 430 | `rgba(124,224,195,0.25)` | Categories | mint accent | var(--cyan) |
| 437 | `rgba(124,224,195,0.4)` | Categories | mint accent | var(--cyan) |
| 438 | `rgba(124,224,195,0.05)` | Categories | mint accent | var(--cyan) |
| 438 | `rgba(124,224,195,0.01)` | Categories | mint accent | var(--cyan) |
| 439 | `rgba(124,224,195,0.15)` | Categories | mint accent | var(--cyan) |
| 483 | `rgba(255,255,255,0.025)` | Marques | white surface | color-mix(currentColor) / --bg-* |
| 496 | `rgba(124,224,195,0.4)` | Marques | mint accent | var(--cyan) |
| 497 | `rgba(124,224,195,0.04)` | Marques | mint accent | var(--cyan) |
| 517 | `rgba(255,255,255,0.03)` | Catalogue (filters) | white surface | color-mix(currentColor) / --bg-* |
| 525 | `rgba(255,255,255,0.06)` | Catalogue (filters) | white surface | color-mix(currentColor) / --bg-* |
| 529 | `rgba(124,224,195,0.22)` | Catalogue (filters) | mint accent | var(--cyan) |
| 542 | `rgba(255,255,255,0.03)` | Catalogue (products) | white surface | color-mix(currentColor) / --bg-* |
| 542 | `rgba(255,255,255,0.005)` | Catalogue (products) | white surface | color-mix(currentColor) / --bg-* |
| 555 | `rgba(124,224,195,0.35)` | Catalogue (products) | mint accent | var(--cyan) |
| 556 | `rgba(124,224,195,0.10)` | Catalogue (products) | mint accent | var(--cyan) |
| 561 | `rgba(124,224,195,0.10)` | Catalogue (products) | mint accent | var(--cyan) |
| 588 | `rgba(124,224,195,0.28)` | Catalogue (products) | mint accent | var(--cyan) |
| 599 | `rgba(124,224,195,0.5)` | Catalogue (products) | mint accent | var(--cyan) |
| 642 | `rgba(255,255,255,0.72)` | A propos | white surface | color-mix(currentColor) / --bg-* |
| 652 | `rgba(255,255,255,0.03)` | A propos | white surface | color-mix(currentColor) / --bg-* |
| 657 | `rgba(124,224,195,0.4)` | A propos | mint accent | var(--cyan) |
| 657 | `rgba(124,224,195,0.04)` | A propos | mint accent | var(--cyan) |
| 668 | `rgba(124,224,195,0.10)` | A propos | mint accent | var(--cyan) |
| 683 | `rgba(124,224,195,0.5)` | A propos | mint accent | var(--cyan) |
| 690 | `rgba(124,224,195,0.6)` | Other | mint accent | var(--cyan) |
| 710 | `rgba(124,224,195,0.08)` | Contact | mint accent | var(--cyan) |
| 711 | `#0a0a0c` | Contact | hardcoded hex | token |
| 711 | `#0d0e12` | Contact | hardcoded hex | token |
| 743 | `rgba(255,255,255,0.03)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 753 | `rgba(124,224,195,0.04)` | Contact | mint accent | var(--cyan) |
| 754 | `rgba(124,224,195,0.08)` | Contact | mint accent | var(--cyan) |
| 767 | `rgba(124,224,195,0.30)` | Contact | mint accent | var(--cyan) |
| 767 | `rgba(124,224,195,0.30)` | Contact | mint accent | var(--cyan) |
| 770 | `rgba(124,224,195,0.50)` | Contact | mint accent | var(--cyan) |
| 770 | `rgba(124,224,195,0.50)` | Contact | mint accent | var(--cyan) |
| 780 | `rgba(124,224,195,0.7)` | Other | mint accent | var(--cyan) |
| 785 | `rgba(124,224,195,0.5)` | Other | mint accent | var(--cyan) |
| 786 | `rgba(124,224,195,0.8)` | Other | mint accent | var(--cyan) |
| 804 | `rgba(124,224,195,0.5)` | Other | mint accent | var(--cyan) |
| 826 | `rgba(255,255,255,0.78)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 847 | `rgba(124,224,195,0.5)` | Other | mint accent | var(--cyan) |
| 882 | `rgba(124,224,195,0.05)` | Other | mint accent | var(--cyan) |
| 898 | `rgba(255,255,255,0.06)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 900 | `rgba(124,224,195,0.10)` | Other | mint accent | var(--cyan) |
| 907 | `rgba(124,224,195,0.0)` | Other | mint accent | var(--cyan) |
| 907 | `rgba(124,224,195,0.4)` | Other | mint accent | var(--cyan) |
| 907 | `rgba(124,224,195,0.0)` | Other | mint accent | var(--cyan) |
| 935 | `rgba(124,224,195,0.4)` | Marques | mint accent | var(--cyan) |
| 958 | `rgba(255,255,255,0.03)` | Pagination | white surface | color-mix(currentColor) / --bg-* |
| 970 | `rgba(255,255,255,0.06)` | Pagination | white surface | color-mix(currentColor) / --bg-* |
| 976 | `rgba(124,224,195,0.22)` | Pagination | mint accent | var(--cyan) |
| 1004 | `rgba(124,224,195,0.06)` | Contact | mint accent | var(--cyan) |
| 1005 | `#0a0a0c` | Contact | hardcoded hex | token |
| 1005 | `#0c0d11` | Contact | hardcoded hex | token |
| 1110 | `rgba(124,224,195,0.4)` | Other | mint accent | var(--cyan) |
| 1116 | `rgba(124,224,195,0.5)` | Other | mint accent | var(--cyan) |
| 1131 | `rgba(124,224,195,0.7)` | Other | mint accent | var(--cyan) |
| 1137 | `rgba(124,224,195,0.6)` | Other | mint accent | var(--cyan) |
| 1146 | `rgba(124,224,195,0.95)` | Other | mint accent | var(--cyan) |
| 1154 | `rgba(124,224,195,0.4)` | Other | mint accent | var(--cyan) |
| 1161 | `rgba(124,224,195,0.95)` | Other | mint accent | var(--cyan) |
| 1174 | `rgba(124,224,195,0.5)` | Other | mint accent | var(--cyan) |
| 1179 | `rgba(255,255,255,0.55)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1198 | `rgba(124,224,195,0.25)` | Hero / shared type | mint accent | var(--cyan) |
| 1199 | `#13151b` | Hero / shared type | hardcoded hex | token |
| 1199 | `#0a0a0c` | Hero / shared type | hardcoded hex | token |
| 1220 | `rgba(124,224,195,0.35)` | Hero / shared type | mint accent | var(--cyan) |
| 1252 | `rgba(255,255,255,0.04)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1254 | `rgba(124,224,195,0.10)` | Contact | mint accent | var(--cyan) |
| 1256 | `rgba(124,224,195,0.35)` | Contact | mint accent | var(--cyan) |
| 1287 | `rgba(255,255,255,0.03)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1299 | `rgba(124,224,195,0.08)` | Contact | mint accent | var(--cyan) |
| 1303 | `rgba(124,224,195,0.35)` | Contact | mint accent | var(--cyan) |
| 1307 | `rgba(124,224,195,0.12)` | Contact | mint accent | var(--cyan) |
| 1308 | `rgba(124,224,195,0.3)` | Contact | mint accent | var(--cyan) |
| 1313 | `rgba(124,224,195,0.22)` | Contact | mint accent | var(--cyan) |
| 1316 | `rgba(255,255,255,0.02)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1339 | `rgba(124,224,195,0.06)` | Contact | mint accent | var(--cyan) |
| 1459 | `rgba(124,224,195,0.40)` | Other | mint accent | var(--cyan) |
| 1459 | `rgba(124,224,195,0.20)` | Other | mint accent | var(--cyan) |
| 1459 | `rgba(255,255,255,0.18)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1460 | `rgba(124,224,195,0.55)` | Other | mint accent | var(--cyan) |
| 1460 | `rgba(124,224,195,0.28)` | Other | mint accent | var(--cyan) |
| 1460 | `rgba(255,255,255,0.28)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1476 | `rgba(124,224,195,0.30)` | Other | mint accent | var(--cyan) |
| 1476 | `rgba(124,224,195,0.10)` | Other | mint accent | var(--cyan) |
| 1484 | `rgba(74,139,168,0.32)` | Other | steel accent | var(--blue) |
| 1484 | `rgba(74,139,168,0.08)` | Other | steel accent | var(--blue) |
| 1490 | `rgba(255,255,255,0.07)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1490 | `rgba(255,255,255,0.03)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1490 | `rgba(255,255,255,0.01)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1491 | `rgba(255,255,255,0.14)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1496 | `rgba(255,255,255,0.12)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1499 | `rgba(124,224,195,0.06)` | Other | mint accent | var(--cyan) |
| 1510 | `rgba(124,224,195,0.18)` | Other | mint accent | var(--cyan) |
| 1511 | `rgba(58,112,138,0.14)` | Other | steel accent | var(--blue) |
| 1518 | `rgba(255,255,255,0.10)` | Other | white surface | color-mix(currentColor) / --bg-* |
| 1547 | `rgba(255,255,255,0.55)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1582 | `rgba(255,255,255,0.06)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1591 | `rgba(124,224,195,0.5)` | Contact | mint accent | var(--cyan) |
| 1599 | `#0a0a0c` | Contact | hardcoded hex | token |
| 1606 | `rgba(124,224,195,0.35)` | Contact | mint accent | var(--cyan) |
| 1617 | `rgba(255,255,255,0.03)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1618 | `rgba(255,255,255,0.07)` | Contact | white surface | color-mix(currentColor) / --bg-* |
| 1639 | `rgba(124,224,195,0.25)` | Other | mint accent | var(--cyan) |
| 1648 | `rgba(124,224,195,0.10)` | Other | mint accent | var(--cyan) |
| 1676 | `rgba(124,224,195,0.22)` | Other | mint accent | var(--cyan) |
| 1681 | `rgba(124,224,195,0.4)` | Other | mint accent | var(--cyan) |
| 1700 | `rgba(255,255,255,0.03)` | Nav / header | white surface | color-mix(currentColor) / --bg-* |
| 1712 | `rgba(124,224,195,0.16)` | Nav / header | mint accent | var(--cyan) |
| 1714 | `rgba(124,224,195,0.22)` | Nav / header | mint accent | var(--cyan) |
| 2040 | `rgba(255,255,255,0.05)` | Nav / header | white surface | color-mix(currentColor) / --bg-* |
| 2047 | `rgba(124,224,195,0.22)` | Nav / header | mint accent | var(--cyan) |
| 2055 | `rgba(124,224,195,0.06)` | Nav / header | mint accent | var(--cyan) |
| 2062 | `rgba(124,224,195,0.08)` | Nav / header | mint accent | var(--cyan) |
| 2076 | `rgba(124,224,195,0.5)` | Nav / header | mint accent | var(--cyan) |
| 2101 | `#ffffff` | Categories | hardcoded hex | token |
| 2132 | `rgba(124,224,195,0.10)` | Catalogue (products) | mint accent | var(--cyan) |
| 2133 | `rgba(124,224,195,0.38)` | Catalogue (products) | mint accent | var(--cyan) |
| 2138 | `rgba(124,224,195,0.4)` | Catalogue (products) | mint accent | var(--cyan) |
| 2140 | `rgba(124,224,195,0.4)` | Catalogue (products) | mint accent | var(--cyan) |
| 2143 | `#ffffff` | Catalogue (products) | hardcoded hex | token |

## Intentional — not violations (leave as-is)

| Category | Count |
|---|---|
| black shadow/overlay | 26 |
| decorative atmosphere / legacy 3D | 35 |
| light-mode override palette | 56 |
| mask colour | 2 |
| other decorative (glow/gradient stop) | 48 |
| token definitions | 30 |
| **TOTAL** | **197** |

> "Intentional" = black shadows/overlays (theme-neutral depth), `#fff` mask colours, the **token definitions** and the **light-mode override palette** (these *are* the theming system), and the **legacy 3D hero stage + ambient background layers** (decorative, the 3D stage is replaced by the slider). "Actionable" = component surfaces/accents that hard-code white or the Nightline mint/steel instead of a token, so they don't follow custom themes. Hero subtitle + Catégories cards (already fixed) are not in this list.