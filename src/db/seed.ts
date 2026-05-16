import { db } from './client'
import {
  brands,
  categories,
  products,
  inquiries,
  type NewBrand,
  type NewCategory,
  type NewProduct,
} from './schema'

try {
  process.loadEnvFile?.('.env.local')
} catch {
  // .env.local may not exist
}

const brandSeed: NewBrand[] = [
  {
    slug: 'hp',
    name: 'HP',
    statement: 'Hardware that earns its place on the desk.',
    description:
      "HP's premium business and consumer lines anchor the catalog. From the OMEN gaming flagship to the EliteBook business range, HP builds for people who care how the machine is made.",
    heroImagePath: '/images/brands/hp/hero.webp',
    logoPath: '/images/brands/hp/logo.svg',
    sortOrder: 1,
  },
  {
    slug: 'dell',
    name: 'Dell',
    statement:
      'Built for the people whose work makes other work possible.',
    description:
      "Dell's XPS, Latitude, and Inspiron lines cover the catalog's professional spine. Engineered for serious work and serious workloads, designed without flourish.",
    heroImagePath: '/images/brands/dell/hero.webp',
    logoPath: '/images/brands/dell/logo.svg',
    sortOrder: 2,
  },
  {
    slug: 'asus',
    name: 'ASUS',
    statement:
      'Engineering for the people who care about the inside of the machine.',
    description:
      "ASUS spans workstation, gaming, and networking with equal commitment to thermal design and component selection. The Zenbook, ROG, and Vivobook lines anchor this brand's catalog presence.",
    heroImagePath: '/images/brands/asus/hero.webp',
    logoPath: '/images/brands/asus/logo.svg',
    sortOrder: 3,
  },
  {
    slug: 'tp-link',
    name: 'TP-Link',
    statement: 'Networks that disappear, then deliver.',
    description:
      'TP-Link builds the routers, mesh systems, and switches that quietly do the work of moving data. Restrained industrial design, considered for spaces where the network should be felt and not seen.',
    heroImagePath: '/images/brands/tp-link/hero.webp',
    logoPath: '/images/brands/tp-link/logo.svg',
    sortOrder: 4,
  },
  {
    slug: 'dtech',
    name: 'Dtech',
    statement:
      'Made by Dtech, for the people who built this catalog with us.',
    description:
      'The in-house line. USB drives, cables, peripherals, and accessories selected and produced by Dtech Algérie. Mass-market essentials, considered as carefully as the flagships.',
    heroImagePath: '/images/brands/dtech/hero.webp',
    logoPath: '/images/brands/dtech/logo.svg',
    sortOrder: 5,
  },
]

const categorySeed: NewCategory[] = [
  {
    slug: 'laptops',
    name: 'Laptops',
    description:
      'Laptops, sorted by intent. Work, play, mobility, performance. Each one is a decision someone made before it arrived here.',
    heroImagePath: '/images/categories/laptops/hero.webp',
    sortOrder: 1,
  },
  {
    slug: 'networking',
    name: 'Networking',
    description:
      'Routers, mesh systems, switches, and access points. The infrastructure layer of every space that needs to move data well.',
    heroImagePath: '/images/categories/networking/hero.webp',
    sortOrder: 2,
  },
  {
    slug: 'storage',
    name: 'Storage',
    description:
      'External drives, flash memory, memory cards. The portable layer of the catalog — what you carry, what you save, what you move between machines.',
    heroImagePath: '/images/categories/storage/hero.webp',
    sortOrder: 3,
  },
  {
    slug: 'mobile',
    name: 'Mobile',
    description:
      'Smartphones from the manufacturers Dtech distributes. Each handset is presented with the materiality it deserves.',
    heroImagePath: '/images/categories/mobile/hero.webp',
    sortOrder: 4,
  },
  {
    slug: 'tablets',
    name: 'Tablets',
    description:
      'Tablets for work, study, and reading. The form factor that sits between phone and laptop.',
    heroImagePath: '/images/categories/tablets/hero.webp',
    sortOrder: 5,
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description:
      'Cables, chargers, hubs, peripherals. The supporting cast of the catalog — items that complete the machines.',
    heroImagePath: '/images/categories/accessories/hero.webp',
    sortOrder: 6,
  },
]

type SeedProduct = Omit<
  NewProduct,
  'brandId' | 'categoryId' | 'createdAt' | 'updatedAt' | 'id'
> & {
  brandSlug: string
  categorySlug: string
}

function paths(slug: string, tier: 'hero' | 'featured' | 'longtail') {
  const base = `/images/products/${slug}`
  const out: Pick<
    NewProduct,
    'cardImagePath' | 'heroImagePath' | 'glbModelPath' | 'photoCarouselPaths'
  > = {
    cardImagePath: `${base}/card.webp`,
    heroImagePath: `${base}/hero.webp`,
    glbModelPath: null,
    photoCarouselPaths: [],
  }
  // glbModelPath stays referenced in the data for the future R3F phase,
  // even though Path Z does not consume it. The field is dormant, not
  // broken — no component reads it in Phase 5a.
  if (tier === 'hero' || tier === 'featured') {
    out.glbModelPath = `/models/${slug}.glb`
  }
  if (tier === 'featured') {
    out.photoCarouselPaths = [
      `${base}/hero.webp`,
      `${base}/angle-2.webp`,
      `${base}/angle-3.webp`,
    ]
  }
  if (tier === 'longtail') {
    out.photoCarouselPaths = [
      `${base}/hero.webp`,
      `${base}/angle-2.webp`,
    ]
  }
  return out
}

const productSeed: SeedProduct[] = [
  // ───────── HERO (5) ─────────
  {
    slug: 'hp-omen-16-i9-rtx-4070',
    name: 'HP OMEN 16',
    tagline:
      'Sixteen inches, two-forty hertz, eight billion transistors per frame.',
    description:
      "The OMEN 16 is HP's gaming flagship, engineered around a 16-inch QHD+ panel running at 240Hz with NVIDIA's RTX 4070 mobile GPU and an Intel i9-13900HX. The chassis is built for sustained load — vapor chamber cooling, two intake fans, four exhaust vents.\n\nThis is the machine for the person who picks the work, not the machine. Dtech carries the configuration that matters: 32GB DDR5, 1TB NVMe, the panel and GPU that make the rest of the spec sheet honest.",
    cardSpec: '16-inch · i9-13900HX · RTX 4070',
    brandSlug: 'hp',
    categorySlug: 'laptops',
    tier: 'hero',
    featured: true,
    specs: {
      Processor: 'Intel Core i9-13900HX',
      Graphics: 'NVIDIA RTX 4070 8GB',
      Display: '16-inch QHD+ 240Hz',
      Memory: '32GB DDR5',
      Storage: '1TB NVMe SSD',
      Battery: '83 Wh',
      Weight: '2.4 kg',
    },
    searchKeywords:
      'hp omen 16 gaming laptop notebook i9 rtx 4070 240hz qhd nvidia intel',
    sortOrder: 1,
    ...paths('hp-omen-16-i9-rtx-4070', 'hero'),
  },
  {
    slug: 'dell-xps-16-9640',
    name: 'Dell XPS 16',
    tagline:
      'The professional flagship. Engineered for the people who do the work.',
    description:
      "Dell's largest XPS sits at the intersection of creative workstation and serious laptop. Sixteen inches of OLED, the Intel Core Ultra 9 platform with on-die NPU, and an RTX 4070 to handle anything the panel can display.\n\nThe XPS line has earned its position by refusing to be flashy. The chassis is machined aluminum and woven glass fiber. The keyboard is edge-to-edge. The trackpad is haptic. Nothing in the spec sheet is there for show.",
    cardSpec: '16-inch · Core Ultra 9 · RTX 4070',
    brandSlug: 'dell',
    categorySlug: 'laptops',
    tier: 'hero',
    featured: true,
    specs: {
      Processor: 'Intel Core Ultra 9 185H',
      Graphics: 'NVIDIA RTX 4070 8GB',
      Display: '16.3-inch OLED 3.5K touch',
      Memory: '32GB LPDDR5x',
      Storage: '1TB NVMe SSD',
      Battery: '99.5 Wh',
      Weight: '2.13 kg',
    },
    searchKeywords:
      'dell xps 16 9640 oled creator workstation laptop notebook core ultra rtx',
    sortOrder: 2,
    ...paths('dell-xps-16-9640', 'hero'),
  },
  {
    slug: 'asus-zenbook-duo-2024',
    name: 'ASUS Zenbook Duo',
    tagline: 'Two screens. One machine. A new way to think about the laptop.',
    description:
      'The Zenbook Duo answers a question the industry has been circling for years: what if the second monitor was always there? Two 14-inch OLED panels, hinged, with a detachable keyboard. The whole assembly weighs less than 1.7 kg.\n\nThe Core Ultra 9 platform handles the dual-display compute load gracefully. Each screen is calibrated, Dolby Vision certified, and runs at 120Hz. The kickstand is built into the chassis.',
    cardSpec: '14-inch dual OLED · Core Ultra 9',
    brandSlug: 'asus',
    categorySlug: 'laptops',
    tier: 'hero',
    featured: true,
    specs: {
      Processor: 'Intel Core Ultra 9 185H',
      Graphics: 'Intel Arc integrated',
      Display: 'Dual 14-inch 3K OLED 120Hz',
      Memory: '32GB LPDDR5x',
      Storage: '1TB NVMe SSD',
      Battery: '75 Wh',
      Weight: '1.65 kg',
    },
    searchKeywords:
      'asus zenbook duo dual screen oled laptop notebook core ultra two display',
    sortOrder: 3,
    ...paths('asus-zenbook-duo-2024', 'hero'),
  },
  {
    slug: 'tp-link-deco-be95',
    name: 'TP-Link Deco BE95',
    tagline:
      'Quad-band WiFi 7 mesh. Built to disappear into the home, designed to deliver.',
    description:
      "The Deco BE95 is the top of the WiFi 7 mesh range. Four bands, BE33000 combined throughput, 10 Gigabit and 2.5 Gigabit ports per node. A three-pack covers roughly 7,200 square feet.\n\nIndustrial design that matches the brand's quieter philosophy — matte white cylinders that hide on a shelf. The app handles configuration; the hardware handles the rest.",
    cardSpec: 'Quad-band · BE33000 · 4-pack',
    brandSlug: 'tp-link',
    categorySlug: 'networking',
    tier: 'hero',
    featured: true,
    specs: {
      Standard: 'WiFi 7 (802.11be)',
      Bands: 'Quad-band',
      Throughput: 'BE33000 combined',
      Ports: '2× 10GbE, 2× 2.5GbE per node',
      Coverage: 'Up to 9,500 sq ft (4-pack)',
      Antennas: '12 internal per node',
    },
    searchKeywords:
      'tp-link tplink deco be95 wifi 7 mesh router quad-band be33000 10gbe network',
    sortOrder: 4,
    ...paths('tp-link-deco-be95', 'hero'),
  },
  {
    slug: 'apple-iphone-15-pro',
    name: 'Apple iPhone 15 Pro',
    tagline:
      "Titanium. A17 Pro. The flagship of the catalog's mobile range.",
    description:
      "The iPhone 15 Pro moves from stainless steel to titanium and from Lightning to USB-C, two of the larger material decisions Apple has made in years. The A17 Pro brings hardware ray tracing and a 3nm process; the camera system gains a longer telephoto.\n\nDtech carries the configurations its customers ask for. The Pro lives at the top of the mobile section and is presented with the materiality the chassis deserves.",
    cardSpec: '6.1-inch · A17 Pro · Titanium',
    brandSlug: 'dtech',
    categorySlug: 'mobile',
    tier: 'hero',
    featured: true,
    specs: {
      Chip: 'Apple A17 Pro (3nm)',
      Display: '6.1-inch Super Retina XDR OLED 120Hz',
      Camera: '48MP main · 12MP ultrawide · 12MP 3× telephoto',
      Storage: '128 / 256 / 512 GB / 1 TB',
      Frame: 'Grade 5 titanium',
      Port: 'USB-C (USB 3)',
    },
    searchKeywords:
      'apple iphone 15 pro titanium a17 smartphone phone mobile usb-c',
    sortOrder: 5,
    ...paths('apple-iphone-15-pro', 'hero'),
  },

  // ───────── FEATURED (10) ─────────
  {
    slug: 'dell-xps-15-9540',
    name: 'Dell XPS 15',
    tagline: 'The fifteen-inch workhorse for the people who pick once.',
    description:
      'The XPS 15 carries the same design language as the 16 in a smaller chassis: OLED option, RTX 4060, Core Ultra 7. The portability tax is small; the productivity payoff is large.\n\nA strong choice for editors, photographers, and developers who need a single machine to do everything.',
    cardSpec: '15-inch OLED · Core Ultra 7 · RTX 4060',
    brandSlug: 'dell',
    categorySlug: 'laptops',
    tier: 'featured',
    featured: true,
    specs: {
      Processor: 'Intel Core Ultra 7 155H',
      Graphics: 'NVIDIA RTX 4060 8GB',
      Display: '15.6-inch OLED 3.5K',
      Memory: '16GB LPDDR5x',
      Storage: '512GB NVMe SSD',
      Weight: '1.86 kg',
    },
    searchKeywords:
      'dell xps 15 9540 oled creator laptop notebook core ultra rtx 4060',
    sortOrder: 6,
    ...paths('dell-xps-15-9540', 'featured'),
  },
  {
    slug: 'dell-inspiron-16-plus',
    name: 'Dell Inspiron 16 Plus',
    tagline: 'Plus-sized productivity. Inspiron pricing.',
    description:
      'The Inspiron 16 Plus pairs a 16:10 3K panel with discrete graphics at a price the XPS does not reach. Aluminum lid, magnesium deck, a quieter cooling solution than the older Inspiron generations.\n\nFor the buyer who wants screen real estate and acceptable graphics without the flagship line.',
    cardSpec: '16-inch · Core Ultra 7 · RTX 4050',
    brandSlug: 'dell',
    categorySlug: 'laptops',
    tier: 'featured',
    featured: false,
    specs: {
      Processor: 'Intel Core Ultra 7 155H',
      Graphics: 'NVIDIA RTX 4050 6GB',
      Display: '16-inch 3K 120Hz',
      Memory: '16GB DDR5',
      Storage: '1TB NVMe SSD',
      Weight: '2.07 kg',
    },
    searchKeywords:
      'dell inspiron 16 plus laptop notebook rtx 4050 productivity',
    sortOrder: 7,
    ...paths('dell-inspiron-16-plus', 'featured'),
  },
  {
    slug: 'asus-vivobook-s-16',
    name: 'ASUS Vivobook S 16',
    tagline: 'The everyday Zenbook, in sixteen inches.',
    description:
      'The Vivobook S 16 puts the OLED panel and Core Ultra platform into a thinner, lighter chassis than the gaming or workstation lines. A reasonable amount of laptop for a reasonable price.\n\nDistinguished by a 16:10 OLED at 120Hz, an extended-life battery, and the brand\'s usual restraint at the keyboard.',
    cardSpec: '16-inch OLED · Core Ultra 9 · 1.5 kg',
    brandSlug: 'asus',
    categorySlug: 'laptops',
    tier: 'featured',
    featured: false,
    specs: {
      Processor: 'Intel Core Ultra 9 185H',
      Graphics: 'Intel Arc integrated',
      Display: '16-inch 3.2K OLED 120Hz',
      Memory: '24GB LPDDR5x',
      Storage: '1TB NVMe SSD',
      Weight: '1.5 kg',
    },
    searchKeywords:
      'asus vivobook s 16 oled core ultra laptop notebook thin light',
    sortOrder: 8,
    ...paths('asus-vivobook-s-16', 'featured'),
  },
  {
    slug: 'asus-rog-strix-g16',
    name: 'ASUS ROG Strix G16',
    tagline: 'Gaming hardware that doesn\'t insist on itself.',
    description:
      'The ROG Strix G16 leaves the RGB to the user — the chassis is darker, the lines are simpler, and the panel runs at 240Hz. RTX 4070, Core i9, MUX switch for direct GPU output.\n\nFor people who want the gaming spec sheet without the spaceship aesthetic.',
    cardSpec: '16-inch 240Hz · i9-14900HX · RTX 4070',
    brandSlug: 'asus',
    categorySlug: 'laptops',
    tier: 'featured',
    featured: true,
    specs: {
      Processor: 'Intel Core i9-14900HX',
      Graphics: 'NVIDIA RTX 4070 8GB',
      Display: '16-inch QHD+ 240Hz',
      Memory: '16GB DDR5',
      Storage: '1TB NVMe SSD',
      Cooling: 'Tri-fan, liquid metal',
    },
    searchKeywords:
      'asus rog strix g16 gaming laptop notebook i9 rtx 4070 240hz',
    sortOrder: 9,
    ...paths('asus-rog-strix-g16', 'featured'),
  },
  {
    slug: 'hp-pavilion-15',
    name: 'HP Pavilion 15',
    tagline: 'The everyday HP for the everyday workload.',
    description:
      'The Pavilion 15 is HP\'s mid-tier all-rounder. Intel Core i7, Iris Xe graphics, 16GB of DDR4. A 15-inch FHD panel in a chassis that is honest about what it is.\n\nNot a flagship. Not pretending to be. A reliable machine for office work, light creative tasks, and home use.',
    cardSpec: '15-inch · Core i7 · 16GB',
    brandSlug: 'hp',
    categorySlug: 'laptops',
    tier: 'featured',
    featured: false,
    specs: {
      Processor: 'Intel Core i7-1355U',
      Graphics: 'Intel Iris Xe',
      Display: '15.6-inch FHD IPS',
      Memory: '16GB DDR4',
      Storage: '512GB NVMe SSD',
      Weight: '1.75 kg',
    },
    searchKeywords:
      'hp pavilion 15 laptop notebook core i7 office productivity',
    sortOrder: 10,
    ...paths('hp-pavilion-15', 'featured'),
  },
  {
    slug: 'hp-elitebook-840-g11',
    name: 'HP EliteBook 840 G11',
    tagline:
      'The business laptop, considered. Built for the buyer who specs in volume.',
    description:
      'The EliteBook 840 G11 is the corporate end of HP\'s lineup. Magnesium chassis, vPro platform, a privacy shutter on the webcam. The keyboard is one of the best in the business segment.\n\nDtech keeps this configuration in stock for the people who order ten at a time.',
    cardSpec: '14-inch · Core Ultra 7 vPro · 16GB',
    brandSlug: 'hp',
    categorySlug: 'laptops',
    tier: 'featured',
    featured: false,
    specs: {
      Processor: 'Intel Core Ultra 7 165U vPro',
      Graphics: 'Intel Graphics',
      Display: '14-inch WUXGA IPS',
      Memory: '16GB DDR5',
      Storage: '512GB NVMe SSD',
      Security: 'Smart card, fingerprint, IR camera',
    },
    searchKeywords:
      'hp elitebook 840 g11 business laptop notebook vpro corporate enterprise',
    sortOrder: 11,
    ...paths('hp-elitebook-840-g11', 'featured'),
  },
  {
    slug: 'tp-link-archer-axe75',
    name: 'TP-Link Archer AXE75',
    tagline: 'The tri-band WiFi 6E router, sized for the apartment.',
    description:
      'The Archer AXE75 brings 6GHz to a price point that doesn\'t require the BE-tier mesh investment. AXE5400 combined throughput, six antennas, a single unit covers most apartments.\n\nFor the buyer who has the right ISP plan and wants the routing hardware to match.',
    cardSpec: 'Tri-band WiFi 6E · AXE5400',
    brandSlug: 'tp-link',
    categorySlug: 'networking',
    tier: 'featured',
    featured: false,
    specs: {
      Standard: 'WiFi 6E (802.11ax)',
      Bands: 'Tri-band (2.4 / 5 / 6 GHz)',
      Throughput: 'AXE5400',
      Ports: '4× Gigabit LAN, 1× Gigabit WAN, USB 3.0',
      Antennas: '6 external',
    },
    searchKeywords:
      'tp-link tplink archer axe75 wifi 6e router tri-band axe5400 6ghz',
    sortOrder: 12,
    ...paths('tp-link-archer-axe75', 'featured'),
  },
  {
    slug: 'tp-link-deco-x60',
    name: 'TP-Link Deco X60',
    tagline: 'The WiFi 6 mesh for the home that doesn\'t need WiFi 7 yet.',
    description:
      'The Deco X60 is the working person\'s mesh: dual-band, AX5400, three-pack covers 7,000 square feet. The same matte-white cylinder design as the BE-tier siblings, at a price closer to the rest of the catalog.\n\nA strong choice for the home that values coverage and reliability over the absolute newest standard.',
    cardSpec: 'Dual-band · AX5400 · 3-pack',
    brandSlug: 'tp-link',
    categorySlug: 'networking',
    tier: 'featured',
    featured: false,
    specs: {
      Standard: 'WiFi 6 (802.11ax)',
      Bands: 'Dual-band',
      Throughput: 'AX5400',
      Coverage: 'Up to 7,000 sq ft (3-pack)',
      Ports: '2× Gigabit per node',
    },
    searchKeywords:
      'tp-link tplink deco x60 wifi 6 mesh router dual-band ax5400',
    sortOrder: 13,
    ...paths('tp-link-deco-x60', 'featured'),
  },
  {
    slug: 'samsung-galaxy-tab-s10-plus',
    name: 'Samsung Galaxy Tab S10+',
    tagline:
      'The Android answer to the iPad Pro. AMOLED, S Pen, full keyboard.',
    description:
      'The Galaxy Tab S10+ pairs a 12.4-inch AMOLED at 120Hz with the Dimensity 9300+ and 12GB of RAM. The S Pen is in the box; the keyboard folio is the natural add-on.\n\nFor the buyer who works in the Android ecosystem and wants tablet hardware that doesn\'t apologize.',
    cardSpec: '12.4-inch AMOLED · S Pen · Dimensity 9300+',
    brandSlug: 'dtech',
    categorySlug: 'tablets',
    tier: 'featured',
    featured: false,
    specs: {
      Chip: 'MediaTek Dimensity 9300+',
      Display: '12.4-inch AMOLED 120Hz',
      Memory: '12GB LPDDR5x',
      Storage: '256 / 512 GB',
      Stylus: 'S Pen (included)',
      Frame: 'Aluminum',
    },
    searchKeywords:
      'samsung galaxy tab s10 plus tablet android amoled s pen dimensity',
    sortOrder: 14,
    ...paths('samsung-galaxy-tab-s10-plus', 'featured'),
  },
  {
    slug: 'apple-ipad-air-13',
    name: 'Apple iPad Air 13',
    tagline: 'The thirteen-inch iPad for the people who don\'t need the Pro.',
    description:
      'The 13-inch iPad Air gives most of the Pro experience — large display, M2 chip, Apple Pencil Pro support — without the ProMotion panel and Thunderbolt. The trade is fair for the buyer who wants the iPad Pro size at the iPad Air spec.\n\nIn aluminum. Available in four finishes.',
    cardSpec: '13-inch · M2 · Apple Pencil Pro',
    brandSlug: 'dtech',
    categorySlug: 'tablets',
    tier: 'featured',
    featured: false,
    specs: {
      Chip: 'Apple M2',
      Display: '13-inch Liquid Retina (60Hz)',
      Memory: '8GB unified',
      Storage: '128 / 256 / 512 GB / 1 TB',
      Stylus: 'Apple Pencil Pro (sold separately)',
      Port: 'USB-C',
    },
    searchKeywords:
      'apple ipad air 13 tablet m2 pencil pro liquid retina ipados',
    sortOrder: 15,
    ...paths('apple-ipad-air-13', 'featured'),
  },

  // ───────── LONGTAIL (15) ─────────
  {
    slug: 'dtech-usbc-cable-1m',
    name: 'Dtech USB-C Cable · 1m',
    tagline: 'A meter of correctly specified cable.',
    description:
      'A meter of USB-C to USB-C cable, rated for 100W power delivery and 10 Gbps data. Braided sleeve, anodized aluminum housings, the right cable for most laptop and tablet charging.\n\nMade by Dtech, sold under the Dtech line.',
    cardSpec: '1m · USB 3.2 Gen 2 · 100W PD',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Length: '1.0 m',
      'Data rate': '10 Gbps (USB 3.2 Gen 2)',
      'Power delivery': '100 W (20V / 5A)',
      Jacket: 'Braided nylon',
      Housing: 'Anodized aluminum',
    },
    searchKeywords:
      'dtech usb-c usbc cable 1m one meter pd power delivery 100w 10gbps',
    sortOrder: 100,
    ...paths('dtech-usbc-cable-1m', 'longtail'),
  },
  {
    slug: 'dtech-usbc-cable-2m',
    name: 'Dtech USB-C Cable · 2m',
    tagline: 'Two meters for the desk that needs the reach.',
    description:
      'The same construction as the 1m, twice the length. USB-C to USB-C, 100W PD, 10 Gbps data, braided jacket.\n\nMade by Dtech.',
    cardSpec: '2m · USB 3.2 Gen 2 · 100W PD',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Length: '2.0 m',
      'Data rate': '10 Gbps (USB 3.2 Gen 2)',
      'Power delivery': '100 W',
      Jacket: 'Braided nylon',
    },
    searchKeywords:
      'dtech usb-c usbc cable 2m two meter pd 100w long cable',
    sortOrder: 101,
    ...paths('dtech-usbc-cable-2m', 'longtail'),
  },
  {
    slug: 'dtech-power-bank-10000',
    name: 'Dtech Power Bank · 10,000 mAh',
    tagline: 'The battery that fits the pocket, sized for a full day.',
    description:
      'Ten thousand milliamp-hours, USB-C in and out, 22.5W output. The capacity that gets a phone to its second charge and a tablet to its first.\n\nMatte black aluminum, single LED gauge, no display.',
    cardSpec: '10,000 mAh · 22.5W · USB-C',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Capacity: '10,000 mAh',
      Output: '22.5 W USB-C PD',
      Input: 'USB-C',
      Weight: '210 g',
      Indicator: '4-step LED',
    },
    searchKeywords:
      'dtech power bank battery portable charger 10000 mah usb-c pd',
    sortOrder: 102,
    ...paths('dtech-power-bank-10000', 'longtail'),
  },
  {
    slug: 'dtech-wireless-mouse-pro',
    name: 'Dtech Wireless Mouse Pro',
    tagline: 'Low-profile mouse for the desk that is already crowded.',
    description:
      'A low-profile wireless mouse, Bluetooth and 2.4 GHz dongle, with a silent click mechanism. The buttons make the input without making the noise.\n\nBuilt for offices and shared spaces.',
    cardSpec: 'Bluetooth + 2.4 GHz · silent click',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Connectivity: 'Bluetooth 5.2 + 2.4 GHz dongle',
      DPI: 'Up to 4000',
      Buttons: '6 (silent left/right)',
      Battery: 'AA · ~18 months',
    },
    searchKeywords:
      'dtech wireless mouse pro silent click bluetooth office',
    sortOrder: 103,
    ...paths('dtech-wireless-mouse-pro', 'longtail'),
  },
  {
    slug: 'dtech-usb-flash-64gb',
    name: 'Dtech USB Flash · 64 GB',
    tagline: 'Sixty-four gigabytes of flash, in a metal sleeve.',
    description:
      'A USB 3.2 flash drive in a small metal housing. 64 GB capacity, sliding cap, keyring loop.\n\nThe least interesting object in the catalog and also one of the most used.',
    cardSpec: '64 GB · USB 3.2 · keyring loop',
    brandSlug: 'dtech',
    categorySlug: 'storage',
    tier: 'longtail',
    featured: false,
    specs: {
      Capacity: '64 GB',
      Interface: 'USB 3.2 Gen 1 (Type-A)',
      'Read speed': 'Up to 150 MB/s',
      Housing: 'Anodized aluminum',
    },
    searchKeywords:
      'dtech usb flash drive 64gb usb 3.2 thumb drive memory stick',
    sortOrder: 104,
    ...paths('dtech-usb-flash-64gb', 'longtail'),
  },
  {
    slug: 'dtech-usb-flash-128gb',
    name: 'Dtech USB Flash · 128 GB',
    tagline:
      'Twice the capacity of the 64. Same anodized sleeve. Same role.',
    description:
      'The 128 GB sibling. Same housing, same interface, the capacity bump for the buyer who carries more.',
    cardSpec: '128 GB · USB 3.2 · keyring loop',
    brandSlug: 'dtech',
    categorySlug: 'storage',
    tier: 'longtail',
    featured: false,
    specs: {
      Capacity: '128 GB',
      Interface: 'USB 3.2 Gen 1 (Type-A)',
      'Read speed': 'Up to 200 MB/s',
      Housing: 'Anodized aluminum',
    },
    searchKeywords:
      'dtech usb flash drive 128gb usb 3.2 thumb drive memory stick',
    sortOrder: 105,
    ...paths('dtech-usb-flash-128gb', 'longtail'),
  },
  {
    slug: 'tp-link-tl-sg108',
    name: 'TP-Link TL-SG108',
    tagline: 'Eight gigabit ports. No software. Plug in, walk away.',
    description:
      'An unmanaged 8-port gigabit switch. Metal housing, fanless, plug-and-play. The kind of network appliance that lives behind the desk and never asks for attention.\n\nThe right answer when the question is "how do I get more ports?"',
    cardSpec: '8-port · Gigabit · unmanaged',
    brandSlug: 'tp-link',
    categorySlug: 'networking',
    tier: 'longtail',
    featured: false,
    specs: {
      Ports: '8× 10/100/1000 Mbps',
      Switching: '16 Gbps non-blocking',
      Housing: 'Steel, fanless',
      Power: 'External 5V adapter',
    },
    searchKeywords:
      'tp-link tplink tl-sg108 8 port gigabit switch unmanaged ethernet',
    sortOrder: 106,
    ...paths('tp-link-tl-sg108', 'longtail'),
  },
  {
    slug: 'tp-link-archer-c80',
    name: 'TP-Link Archer C80',
    tagline: 'The dual-band router for the place that just needs WiFi.',
    description:
      'WiFi 5, AC1900, dual-band, four external antennas. The starter router for small apartments and second locations.\n\nReliable and unfussy.',
    cardSpec: 'WiFi 5 · AC1900 · dual-band',
    brandSlug: 'tp-link',
    categorySlug: 'networking',
    tier: 'longtail',
    featured: false,
    specs: {
      Standard: 'WiFi 5 (802.11ac)',
      Throughput: 'AC1900',
      Antennas: '4 external',
      Ports: '4× Gigabit LAN, 1× Gigabit WAN',
    },
    searchKeywords:
      'tp-link tplink archer c80 wifi 5 router dual-band ac1900 starter',
    sortOrder: 107,
    ...paths('tp-link-archer-c80', 'longtail'),
  },
  {
    slug: 'hp-deskjet-2755e',
    name: 'HP DeskJet 2755e',
    tagline:
      'The honest inkjet. Print, scan, copy. No app needed for what matters.',
    description:
      'A compact home inkjet from HP. WiFi enrollment, mobile printing, the standard tray. The DeskJet 2755e is the all-in-one for the buyer who prints a few pages a week.\n\nLow upfront cost; HP Instant Ink is optional.',
    cardSpec: 'Inkjet · WiFi · print/scan/copy',
    brandSlug: 'hp',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Type: 'Inkjet all-in-one',
      Functions: 'Print · Scan · Copy',
      Connectivity: 'WiFi, USB',
      'Print speed': 'Up to 7.5 ppm (B/W)',
      'Paper tray': '60 sheets',
    },
    searchKeywords:
      'hp deskjet 2755e inkjet printer scanner copier wifi home',
    sortOrder: 108,
    ...paths('hp-deskjet-2755e', 'longtail'),
  },
  {
    slug: 'sandisk-extreme-portable-ssd-1tb',
    name: 'SanDisk Extreme Portable SSD · 1 TB',
    tagline: 'A terabyte that fits in the palm and survives the bag.',
    description:
      'External NVMe SSD, USB 3.2 Gen 2, up to 1050 MB/s read. IP55 dust and water resistance, an aluminum body with a silicone grip.\n\nFor the photographer, videographer, or developer who carries a working library.',
    cardSpec: '1 TB · USB 3.2 Gen 2 · IP55',
    brandSlug: 'dtech',
    categorySlug: 'storage',
    tier: 'longtail',
    featured: false,
    specs: {
      Capacity: '1 TB',
      Interface: 'USB 3.2 Gen 2 (Type-C)',
      'Read speed': 'Up to 1050 MB/s',
      'Write speed': 'Up to 1000 MB/s',
      'Drop resistance': '2 m',
      'IP rating': 'IP55',
    },
    searchKeywords:
      'sandisk extreme portable ssd 1tb external nvme usb-c rugged storage',
    sortOrder: 109,
    ...paths('sandisk-extreme-portable-ssd-1tb', 'longtail'),
  },
  {
    slug: 'logitech-mx-master-3s',
    name: 'Logitech MX Master 3S',
    tagline: 'The mouse the catalog reaches for when the answer is "a mouse".',
    description:
      'Logitech\'s flagship productivity mouse. MagSpeed scroll, quiet clicks, ergonomic shell, multi-device pairing.\n\nThe MX Master is the standard against which other productivity mice are measured.',
    cardSpec: 'Bluetooth / Logi Bolt · MagSpeed scroll',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Connectivity: 'Bluetooth + Logi Bolt USB receiver',
      DPI: '200 to 8000',
      Buttons: '7 customizable',
      Battery: 'Rechargeable USB-C · 70 days',
    },
    searchKeywords:
      'logitech mx master 3s mouse productivity ergonomic bluetooth magspeed',
    sortOrder: 110,
    ...paths('logitech-mx-master-3s', 'longtail'),
  },
  {
    slug: 'jbl-flip-6',
    name: 'JBL Flip 6',
    tagline: 'The portable Bluetooth speaker that earned the shelf.',
    description:
      'IP67 portable Bluetooth speaker with a dual-driver design and a passive radiator on each end. The Flip line has become a defining product of the portable speaker category.\n\nTwelve hours of battery, JBL PartyBoost for chaining multiple units.',
    cardSpec: '20W · IP67 · 12h battery',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Output: '20 W RMS (10W tweeter + 10W woofer)',
      Battery: '12 hours playback',
      Rating: 'IP67 (dust + water)',
      Connectivity: 'Bluetooth 5.1',
      'PartyBoost': 'Yes',
    },
    searchKeywords:
      'jbl flip 6 bluetooth speaker portable waterproof ip67 partyboost',
    sortOrder: 111,
    ...paths('jbl-flip-6', 'longtail'),
  },
  {
    slug: 'anker-65w-charger',
    name: 'Anker 65W GaN Charger',
    tagline: 'Three ports of GaN, sized for the travel pouch.',
    description:
      'A 65W gallium nitride charger with two USB-C ports and one USB-A. Capable of charging most thin-and-light laptops, with enough left over for a phone and a tablet.\n\nThe charger that replaces the three originals in the bag.',
    cardSpec: '65W · 2× USB-C · 1× USB-A · GaN',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      'Total power': '65 W',
      Ports: '2× USB-C PD, 1× USB-A',
      Technology: 'GaN (gallium nitride)',
      Weight: '120 g',
    },
    searchKeywords:
      'anker 65w gan charger usb-c power delivery travel laptop',
    sortOrder: 112,
    ...paths('anker-65w-charger', 'longtail'),
  },
  {
    slug: 'corsair-k70-rgb-pro',
    name: 'Corsair K70 RGB Pro',
    tagline:
      'Mechanical keyboard for the desk that takes typing seriously.',
    description:
      'A full-size mechanical keyboard with Cherry MX Red switches, aluminum top plate, and an 8000Hz polling rate. PBT double-shot keycaps; a detachable USB-C cable.\n\nThe keyboard for the gamer or developer who notices the difference.',
    cardSpec: 'Cherry MX Red · 8000Hz · PBT',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Switches: 'Cherry MX Red',
      'Polling rate': '8000 Hz',
      Keycaps: 'PBT double-shot',
      Frame: 'Anodized aluminum',
      Cable: 'Detachable USB-C',
    },
    searchKeywords:
      'corsair k70 rgb pro mechanical keyboard cherry mx red gaming',
    sortOrder: 113,
    ...paths('corsair-k70-rgb-pro', 'longtail'),
  },
  {
    slug: 'jabra-evolve2-65',
    name: 'Jabra Evolve2 65',
    tagline: 'The headset for the all-day call schedule.',
    description:
      'A wireless on-ear headset with active noise cancellation, a boom microphone, and 37 hours of battery. Built for the calendar that has more meetings than the calendar can hold.\n\nUC-certified, Microsoft Teams variant available.',
    cardSpec: 'Wireless · ANC · 37h battery',
    brandSlug: 'dtech',
    categorySlug: 'accessories',
    tier: 'longtail',
    featured: false,
    specs: {
      Type: 'On-ear wireless headset',
      ANC: 'Active noise cancellation',
      Microphone: 'Boom (retractable)',
      Battery: '37 hours',
      Connectivity: 'Bluetooth 5.0 + USB-A / USB-C dongle',
    },
    searchKeywords:
      'jabra evolve2 65 headset wireless anc microphone meeting calls uc teams',
    sortOrder: 114,
    ...paths('jabra-evolve2-65', 'longtail'),
  },
]

async function main() {
  console.log('Wiping inquiries, products, categories, brands...')
  await db.delete(inquiries)
  await db.delete(products)
  await db.delete(categories)
  await db.delete(brands)

  console.log(`Inserting ${brandSeed.length} brands...`)
  const insertedBrands = await db.insert(brands).values(brandSeed).returning()
  const brandIdBySlug = new Map(insertedBrands.map((b) => [b.slug, b.id]))

  console.log(`Inserting ${categorySeed.length} categories...`)
  const insertedCategories = await db
    .insert(categories)
    .values(categorySeed)
    .returning()
  const categoryIdBySlug = new Map(
    insertedCategories.map((c) => [c.slug, c.id])
  )

  const productRows: NewProduct[] = productSeed.map((p) => {
    const brandId = brandIdBySlug.get(p.brandSlug)
    const categoryId = categoryIdBySlug.get(p.categorySlug)
    if (!brandId) {
      throw new Error(`Brand not found for slug: ${p.brandSlug}`)
    }
    if (!categoryId) {
      throw new Error(`Category not found for slug: ${p.categorySlug}`)
    }
    const {
      brandSlug: _bs,
      categorySlug: _cs,
      ...rest
    } = p
    void _bs
    void _cs
    return { ...rest, brandId, categoryId }
  })

  console.log(`Inserting ${productRows.length} products...`)
  await db.insert(products).values(productRows)

  const byTier = {
    hero: productRows.filter((p) => p.tier === 'hero').length,
    featured: productRows.filter((p) => p.tier === 'featured').length,
    longtail: productRows.filter((p) => p.tier === 'longtail').length,
  }
  console.log(`Done. Tier distribution: ${JSON.stringify(byTier)}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
