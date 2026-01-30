import { IsotonixProduct } from '../types';

// Static dataset of Isotonix products
// Structured to support remote fetch in future versions
export const ISOTONIX_PRODUCTS: IsotonixProduct[] = [
  {
    id: 'iso-001',
    name: 'Isotonix OPC-3',
    category: 'Antioxidant',
    description: 'Powerful antioxidant supplement with grape seed, pine bark, and bilberry extracts',
  },
  {
    id: 'iso-002',
    name: 'Isotonix Multivitamin',
    category: 'Multivitamin',
    description: 'Complete daily multivitamin with essential vitamins and minerals',
  },
  {
    id: 'iso-003',
    name: 'Isotonix Vitamin D with K2',
    category: 'Vitamin',
    description: 'Supports bone health and immune function',
  },
  {
    id: 'iso-004',
    name: 'Isotonix Calcium Plus',
    category: 'Mineral',
    description: 'Calcium supplement for bone and muscle health',
  },
  {
    id: 'iso-005',
    name: 'Isotonix B-Complex',
    category: 'Vitamin',
    description: 'Complete B vitamin complex for energy and metabolism',
  },
  {
    id: 'iso-006',
    name: 'Isotonix Magnesium',
    category: 'Mineral',
    description: 'Supports muscle relaxation and nervous system health',
  },
  {
    id: 'iso-007',
    name: 'Isotonix Digestive Enzymes',
    category: 'Digestive Health',
    description: 'Supports healthy digestion and nutrient absorption',
  },
  {
    id: 'iso-008',
    name: 'Isotonix Activated B-Complex',
    category: 'Vitamin',
    description: 'Activated forms of B vitamins for enhanced absorption',
  },
  {
    id: 'iso-009',
    name: 'Isotonix Vitamin C',
    category: 'Vitamin',
    description: 'Immune support and antioxidant protection',
  },
  {
    id: 'iso-010',
    name: 'Isotonix CoQ10',
    category: 'Antioxidant',
    description: 'Supports heart health and cellular energy production',
  },
  {
    id: 'iso-011',
    name: 'Isotonix Resveratrol',
    category: 'Antioxidant',
    description: 'Anti-aging antioxidant from grape skin extract',
  },
  {
    id: 'iso-012',
    name: 'Isotonix Omega III',
    category: 'Essential Fatty Acids',
    description: 'Fish oil supplement for heart and brain health',
  },
  {
    id: 'iso-013',
    name: 'Isotonix Bromelain Plus',
    category: 'Digestive Health',
    description: 'Enzyme supplement for digestive and joint support',
  },
  {
    id: 'iso-014',
    name: 'Isotonix Iron Plus',
    category: 'Mineral',
    description: 'Gentle iron supplement with vitamin C for absorption',
  },
  {
    id: 'iso-015',
    name: 'Isotonix Prenatal Activated Multivitamin',
    category: 'Prenatal',
    description: 'Complete prenatal vitamin with folate and DHA',
  },
  {
    id: 'iso-016',
    name: 'Isotonix Maximum ORAC Formula',
    category: 'Antioxidant',
    description: 'High ORAC antioxidant blend from superfruits',
  },
  {
    id: 'iso-017',
    name: 'Isotonix Immune',
    category: 'Immune Support',
    description: 'Immune system support with vitamin C, zinc, and elderberry',
  },
  {
    id: 'iso-018',
    name: 'Isotonix Astaxanthin',
    category: 'Antioxidant',
    description: 'Powerful carotenoid antioxidant for skin and eye health',
  },
  {
    id: 'iso-019',
    name: 'Isotonix Isochrome',
    category: 'Blood Sugar Support',
    description: 'Supports healthy blood sugar levels already in normal range',
  },
  {
    id: 'iso-020',
    name: 'Isotonix Acai Advanced Energy',
    category: 'Energy',
    description: 'Natural energy support with acai and green tea',
  },
];

// Search function for products
export const searchIsotonixProducts = (query: string): IsotonixProduct[] => {
  const lowerQuery = query.toLowerCase();
  return ISOTONIX_PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.category.toLowerCase().includes(lowerQuery)
  );
};

// Get product by ID
export const getIsotonixProductById = (id: string): IsotonixProduct | undefined => {
  return ISOTONIX_PRODUCTS.find((product) => product.id === id);
};
