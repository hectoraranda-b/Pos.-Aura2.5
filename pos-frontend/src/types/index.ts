export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface Inventory {
  id: number;
  productId: number;
  quantity: number;
  minStock: number;
  lastMovementAt?: string;
  product?: Product;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  price: string; // Prisma.Decimal serializa como string en JSON
  cost: string;
  categoryId: number;
  category?: Category;
  inventory?: Inventory | null;
  isActive: boolean;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
export type CardPaymentType = 'INTEGRATED' | 'MANUAL';
export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface SaleDetail {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product: Product;
}

export interface Sale {
  id: number;
  folio: string;
  subtotal: string;
  tax: string;
  total: string;
  status: SaleStatus;
  cancelled: boolean;
  paymentMethod: PaymentMethod;
  cardReference?: string | null;
  cardPaymentType?: CardPaymentType | null;
  createdAt: string;
  user?: { id: number; name: string };
  customer?: { id: number; name: string } | null;
  details: SaleDetail[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type CloudProvider = 'LOCAL' | 'GOOGLE_DRIVE' | 'DROPBOX';
export type SyncFrequency = 'DAILY' | 'WEEKLY';

// Coincide con el modelo StoreSettings del backend (registro único / singleton)
export interface StoreSettings {
  id: number;
  businessName: string;
  taxId: string; // RFC
  address: string;
  phone: string;
  ticketMessage: string;
  defaultBreakdownTax: boolean; // desglosar IVA por defecto al abrir el POS
  integratedTerminalEnabled: boolean; // terminal integrada (simulada) vs. manual
  salesGoal: string;
  logoDataUrl: string | null; // logo codificado en base64 (data URL)

  // Respaldo en la nube. El token real NUNCA viaja al frontend una vez
  // guardado; `cloudAccessTokenSet` solo indica si hay uno almacenado.
  cloudProvider: CloudProvider;
  cloudAccessTokenSet: boolean;
  cloudAccountLabel: string | null;
  cloudConnected: boolean;
  cloudAutoSyncEnabled: boolean;
  cloudSyncFrequency: SyncFrequency;
  cloudLastSyncAt: string | null;
  cloudLastSyncStatus: string | null; // "success" | "error: <mensaje>"

  updatedAt?: string;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface ReportSummary {
  period: ReportPeriod;
  from: string;
  to: string;
  salesCount: number;
  totalRevenue: string;
  totalSubtotal: string;
  totalTax: string;
  totalCost: string;
  netProfit: string;
  averageTicket: string;
  salesGoal: string;
  goalProgressPct: number | null;
  byPaymentMethod: Record<string, number>;
}

export type StockRiskLevel = 'critical' | 'warning' | 'ok' | 'unknown';

export interface StockForecastItem {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  avgDailyVelocity: number;
  daysRemaining: number | null;
  riskLevel: StockRiskLevel;
}

export interface DeadStockItem {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  daysSinceLastSale: number | null;
  suggestedDiscountPct: number;
}

export interface AiInsights {
  stockForecast: StockForecastItem[];
  deadStock: DeadStockItem[];
  executiveSummary: string;
}
