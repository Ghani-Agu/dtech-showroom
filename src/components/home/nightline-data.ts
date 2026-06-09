/**
 * Nightline catalogue data — ported from
 * C:\Users\abdel\Downloads\Dtech\showcase-data.jsx.
 */

export type IconKind =
  | 'desktop'
  | 'laptop'
  | 'aio'
  | 'tablet'
  | 'phone'
  | 'print'
  | 'network'
  | 'parts'
  | 'gaming'

export type DeviceKind =
  | 'desktop'
  | 'desktop-mini'
  | 'laptop'
  | 'aio'
  | 'tablet'
  | 'phone'
  | 'feature'
  | 'printer-laser'
  | 'printer-ink'
  | 'copier'
  | 'scanner'
  | 'router'
  | 'mesh'
  | 'switch'
  | 'ap'
  | 'wifi-usb'
  | 'wifi-pci'
  | 'psu'
  | 'case'
  | 'headset'
  | 'mouse'

export interface CategoryDef {
  id: IconKind
  name: string
  short: string
  icon: IconKind
}

export interface BrandDef {
  id: string
  name: string
  cats: string[]
}

export interface ProductDef {
  id: string
  cat: IconKind
  brand: string
  name: string
  spec: string
  price: string
  badge: string | null
  img: DeviceKind
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'desktop', name: 'PC de bureau', short: 'Desktop', icon: 'desktop' },
  { id: 'laptop', name: 'Laptop', short: 'Laptop', icon: 'laptop' },
  { id: 'aio', name: 'All-in-One', short: 'AIO', icon: 'aio' },
  { id: 'tablet', name: 'Tablette', short: 'Tablet', icon: 'tablet' },
  { id: 'phone', name: 'Téléphone', short: 'Phone', icon: 'phone' },
  { id: 'print', name: 'Imprimante & Scanner', short: 'Print', icon: 'print' },
  { id: 'network', name: 'Réseau', short: 'Network', icon: 'network' },
  { id: 'parts', name: 'Composants', short: 'Parts', icon: 'parts' },
  { id: 'gaming', name: 'Gaming', short: 'Gaming', icon: 'gaming' },
]

export const BRANDS: BrandDef[] = [
  { id: 'hp', name: 'HP', cats: ['Laptops', 'Desktops', 'Printers'] },
  { id: 'dell', name: 'Dell', cats: ['OptiPlex', 'Vostro', 'Latitude'] },
  { id: 'lenovo', name: 'Lenovo', cats: ['ThinkCentre All-in-One'] },
  { id: 'asus', name: 'ASUS', cats: ['Wi-Fi adapters', 'TUF Gaming PSU'] },
  { id: 'tplink', name: 'TP-Link', cats: ['Routers, switches, AP'] },
  { id: 'canon', name: 'Canon', cats: ['Printers, scanners, copiers'] },
  { id: 'epson', name: 'Epson', cats: ['Printers, copiers'] },
]

export const PRODUCTS: ProductDef[] = [
  { id: 'p01', cat: 'desktop', brand: 'HP', name: 'HP EliteDesk 800 G9', spec: 'Intel i7-13700 · 16 GB · 512 GB SSD', price: '168 900', badge: 'Pro', img: 'desktop' },
  { id: 'p02', cat: 'desktop', brand: 'HP', name: 'HP ProDesk 400 G9', spec: 'Intel i5-13500 · 8 GB · 256 GB SSD', price: '112 900', badge: null, img: 'desktop' },
  { id: 'p03', cat: 'desktop', brand: 'Dell', name: 'Dell OptiPlex 7010', spec: 'Intel i5-13500 · 16 GB · 512 GB SSD', price: '124 500', badge: null, img: 'desktop' },
  { id: 'p04', cat: 'desktop', brand: 'Dell', name: 'Dell Vostro 3030', spec: 'Intel i3-13100 · 8 GB · 256 GB SSD', price: '82 900', badge: null, img: 'desktop' },
  { id: 'p05', cat: 'desktop', brand: 'Dell', name: 'Dell OptiPlex Micro 3000', spec: 'Intel i5-12500T · 16 GB · 256 GB SSD', price: '118 000', badge: 'Mini', img: 'desktop-mini' },
  { id: 'p06', cat: 'laptop', brand: 'HP', name: 'HP ProBook 450 G10', spec: '15.6″ FHD · i7-1355U · 16 GB · 512 GB', price: '146 900', badge: 'Promo', img: 'laptop' },
  { id: 'p07', cat: 'laptop', brand: 'HP', name: 'HP EliteBook 840 G11', spec: '14″ WUXGA · Core Ultra 7 · 16 GB · 1 TB', price: '218 500', badge: 'New', img: 'laptop' },
  { id: 'p08', cat: 'laptop', brand: 'HP', name: 'HP Pavilion 15-eg', spec: '15.6″ FHD · i5-1335U · 8 GB · 512 GB', price: '94 900', badge: null, img: 'laptop' },
  { id: 'p09', cat: 'laptop', brand: 'Dell', name: 'Dell Latitude 5450', spec: '14″ FHD · Core Ultra 5 · 16 GB · 512 GB', price: '182 900', badge: null, img: 'laptop' },
  { id: 'p10', cat: 'laptop', brand: 'Dell', name: 'Dell Inspiron 15 3530', spec: '15.6″ FHD · i5-1335U · 8 GB · 512 GB', price: '89 500', badge: 'Promo', img: 'laptop' },
  { id: 'p11', cat: 'laptop', brand: 'Dell', name: 'Dell Vostro 14 3430', spec: '14″ FHD · i5-1335U · 8 GB · 256 GB', price: '78 900', badge: null, img: 'laptop' },
  { id: 'p12', cat: 'aio', brand: 'Lenovo', name: 'Lenovo ThinkCentre M70a Gen 3', spec: '21.5″ FHD · i5-12500 · 16 GB · 512 GB SSD', price: '164 900', badge: null, img: 'aio' },
  { id: 'p13', cat: 'aio', brand: 'Lenovo', name: 'Lenovo ThinkCentre neo 30a 24', spec: '23.8″ FHD · i5-13420H · 8 GB · 512 GB SSD', price: '142 900', badge: 'New', img: 'aio' },
  { id: 'p14', cat: 'aio', brand: 'Lenovo', name: 'Lenovo ThinkCentre M90a Gen 5', spec: '23.8″ 2.5K · Core Ultra 7 · 32 GB · 1 TB', price: '248 900', badge: 'Pro', img: 'aio' },
  { id: 'p15', cat: 'aio', brand: 'Lenovo', name: 'Lenovo ThinkCentre neo 50a', spec: '23.8″ FHD · i7-13620H · 16 GB · 512 GB', price: '186 500', badge: null, img: 'aio' },
  { id: 'p16', cat: 'tablet', brand: 'D-Tech', name: 'D-Tab T10 Pro', spec: '10.1″ 2K · Octa-Core · 128 GB · 12 h batterie', price: '38 900', badge: 'New', img: 'tablet' },
  { id: 'p17', cat: 'tablet', brand: 'D-Tech', name: 'D-Tab T8 Lite', spec: '8″ HD · Quad-Core · 64 GB · 8 h batterie', price: '18 500', badge: 'Promo', img: 'tablet' },
  { id: 'p18', cat: 'tablet', brand: 'D-Tech', name: 'D-Tab T11 Edu', spec: '11″ 2K · 128 GB · étui inclus · pour écoles', price: '42 900', badge: null, img: 'tablet' },
  { id: 'p19', cat: 'phone', brand: 'D-Tech', name: 'D-Phone D9 Pro 5G', spec: '6.7″ AMOLED · 5G · 128 GB · Triple cam.', price: '46 900', badge: 'New', img: 'phone' },
  { id: 'p20', cat: 'phone', brand: 'D-Tech', name: 'D-Phone D9 Lite', spec: '6.5″ FHD+ · 4G · 64 GB · 5000 mAh', price: '22 900', badge: null, img: 'phone' },
  { id: 'p21', cat: 'phone', brand: 'D-Tech', name: 'D-Classic 220 Senior', spec: 'Touches larges · Bouton SOS · Dual SIM', price: '4 900', badge: null, img: 'feature' },
  { id: 'p22', cat: 'print', brand: 'Canon', name: 'Canon i-SENSYS MF453dw', spec: 'Laser mono · A4 · réseau · recto-verso · 38 ppm', price: '82 900', badge: 'Pro', img: 'printer-laser' },
  { id: 'p23', cat: 'print', brand: 'Canon', name: 'Canon imageRUNNER 2425', spec: 'MFP A3 · copie · scan · réseau · 25 ppm', price: '298 900', badge: null, img: 'copier' },
  { id: 'p24', cat: 'print', brand: 'Canon', name: 'Canon PIXMA G3470', spec: 'MégaTank couleur · Wi-Fi · sans cartouche', price: '34 900', badge: 'Promo', img: 'printer-ink' },
  { id: 'p25', cat: 'print', brand: 'Canon', name: 'Canon CanoScan LiDE 400', spec: 'Scanner à plat · 4800 dpi · USB-C', price: '14 900', badge: null, img: 'scanner' },
  { id: 'p26', cat: 'print', brand: 'Epson', name: 'Epson EcoTank L3250', spec: "Multifonction couleur · Wi-Fi · réservoir d'encre", price: '29 900', badge: 'Best', img: 'printer-ink' },
  { id: 'p27', cat: 'print', brand: 'Epson', name: 'Epson WorkForce WF-2950', spec: 'MFP couleur · Wi-Fi · ADF · fax', price: '24 500', badge: null, img: 'printer-ink' },
  { id: 'p28', cat: 'print', brand: 'Epson', name: 'Epson WorkForce Pro WF-C5290', spec: 'Pro couleur · réseau · 24 ppm · A4', price: '128 900', badge: null, img: 'printer-laser' },
  { id: 'p29', cat: 'print', brand: 'HP', name: 'HP LaserJet Pro M404dn', spec: 'Laser mono · A4 · réseau · 38 ppm · recto-verso', price: '42 900', badge: null, img: 'printer-laser' },
  { id: 'p30', cat: 'print', brand: 'HP', name: 'HP DeskJet 4220e', spec: "Jet d'encre couleur · Wi-Fi · scan · copie", price: '12 900', badge: 'Promo', img: 'printer-ink' },
  { id: 'p31', cat: 'network', brand: 'TP-Link', name: 'TP-Link Archer AX55', spec: 'Routeur Wi-Fi 6 · AX3000 · 4 ports Gigabit', price: '14 900', badge: null, img: 'router' },
  { id: 'p32', cat: 'network', brand: 'TP-Link', name: 'TP-Link Deco X50 (3-pack)', spec: 'Mesh Wi-Fi 6 · AX3000 · couverture 510 m²', price: '32 500', badge: 'New', img: 'mesh' },
  { id: 'p33', cat: 'network', brand: 'TP-Link', name: 'TP-Link TL-SG108', spec: 'Switch 8 ports Gigabit · plug-and-play', price: '4 200', badge: null, img: 'switch' },
  { id: 'p34', cat: 'network', brand: 'TP-Link', name: 'TP-Link EAP650', spec: 'Access Point Wi-Fi 6 · AX3000 · plafond', price: '18 900', badge: null, img: 'ap' },
  { id: 'p35', cat: 'network', brand: 'TP-Link', name: 'TP-Link Archer T4U Plus', spec: 'Adaptateur USB Wi-Fi · AC1300 · double bande', price: '3 900', badge: 'Promo', img: 'wifi-usb' },
  { id: 'p36', cat: 'network', brand: 'TP-Link', name: 'TP-Link TL-WR841N', spec: 'Routeur basique · 300 Mbps · 4 ports', price: '2 400', badge: null, img: 'router' },
  { id: 'p37', cat: 'parts', brand: 'ASUS', name: 'ASUS PCE-AX58BT', spec: 'Carte PCIe Wi-Fi 6 · BT 5.2 · double antenne', price: '8 900', badge: null, img: 'wifi-pci' },
  { id: 'p38', cat: 'parts', brand: 'ASUS', name: 'ASUS USB-AX55 Nano', spec: 'Adaptateur USB Wi-Fi 6 · AX1800', price: '4 900', badge: 'Promo', img: 'wifi-usb' },
  { id: 'p39', cat: 'parts', brand: 'ASUS', name: 'ASUS TUF Gaming 750W Bronze', spec: 'Alim. modulaire · 80+ Bronze · ventilateur silencieux', price: '14 500', badge: null, img: 'psu' },
  { id: 'p40', cat: 'parts', brand: 'ASUS', name: 'ASUS TUF Gaming 850W Gold', spec: 'Alim. modulaire · 80+ Gold · garantie 10 ans', price: '18 900', badge: 'New', img: 'psu' },
  { id: 'p41', cat: 'gaming', brand: 'ASUS', name: 'ASUS TUF Gaming 1000W Gold', spec: 'Alim. gaming · 80+ Gold · ATX 3.0 · 10 ans', price: '24 900', badge: 'Pro', img: 'psu' },
  { id: 'p42', cat: 'gaming', brand: 'ASUS', name: 'ASUS TUF Gaming GT301', spec: 'Boîtier ATX · panneau verre · 4 ventilos ARGB', price: '16 500', badge: null, img: 'case' },
  { id: 'p43', cat: 'gaming', brand: 'ASUS', name: 'ASUS TUF Gaming H1', spec: 'Casque gaming · 7.1 virtuel · micro détachable', price: '9 900', badge: null, img: 'headset' },
  { id: 'p44', cat: 'gaming', brand: 'ASUS', name: 'ASUS TUF Gaming M3 Gen II', spec: 'Souris gaming · 8000 DPI · RGB · 79 g', price: '4 500', badge: 'Best', img: 'mouse' },
]

export const COUNT_BY_CAT: Record<string, number> = PRODUCTS.reduce(
  (acc, p) => {
    acc[p.cat] = (acc[p.cat] || 0) + 1
    return acc
  },
  {} as Record<string, number>
)
