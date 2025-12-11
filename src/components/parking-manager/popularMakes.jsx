// Approximate list of top passenger vehicle brands in the US.
// We treat this as a curated list that can be adjusted over time.

export const POPULAR_US_MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'Nissan',
  'Hyundai',
  'Kia',
  'Subaru',
  'Jeep',
  'GMC',
  'Ram',
  'Volkswagen',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Lexus',
  'Mazda',
  'Dodge',
  'Chrysler',
  'Buick',
  'Cadillac',
  'Lincoln',
  'Volvo',
  'Acura',
  'Infiniti',
  'Tesla',
  'Mitsubishi',
  'Mini',
  'Alfa Romeo',
  'Genesis',
];

// Normalize make name for comparison
export function normalizeMakeName(name) {
  return name.toLowerCase().trim();
}

// Check if a make is in the popular list
export function isPopularMake(makeName) {
  const normalized = normalizeMakeName(makeName);
  return POPULAR_US_MAKES.some(popular => normalizeMakeName(popular) === normalized);
}

// Get the last N years for filtering
export function getLastNYears(n = 20) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < n; i++) {
    years.push(currentYear - i);
  }
  return years;
}