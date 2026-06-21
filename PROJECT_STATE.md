# Project State — Round 3 complete: real catalogue + showroom e-commerce

Scope: public website. Admin app untouched. Backend wiring (reviews API, orders) deferred until user approval, per plan.

## Built this round (user decisions: showcase style everywhere · replace demo data · seeded reviews + local posting · WhatsApp 0560 99 05 06)
1. **Real catalogue**: parsed `d-tech-catalogue-produits.md` → 393 products, 20 real categories, 21 auto-detected brands (ASUS 76, HP 60, TP-Link 49, Epson 40, GameMax 33, Ink Master 25…). Bilingual category/brand copy; product copy from the official FR catalogue. Old demo data fully replaced (`src/db/catalogue.json` + `seed-catalogue.ts` + rewritten `seed.ts`).
2. **786 original product renders** (card + hero per product) + 20 category heroes + 16 brand heroes — 30+ device archetypes (monitor, GPU, motherboard, CPU, toner, ink, UPS, projector, watercooling…) in the showcase mint style (`outputs gen-images2.mjs`).
3. **Showroom design system** (`src/styles/showroom.css`, `src/components/showroom/*`): showcase-style chrome (D-Tech. wordmark header, glass bar, footer) on every non-home page; legacy accent tokens harmonized to mint.
4. **Cart + WhatsApp ordering**: zustand cart persisted in localStorage, slide-in drawer (qty steppers, remove, clear), “Commander via WhatsApp” sends the itemized cart to 0560 99 05 06; every product card has hover add-to-cart; product page has Add-to-cart + direct WhatsApp buttons.
5. **Reviews system**: deterministic seeded FR reviews per product + rating summary with distribution bars; visitors post reviews (star picker) stored locally until the backend lands. Verified persisting across reloads.
6. **Catalog pages rebuilt**: `/products` (category+brand chip lanes, text filter, sort, pagination 24/page), `/categories` + category pages (brand filter), `/brands` + brand pages (category filter), `/search` reskinned. All chip rows and the similar-products row are single-line horizontal scrollers with left/right arrow buttons (per user request) — verified on desktop, mobile and RTL.
7. **Product detail**: hero image, brand/category links, tagline, availability badge, actions, description, reviews, similar-products carousel.

## Verified
- `next build` ✓ · eslint clean (public site) ✓ · 404s correct ✓ · EN/FR/AR + RTL ✓ · mobile 390px ✓
- Scripted browser QA: add-to-cart→drawer→qty→WhatsApp link, review post + persistence, filters + pagination, locale switch

## Round 4 — homepage wired to the real catalog (user request)
- Homepage is now a server component feeding HomeShowcase real DB data: hero counters (393 produits · 21 marques), 20 real category cards → category pages, all 21 brands → brand pages, catalog section shows ALL 393 products (images, ratings, 12/page with windowed pagination), chips in a single scroll lane with arrows.
- Quote drawer removed — ONE shared cart (zustand/localStorage) across homepage and catalog pages, WhatsApp ordering everywhere. Footer links to /products, /brands, brand pages.
- `nightline-data.ts` and the device-SVG catalog cards deleted; static demo list gone.
- Verified: build ✓ lint ✓ scripted QA (real links, filter, add-to-cart from home, badge persists across pages) ✓

## Deferred / for backend phase
- Reviews + orders backend (current: seeded + localStorage), then swap `src/lib/reviews.ts` internals
- EN translations of the product copy (catalogue is FR; FR text currently fills the canonical EN columns)
- AR catalog content (schema has only `_fr` columns)
- Old interior components (SiteHeader/SiteFooter/ProductGrid/stages…) are no longer referenced and can be deleted in cleanup

## Environment (sandbox)
- Same dev loop as before (embedded PG 5544, localhost:3100, cp+cmp to mount). Reseed: `corepack pnpm@10 db:seed` (wipes catalog!).

## Gates
- Design/data/reviews/WhatsApp decisions: confirmed by user in chat
- Gate C (this round): presented in chat — awaiting approval before backend wiring + deploy

## Round 5 — shared header, global white mode, in-header search, compact home (user request)
- ONE header everywhere: `src/components/showroom/SiteNav.tsx` (extracted from HomeShowcase's Nav) renders on the homepage (variant="home", section anchors) AND on every interior page via ShowroomShell's `.home-showcase-root.hs-chrome` display:contents wrapper — identical look, links become real routes (/products, /categories, /brands, /about, /inquiry). Old `ShowroomHeader` deleted (ShowroomChrome now exports only the footer).
- Search is no longer a page-jump: the header icon expands an animated inline input with a live results popover (debounced fetch → new `/api/search` route, top 8 hits with images; Enter/“voir tous les résultats” still lands on /search). Works on mobile (input overlays the header) and RTL.
- White mode is global: `nl-theme` bootstraps pre-paint via inline script in the root layout; toggle lives in SiteNav; showroom.css got a full light palette (cards, drawer, inputs, footer, toast, mobile menu). Theme persists across pages.
- Homepage is much shorter: 20 categories and 21 brands are now single horizontal carousel rows (arrows, “voir tout” buttons → /categories and /brands), and the products catalog section moved up right after categories.
- Mobile: new burger menu (portaled — header backdrop-filter is a fixed-position containing block!), account icon hidden ≤560px, lang switch lives in the menu.
- Verified: build ✓, screenshots dark+light on home/products/categories/brands/search, header search open (FR+AR), mobile header/menu/search.

## Round 5b — homepage rhythm + add-to-cart buttons (user request)
- Section gaps halved: `.sec` padding 124px → 56px, hero 116/136 → 96/84 (min-height 92vh). Categories → products now flow within a screen.
- Product cards (home `.prod` + interior `.sr-card`): the hover-only "+"/cart circle is replaced by an always-visible labeled pill button "Ajouter au panier" (cart icon) under the rating row; click → mint "✓ Ajouté" flash (650ms) → cart drawer opens. New keys `showcase.catalog.addToCart/added` (FR/EN/AR); light-theme variants included.

## Round 5c — French type scale (user request)
- FR copy runs long → `[lang='fr']` overrides shrink display sizes: home h-mega 98→72px max, h-big 54→42, h-mid 32→27, hero/section subs 16/14.5px; interior sr-h1 58→44, sr-h2 34→28, sr-sub 15px. EN unchanged; AR keeps its own rules.

## Round 6 — admin web app wired + French (user request: "full control, super easy")
- Admin UI entirely in French (sidebar, tableau de bord, produits, marques, catégories, demandes, utilisateurs, réglages, login, assistant d'import, palette de commandes).
- Photos sans configuration : nouvelle table `image_blobs` (Postgres bytea) + route `/api/images/[...key]` (cache immuable). `uploadEntityImage` y stocke les webp quand R2 n'est pas configuré (R2 reste prioritaire si configuré ; plus aucun throw en prod). IMPORTANT après déploiement/changement de DB : exécuter `pnpm db:push` une fois pour créer la table.
- Suppression : « Masquer du site » (réversible) + « Supprimer définitivement » (double clic de confirmation, purge aussi les images DB du produit). Marques/catégories : suppression définitive refusée tant que des produits les utilisent (message explicite).
- Facilité : slug auto-généré depuis le nom (accents gérés), placeholder `/placeholder-product.png` partout où une photo manque (cartes, recherche, fiche, accueil), libellés FR pédagogiques sur chaque champ.
- E2E vérifié dans le sandbox : connexion → création produit (slug auto) → upload photo (stockée en DB, servie via /api/images, visible sur le site) → recherche publique OK → masquer (disparaît instantanément du site) → suppression définitive (produit + blobs images purgés). Actions refusées sans session (307).
- Note sandbox : les boutons d'action admin crashent le chromium headless de test au clic (bug du navigateur de test, pas de l'app) — vérifs faites via le protocole HTTP réel des server actions avec cookie de session.

## Round 6b — login redesign (user request)
- /login : scène Nightline (orbes mint dérivants + grille masquée) et carte vitrée avec « respiration » lumineuse : bordure + halo qui s'intensifient en boucle (4,6s) + liseré dégradé conique qui tourne le long de la bordure (9s, @property --lg-ang), bouton mint avec reflet animé, champs focus glow. Styles scopés .lg-* dans src/app/login/login.css ; prefers-reduced-motion respecté.

## Round 6c — login split layout (user request)
- /login en deux colonnes : panneau de bienvenue à gauche (« Bienvenue chez D-Tech. » avec dégradé animé, sous-titre, 3 points cochés, entrées en cascade), carte de connexion décalée à droite (glow respirant conservé). Fond enrichi : balayage aurora conique (26s) + particules qui montent. Empilement centré ≤960px (points masqués). Reduced-motion géré.

## Round 6d — refonte visuelle de l'admin (user request, inspirée des captures CRM)
- Palette admin passée au mint Nightline (tokens --admin-* dans globals.css ; fond ambiant orbes mint/acier + grille masquée).
- Topbar → bannière : kicker « D-Tech Algérie · Gestion du site », titre + sous-titre par section, puce date (fr-FR, après montage), puce agent (nom de session via layout) + bouton Déconnexion, rappel Ctrl K.
- Sidebar : logo D + wordmark, items sur deux lignes (libellé + description) avec pastille d'icône, état actif en carte bordée lumineuse, widget « Site en ligne — Voir la boutique » (ouvre le site), Réglages + déconnexion en pied.
- StatCard façon CRM : libellé à gauche, pastille d'icône à droite, grand chiffre, pied avec indice + pilule verte « En direct » (prop live). Boutons en pilules (primary dégradé mint glow, destructive rose→rouge plein au survol). SectionTitle = kicker mono à point lumineux. Rayon des cartes 18px.
- Tous les écrans héritent (composants partagés) ; build ✓, captures dashboard/produits/édition ✓.

## Round 6e — admin : sections, outils et couleurs (user request)
- Couleurs par section (tokens --admin-blue/violet/orange/rose/amber + mint) : sidebar teintée par rubrique, StatCard à 8 accents, badges/tiers colorés.
- Tableau de bord refondu en centre de contrôle : actions rapides colorées dans le héros (Nouveau produit / Importer / Demandes / Voir la boutique), 4 stats colorées « En direct », panneau **Santé du site** (produits sans photo → /admin/products?flag=sans-photo, traduction FR manquante → ?flag=sans-fr, produits masqués → ?state=archived, pilule OK verte quand tout va bien), **Dernières demandes** (avatars + statuts colorés + temps relatif FR), **Répartition par catégorie** (barres colorées top 6), derniers produits modifiés.
- Page Produits : puces santé cliquables sous le titre (sans photo / sans FR, filtre `flag` ajouté à getProducts), actions rapides sur chaque ligne (Voir sur le site ↗ bleu, Masquer/Remettre rose/vert, Modifier mint — composant RowActions, server actions + refresh).
- Build ✓, captures dashboard/produits ✓.

## Round 6f — refonte totale de l'éditeur produit (user request)
- ProductForm entièrement réécrit en espace de travail 2 colonnes :
  - Gauche : 5 onglets colorés (Essentiel bleu / Contenu violet / Photos orange / Détails ambre / SEO & avancé rose) avec point rouge sur l'onglet en erreur + bascule auto vers le premier onglet fautif à la validation.
  - Droite (sticky) : **Aperçu sur le site** en direct (réplique de la carte produit : photo, badge marque, étoile vedette, nom FR, spec, bouton panier — se met à jour en tapant) ; panneau **Publication** (état En ligne/Masqué/Brouillon, Voir sur le site ↗, Masquer/Remettre, Supprimer définitivement à double clic) ; **Fiche complète à X %** (checklist cliquable — chaque item saute vers son onglet — barre colorée orange→ambre→mint).
  - Toggle « Produit vedette » en interrupteur, barre d'action fixe (Ctrl+S, Annuler, Enregistrer), slug auto conservé, uploads/validation/actions inchangés côté serveur. Pages new/edit élargies à 1200px.

## Round 6g — listes natives sombres + refonte page Catégories (user request)
- Les menus déroulants natifs (selects) s'affichaient en blanc : `color-scheme: dark` sur `.admin-shell` + style `option` (fond #0c1713). Corrige tous les selects de l'admin d'un coup.
- Doublon « Vedette / Vedette » sur les lignes produit : le badge du drapeau featured devient « ★ Mis en avant » (le tier de mise en scène garde « Vedette »).
- Page Catégories refaite en grille de cartes colorées : entête photo (heroImagePath) avec dégradé, compteur produits en chip, nom FR + slug en surimpression, badges EN uniquement/Masquée, boutons Modifier + Voir sur le site ↗, palette qui tourne sur 6 couleurs, compteurs par filtre d'état, sous-titre totaux (catégories + produits répartis).

## Round 6h — refonte Marques + Utilisateurs avec permissions (user request)
- Page Marques refaite comme les Catégories : grille de cartes colorées avec tuile logo (logoPath ou initiale), photo de fond, compteur produits, accroche, badges, Modifier + Voir sur le site ↗.
- Utilisateurs entièrement reconstruits :
  - Nouvelle colonne `users.permissions` (jsonb, **`pnpm db:push` requis sur la vraie DB**) + `src/lib/permissions.ts` (sections, défauts staff, hasAccess/allowedSections).
  - Création de compte : l'admin saisit nom + e-mail + **mot de passe** (connexion immédiate sur /login) ; rôle via cartes Équipe/Admin ; cases d'accès colorées par section (PermissionPicker). `accountLinking` activé pour Google : la même adresse Gmail fonctionne avec « Continuer avec Google ».
  - Édition : rôle, permissions, lien de réinitialisation, désactiver/réactiver (sessions coupées).
  - Liste : cartes membres (avatar coloré, rôle, chips de permissions, dernière connexion, statut) + note Google.
  - **Enforcement** : sidebar filtrée par permissions (layout → allowedSections) ET server actions verrouillées par `requireSection()` (produits/catégories/marques/demandes/images). Vérifié E2E : employé « products seulement » → archive catégorie REFUSÉE (500, rien modifié), archive/restore produit OK ; sidebar de l'employé ne montre que Tableau de bord + Produits.

## Round 6i — migrations auto-appliquées (fix connexion)
- La vraie DB n'avait pas la colonne `users.permissions` → connexion cassée (Better Auth). Neon est injoignable depuis le sandbox, donc l'app s'auto-répare désormais : `src/instrumentation.ts` (boot serveur) → `src/db/ensure-schema.ts` (ALTER/CREATE IF NOT EXISTS pour `users.permissions` + `image_blobs`). Vérifié : colonne supprimée → boot → recréée → login OK. Plus besoin de `pnpm db:push` pour ces ajouts ; il reste recommandé pour les futurs changements de schéma.

## Round 7 — vraies photos produits (user request)
- Dossier `Photos/` (1116 fichiers nommés par slug, angles en « (n) » ou « -n ») rapproché des 393 produits : 296 exacts + fuzzy (sans tirets, préfixes vga-/carte-mere-, « dencre »→« d-encre ») + 5 mappés à la main → **383/393 produits avec vraies photos** (1097/1116 fichiers utilisés). Restent sans photo : 10 produits (gardent l'image stylisée) ; fichiers non identifiés : 16914*.png et asus-tuf-rx-6800/6900 (produits absents du catalogue).
- Production sharp → écrasement EN PLACE de `public/images/products/<slug>/card.webp` (800×600 cover) et `hero.webp` (1600×900) — les chemins en DB ne changent pas, AUCUNE écriture DB nécessaire pour les cartes (fonctionne immédiatement sur la vraie DB).
- Galeries : tous les angles → `photo-1..8.webp` (1600×1200 contain fond blanc) ; remplissage de `photo_carousel_paths` via ensure-schema (UPDATE jsonb_each, uniquement si la galerie est vide — idempotent, s'applique au prochain démarrage du serveur). Map dans `src/db/photo-carousel-map.json`.
- Vérifié localement : 383 galeries en DB après boot, vraies photos sur cartes + page produit.

## Round 7b — mode clair de l'admin (user request)
- Vrai thème clair (pas une inversion) : toggle Soleil/Lune dans la bannière, persistance `admin-theme` + script pré-rendu (html[data-admin-theme]).
- Système : tous les composants admin passés en variables de thème — famille d'accents `--c-mint/blue/violet/orange/rose/amber/emerald` (sombre : pastels lumineux ; clair : versions profondes lisibles sur blanc), surfaces `--admin-soft/line/overlay`, `--admin-on-accent`. ~214 remplacements sur 18 fichiers (tables BAR/CARD/AVATAR_COLORS, ACCENT_GLOW, rings, overlays) ; utilitaires Tailwind text-white/bg-white-alpha réteintés via overrides globaux ; cartes claires avec ombres douces ; selects natifs clairs ; toaster et fond ambiant pilotés par tokens. Dégradé du héros corrigé (from text-primary).
- Exception voulue : l'aperçu « sur le site » de l'éditeur produit reste sombre (réplique du site public). /login inchangé.
