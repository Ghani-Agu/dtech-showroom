# Logos clients — `/company`, section « Ils nous ont fait confiance »

Ces cartes fonctionnent **exactement comme le mur des marques** : une tuile
pleine dans la couleur du client, le logo détouré en blanc par-dessus.

## ⚠️ Il faut la version BLANCHE (monochrome) du logo

C'est le point important. `BrandMarkArt` affiche les marques distribuées en
`currentColor` sur une tuile colorée — même principe ici. Un logo en
quadrichromie posé sur une tuile colorée jure. Presque toutes les marques
publient une version blanche / mono pour ce cas précis ; c'est celle-là.

Si vous n'avez que la version couleur, envoyez-la quand même — on la
convertit, ou on passe la tuile en blanc pour ce client-là.

## Dépôt

Déposez le fichier ici, puis déclarez-le dans
`src/components/editorial/client-marks.tsx` :

```ts
{ slug: 'djezzy', name: 'Djezzy', word: 'Djezzy',
  tile: '#E20613', fg: '#ffffff', glow: '#FF2A38',
  logo: '/images/clients/djezzy.svg' }   // ← la seule ligne à ajouter
```

Noms de fichiers attendus (le `slug` de chaque entrée) :

| fichier | client |
|---|---|
| `mobilis.svg` | Mobilis |
| `djezzy.svg` | Djezzy |
| `algerie-telecom.svg` | Algérie Télécom |
| `cpa.svg` | Crédit Populaire d’Algérie |
| `opgi.svg` | OPGI |
| `bab-ezzouar.svg` | Bab Ezzouar Centre Commercial |

**Format.** SVG de préférence (net à toutes les tailles, poids minime).
Sinon PNG à fond **transparent**, hauteur ≈ 120 px (la tuile l'affiche à
40 px, on garde 3× pour les écrans Retina). Jamais de JPG : son fond blanc
ferait un rectangle visible sur la tuile.

**Recadrage.** Rognez au plus près du logo, sans marge autour — la tuile gère
son propre espacement. Un logo avec 30 % de vide intégré paraîtra deux fois
plus petit que ses voisins.

Tant qu'un fichier est absent, la tuile affiche un mot-symbole typographique —
comme MERCUSYS, HIKSEMI ou GAME REVOLUTION dans le mur des marques. Rien ne
casse.

Ces marques appartiennent à leurs propriétaires ; elles sont affichées ici
pour identifier des clients de D-tech.
