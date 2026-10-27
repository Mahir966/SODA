export type FlavorId = 'classic' | 'blue';

export const ASSET_BASE_URL =
  'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d';

export const ASSETS = {
  LEAVES_GLB: `${ASSET_BASE_URL}/leaves.glb`,
  CHERRY_GLB: `${ASSET_BASE_URL}/cherry.glb`,
  BLUEBERRY_GLB: `${ASSET_BASE_URL}/blueberry.glb`,
  DEIT_SODA2_GLB: `${ASSET_BASE_URL}/deit_soda2.glb`,
  GREEN_SODA_PNG: `${ASSET_BASE_URL}/Green%20Soda.png`,
  BLUE_SODA_PNG: `${ASSET_BASE_URL}/Blue%20Soda.png`,
  GREEN_BASE_COLOR_JPG: `${ASSET_BASE_URL}/green%20base%20color.jpg`,
  BLUE_BASE_COLOR_JPG: `${ASSET_BASE_URL}/blue%20base%20color.jpg`,
  BUBBLE_PNG: `${ASSET_BASE_URL}/bubble.png`,
} as const;

export interface FlavorSpec {
  id: FlavorId;
  name: string;
  tagline: string;
  unitPrice: number;
  image: string;
  textureUrl: string;
  berryGlb: string;
  themeColors: {
    inner: string;
    mid: string;
    outer: string;
  };
  copy: string;
  chips: string[];
  meters: {
    label: string;
    value: number;
  }[];
  pairings: string;
}

export const FLAVORS: Record<FlavorId, FlavorSpec> = {
  classic: {
    id: 'classic',
    name: 'Diet Classic',
    tagline: 'Cherry · Classic',
    unitPrice: 2.99,
    image: ASSETS.GREEN_SODA_PNG,
    textureUrl: ASSETS.GREEN_BASE_COLOR_JPG,
    berryGlb: ASSETS.CHERRY_GLB,
    themeColors: {
      inner: '#0b8a78',
      mid: '#044e3b',
      outer: '#011411',
    },
    copy: 'Dark cherry up front, a soft vanilla middle and a clean, dry finish. The one that started it all.',
    chips: ['Dark cherry', 'Vanilla', 'Crisp finish'],
    meters: [
      { label: 'Sweetness', value: 62 },
      { label: 'Fizz', value: 78 },
      { label: 'Tartness', value: 35 },
      { label: 'Fruit', value: 84 },
    ],
    pairings: 'burgers, popcorn, late-night movies.',
  },
  blue: {
    id: 'blue',
    name: 'Zero Lime',
    tagline: 'Lime · Zero',
    unitPrice: 2.99,
    image: ASSETS.BLUE_SODA_PNG,
    textureUrl: ASSETS.BLUE_BASE_COLOR_JPG,
    berryGlb: ASSETS.BLUEBERRY_GLB,
    themeColors: {
      inner: '#0b4f8a',
      mid: '#04294e',
      outer: '#010c14',
    },
    copy: 'Zesty Persian lime with a hint of blueberry and an ice-cold, mineral snap. Built for hot days.',
    chips: ['Persian lime', 'Blueberry', 'Mineral snap'],
    meters: [
      { label: 'Sweetness', value: 44 },
      { label: 'Fizz', value: 90 },
      { label: 'Tartness', value: 72 },
      { label: 'Fruit', value: 66 },
    ],
    pairings: 'tacos, sushi, the first warm day of spring.',
  },
};

export type PackSizeId = 'single' | 'pack6' | 'pack12' | 'pack24';

export interface PackOption {
  id: PackSizeId;
  label: string;
  cans: number;
  price: number;
  badge?: string;
}

export const PACK_OPTIONS: PackOption[] = [
  {
    id: 'single',
    label: 'Single Can (330ml)',
    cans: 1,
    price: 2.99,
  },
  {
    id: 'pack6',
    label: '6-Pack Sampler',
    cans: 6,
    price: 16.49,
    badge: 'Save 8%',
  },
  {
    id: 'pack12',
    label: '12-Pack Fridge Box',
    cans: 12,
    price: 29.99,
    badge: 'Popular · Save 16%',
  },
  {
    id: 'pack24',
    label: '24-Pack Case',
    cans: 24,
    price: 52.99,
    badge: 'Best Value · Save 26%',
  },
];

export interface CartItem {
  key: string; // `${flavorId}-${packId}`
  flavorId: FlavorId;
  packId: PackSizeId;
  quantity: number;
}

export const PROMO_CODES: Record<
  string,
  { code: string; discountPercent: number; freeShipping?: boolean; description: string }
> = {
  REFRESH10: {
    code: 'REFRESH10',
    discountPercent: 10,
    description: '10% off your entire order',
  },
  PUREZERO: {
    code: 'PUREZERO',
    discountPercent: 15,
    description: '15% off Pure Zero launch discount',
  },
  FREESHIP: {
    code: 'FREESHIP',
    discountPercent: 0,
    freeShipping: true,
    description: 'Complimentary express shipping',
  },
};

export interface ReviewItem {
  id: string;
  author: string;
  avatar: string;
  flavorId: FlavorId;
  rating: number;
  text: string;
  date: string;
  helpfulCount: number;
}

export const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'Maya R.',
    avatar: 'M',
    flavorId: 'classic',
    rating: 5,
    text: "Tastes like the real thing without the 3 pm crash. I've swapped my afternoon cola completely.",
    date: '2 days ago',
    helpfulCount: 24,
  },
  {
    id: 'rev-2',
    author: 'Jonah P.',
    avatar: 'J',
    flavorId: 'blue',
    rating: 5,
    text: 'Zero Lime is dangerously good. The fizz actually lasts until the bottom of the can.',
    date: '5 days ago',
    helpfulCount: 19,
  },
  {
    id: 'rev-3',
    author: 'Aisha K.',
    avatar: 'A',
    flavorId: 'classic',
    rating: 4,
    text: 'Not too sweet, which is exactly what I wanted. The cherry is subtle and natural.',
    date: '1 week ago',
    helpfulCount: 12,
  },
  {
    id: 'rev-4',
    author: 'Luca B.',
    avatar: 'L',
    flavorId: 'blue',
    rating: 5,
    text: "Love that it's just a can — no plastic rings. Tastes great and I feel good recycling it.",
    date: '2 weeks ago',
    helpfulCount: 16,
  },
  {
    id: 'rev-5',
    author: 'Sofia T.',
    avatar: 'S',
    flavorId: 'blue',
    rating: 5,
    text: 'My go-to mixer now. Lime plus a squeeze of fresh mint is ridiculous.',
    date: '3 weeks ago',
    helpfulCount: 31,
  },
  {
    id: 'rev-6',
    author: 'Daniel O.',
    avatar: 'D',
    flavorId: 'classic',
    rating: 5,
    text: 'The design alone got me to try it. The taste is why I keep buying it.',
    date: '1 month ago',
    helpfulCount: 27,
  },
];

export const FAQ_ITEMS = [
  {
    q: 'Is Soda really 0 calories and 0g sugar?',
    a: 'Yes. Every 330ml can of Diet Classic and Zero Lime contains 0 calories, 0g sugar, and 0g net carbs, sweetened naturally with cold-extracted stevia leaf (Reb-M) and real fruit essence.',
  },
  {
    q: 'Does Soda contain caffeine or artificial preservatives?',
    a: 'Never. Both Diet Classic and Zero Lime are 100% caffeine-free and formulated without aspartame, sucralose, phosphoric acid, or artificial dyes.',
  },
  {
    q: 'How does free delivery on 12-packs and 24-packs work?',
    a: 'Any order reaching $29.99 or more (including a single 12-Pack Fridge Box or 24-Pack Case) automatically qualifies for free carbon-neutral ground shipping.',
  },
  {
    q: 'Are the cans BPA-free and infinitely recyclable?',
    a: 'Every can, lid, and tab is crafted from 73% post-consumer recycled aluminum with a plant-based BPA-NI internal lining, and can return to shelves in as little as 60 days after recycling.',
  },
];
