/**
 * OPENBOUTIK — TYPESCRIPT INTERFACES POUR LE FRONTEND DEV 2 (@akhy-m00)
 * Fichier prêt à l'emploi pour Next.js (Espace Vendeur, Store Builder & SaaS)
 * Zéro type `any` — Strict Mode — 100% aligné sur NestJS et Prisma
 */

// ==============================================================================
// 1. ENUMS GLOBALES
// ==============================================================================

export type Role = 'CLIENT' | 'VENDOR' | 'SUPER_ADMIN';

export type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED_DOWNGRADED'
  | 'EXPIRED'
  | 'CANCELLED';

export type BillingAttemptStatus =
  | 'SUCCESS'
  | 'FAILED_INSUFFICIENT_FUNDS'
  | 'MANUAL_REACTIVATION';

export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type SalesChannel = 'MARKETPLACE' | 'SUBDOMAIN' | 'CUSTOM_DOMAIN';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID_ESCROW'
  | 'PREPARING'
  | 'SHIPPED_TIAK_TIAK'
  | 'DELIVERED_CONFIRMED'
  | 'COMPLETED_RELEASED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY';

export type DeliveryMethod = 'TIAK_TIAK' | 'STORE_PICKUP';

// ==============================================================================
// 2. ENVELOPPES API STANDARD
// ==============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

// ==============================================================================
// 3. STORE BUILDER & THÈME DYNAMIQUE
// ==============================================================================

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  bannerStyle?: 'FULL_WIDTH' | 'CONTAINED' | 'MINIMAL';
  bannerUrl?: string;
  logoUrl?: string;
  faviconUrl?: string;
  slogan?: string;
  announcementBarText?: string;
  announcementBarEnabled?: boolean;
  wakhaleEnabled?: boolean;
  showSponsors?: boolean;
  layoutGridColumns?: number;
  customCss?: string;
  [key: string]: unknown;
}

export interface SaveShopThemePayload extends ThemeConfig {
  // Accepte tous les attributs du thème
}

// ==============================================================================
// 4. ABONNEMENTS SAAS, ESSAI 30J & DUNNING
// ==============================================================================

export interface SubscriptionPlanDetails {
  plan: SubscriptionPlan;
  name: string;
  priceFcfa: number;
  commissionRate: number;
  subdomainEnabled: boolean;
  features: string[];
}

export interface StartTrialPayload {
  plan: 'PRO' | 'PREMIUM';
}

export interface StartTrialResult {
  message: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subdomainEnabled: boolean;
  trialEndsAt: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    hasUsedFreeTrial: boolean;
  };
}

export interface ReactivateSubscriptionPayload {
  plan: 'PRO' | 'PREMIUM';
}

export interface SubscriptionBillingLog {
  id: string;
  shopId: string;
  plan: SubscriptionPlan;
  amountFcfa: number;
  attemptNumber: number;
  status: BillingAttemptStatus;
  failureReason?: string | null;
  walletBalanceBeforeFcfa: number;
  walletBalanceAfterFcfa: number;
  createdAt: string;
}

export interface DunningAlertInfo {
  isPastDue: boolean;
  subscriptionStatus: SubscriptionStatus;
  retryCount: number;
  gracePeriodEndsAt?: string | null;
  warningMessage?: string | null;
}

// ==============================================================================
// 5. SPONSORS & PARTENAIRES DE BOUTIQUE
// ==============================================================================

export interface ShopSponsor {
  id: string;
  shopId: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
  description?: string | null;
  badgeText?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShopSponsorPayload {
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  description?: string;
  badgeText?: string;
  displayOrder?: number;
}

export interface UpdateShopSponsorPayload {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  badgeText?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ==============================================================================
// 6. DASHBOARD VENDEUR 360°
// ==============================================================================

export interface SalesChannelMetrics {
  marketplaceRevenueFcfa: number;
  subdomainRevenueFcfa: number;
  customDomainRevenueFcfa: number;
}

export interface SalesMetrics {
  totalCommissionSavedFcfa: number;
  totalRevenueFcfa: number;
  ordersCount: number;
  salesByChannel: SalesChannelMetrics;
}

export interface InventoryHealth {
  totalProducts: number;
  lowStockAlertsCount: number;
  outOfStockCount: number;
}

export interface TopProductMetric {
  id: string;
  name: string;
  priceFcfa: number;
  viewsCount: number;
  salesVolume: number;
}

export interface VendorDashboard360 {
  shop: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    isVerified: boolean;
    kycStatus: KycStatus;
    whatsappNumber?: string | null;
    isOnVacation: boolean;
    vacationMessage?: string | null;
  };
  subscriptionAndDomain: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    commissionRate: number;
    subdomain: string;
    subdomainUrl: string;
    subdomainEnabled: boolean;
    customDomain?: string | null;
    customDomainVerified: boolean;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
    dunningAlert: DunningAlertInfo;
  };
  wallet: {
    availableBalanceFcfa: number;
    escrowBalanceFcfa: number;
    kycStatus: KycStatus;
  };
  salesMetrics: SalesMetrics;
  inventoryHealth: InventoryHealth;
  topProducts: TopProductMetric[];
}

// ==============================================================================
// 7. PORTEFEUILLE & KYC MARCHAND
// ==============================================================================

export interface VendorWallet {
  id: string;
  shopId: string;
  availableBalanceFcfa: number;
  escrowBalanceFcfa: number;
  kycStatus: KycStatus;
  waveNumber?: string | null;
  omNumber?: string | null;
  freeMoneyNumber?: string | null;
  payoutHolderName?: string | null;
}

export interface RequestPayoutPayload {
  amountFcfa: number;
  provider: PaymentProvider;
  recipientPhone: string;
}

export interface SubmitKycPayload {
  idCardNumber: string;
  idCardUrl: string;
}

// ==============================================================================
// 8. GESTION DES COMMANDES MARCHAND
// ==============================================================================

export interface VendorOrderSummary {
  id: string;
  orderNumber: string;
  clientId: string;
  clientFullName: string;
  clientPhone: string;
  status: OrderStatus;
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  discountAmountFcfa: number;
  totalAmountFcfa: number;
  netVendorAmountFcfa: number;
  salesChannel: SalesChannel;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  deliveryNotes?: string | null;
  deliveryConfirmationCode?: string | null;
  invoiceUrl: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceFcfa: number;
    totalPriceFcfa: number;
    variantAttributes?: Record<string, string> | null;
  }>;
  createdAt: string;
}

export interface ConfirmDeliveryOtpPayload {
  confirmationCode: string;
}

export interface CreateOrderNotePayload {
  text: string;
}

// ==============================================================================
// 9. ONBOARDING VENDEUR
// ==============================================================================

export interface OnboardingStatusResponse {
  hasShop: boolean;
  onboardingStep: number;
  onboardingCompleted: boolean;
  shop?: Record<string, unknown> | null;
  checklist: {
    hasCompletedOnboarding: boolean;
    hasAddedFirstProduct: boolean;
    isKycVerified: boolean;
  };
}

export interface SaveOnboardingStepPayload {
  name?: string;
  slug?: string;
  mainCategory?: string;
  city?: string;
  description?: string;
  primaryColor?: string;
  logoUrl?: string;
  bannerUrl?: string;
  whatsappNumber?: string;
  waveNumber?: string;
  omNumber?: string;
  payoutHolderName?: string;
  plan?: SubscriptionPlan;
  skip?: boolean;
}

// ==============================================================================
// 10. MODE VACANCES
// ==============================================================================

export interface SetVacationPayload {
  isOnVacation: boolean;
  vacationMessage?: string;
}
