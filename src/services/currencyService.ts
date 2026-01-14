/**
 * Currency conversion service using exchangerate-api.com
 * Free tier: 1,500 requests/month, no API key required
 */

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const CACHE_KEY_PREFIX = 'currency_rates_';

/**
 * Get cache key for a base currency
 */
const getCacheKey = (baseCurrency: string): string => {
  return `${CACHE_KEY_PREFIX}${baseCurrency.toUpperCase()}`;
};

/**
 * Get cached exchange rates
 */
const getCachedRates = (baseCurrency: string): ExchangeRates | null => {
  try {
    const cacheKey = getCacheKey(baseCurrency);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { rates, timestamp }: CachedRates = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return rates;
  } catch {
    return null;
  }
};

/**
 * Cache exchange rates
 */
const setCachedRates = (baseCurrency: string, rates: ExchangeRates): void => {
  try {
    const cacheKey = getCacheKey(baseCurrency);
    const cached: CachedRates = {
      rates,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Fetch exchange rates from API
 */
const fetchExchangeRates = async (baseCurrency: string): Promise<ExchangeRates> => {
  const response = await fetch(`${EXCHANGE_RATE_API}/${baseCurrency.toUpperCase()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }

  const data = await response.json();
  return data as ExchangeRates;
};

/**
 * Get exchange rates (from cache or API)
 */
export const getExchangeRates = async (baseCurrency: string): Promise<ExchangeRates> => {
  // Try cache first
  const cached = getCachedRates(baseCurrency);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const rates = await fetchExchangeRates(baseCurrency);
  setCachedRates(baseCurrency, rates);
  return rates;
};

/**
 * Convert amount from one currency to another
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  const rates = await getExchangeRates(fromCurrency);
  const rate = rates.rates[toCurrency.toUpperCase()];

  if (!rate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`);
  }

  return amount * rate;
};

/**
 * Get exchange rate between two currencies
 */
export const getExchangeRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

  const rates = await getExchangeRates(fromCurrency);
  const rate = rates.rates[toCurrency.toUpperCase()];

  if (!rate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`);
  }

  return rate;
};

/**
 * Format currency amount
 */
export const formatCurrency = (
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Common currencies for selection
 */
export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
];
