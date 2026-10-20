/**
 * OPENBOUTIK — TYPESCRIPT INTERFACES POUR LE FRONTEND DEV 2 (@akhy-m00)
 * Dépôt : `openboutik-seller` (Port local : 3001)
 * Couvre : Espace Marchand SaaS (`VENDOR`), Store Builder & Back-Office Super-Admin (`SUPER_ADMIN`)
 * Zéro type `any` — Strict Mode — 100% aligné sur NestJS et Prisma (`openboutik-api`)
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

export type EscrowStatus =
  | 'PENDING_PAYMENT'
  | 'HELD_IN_ESCROW'
  | 'RELEASED_TO_VENDOR'
  | 'REFUNDED_TO_CLIENT'
  | 'FROZEN_BY_DISPUTE';

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED_REFUND_CLIENT'
  | 'RESOLVED_RELEASE_VENDOR';

export type ArbitrateDecision = 'REFUND_CLIENT' | 'RELEASE_VENDOR';

export type PayoutStatus = 'PENDING' | 'PROCESSED' | 'REJECTED';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY';

export type DeliveryMethod = 'TIAK_TIAK' | 'PICKUP';

export type CouponType = 'PERCENTAGE' | 'FIXED_FCFA';

export type NegotiationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTER_OFFERED'
  | 'EXPIRED';

export type VendorNegotiationAction = 'ACCEPT' | 'REJECT' | 'COUNTER_OFFER';

export type StreamType = 'LIVE_STREAM' | 'SHORT_VIDEO';

export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

export type UploadCategory =
  | 'KYC_DOCUMENT'
  | 'STREAM_MEDIA'
  | 'PRODUCT_IMAGE'
  | 'SHOP_BANNER';

// ==============================================================================
// 2. ENVELOPPES API STANDARD
// ==============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success?: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: string[];
  timestamp?: string;
}

// ==============================================================================
// 3. AUTHENTIFICATION & ONBOARDING VENDEUR (ÉTAPES 1 À 5)
// ==============================================================================

export interface RegisterVendorPayload {
  phone: string;
  fullName: string;
  email?: string;
  password: string;
  acceptTerms: boolean;
}

export interface CheckSlugResponse {
  available: boolean;
  slug: string;
  reason?: string;
  suggestion?: string;
}

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
// 4. GESTION DU CATALOGUE, DES VARIANTES & DES STOCKS
// ==============================================================================

export interface CreateProductPayload {
  name: string;
  description?: string;
  priceFcfa: number;
  compareAtPriceFcfa?: number;
  stock: number;
  lowStockThreshold?: number;
  categoryId?: string;
  images: string[];
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string | null;
  priceFcfa: number;
  compareAtPriceFcfa?: number | null;
  stock: number;
  attributes: Record<string, string>;
  isActive: boolean;
}

export interface CreateVariantPayload {
  sku?: string;
  priceFcfa: number;
  compareAtPriceFcfa?: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface UpdateProductLayoutItem {
  productId: string;
  displayOrder: number;
  isFeatured?: boolean;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  slug: string;
  currentStock: number;
  threshold: number;
  isLowStock: boolean;
}

// ==============================================================================
// 5. STORE BUILDER, ABONNEMENTS SAAS, ESSAI 30J, DUNNING 72H & SPONSORS
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
}

export interface ReactivateSubscriptionPayload {
  plan: 'PRO' | 'PREMIUM';
}

export interface DunningAlertInfo {
  isPastDue: boolean;
  subscriptionStatus: SubscriptionStatus;
  retryCount: number;
  gracePeriodEndsAt?: string | null;
  warningMessage?: string | null;
}

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

export interface UpdateShopSponsorPayload extends Partial<CreateShopSponsorPayload> {
  isActive?: boolean;
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
  salesMetrics: {
    totalCommissionSavedFcfa: number;
    totalRevenueFcfa: number;
    ordersCount: number;
    salesByChannel: {
      marketplaceRevenueFcfa: number;
      subdomainRevenueFcfa: number;
      customDomainRevenueFcfa: number;
    };
  };
  inventoryHealth: {
    totalProducts: number;
    lowStockAlertsCount: number;
    outOfStockCount: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    priceFcfa: number;
    viewsCount: number;
    salesVolume: number;
  }>;
}

// ==============================================================================
// 6. COMMANDES MARCHAND, OTP TIAK-TIAK, MÉMOS & PORTEFEUILLE
// ==============================================================================

export interface VendorOrderSummary {
  id: string;
  orderNumber: string;
  clientId: string;
  clientFullName?: string;
  clientPhone?: string;
  status: OrderStatus;
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  discountAmountFcfa: number;
  totalAmountFcfa: number;
  commissionAmountFcfa: number;
  netVendorAmountFcfa: number;
  salesChannel: SalesChannel;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryCity?: string | null;
  deliveryPhone: string;
  deliveryNotes?: string | null;
  deliveryConfirmationCode?: string | null;
  invoiceUrl?: string | null;
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
  content: string;
}

export interface OrderNoteRecord {
  id: string;
  orderId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

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

export interface TopupWalletPayload {
  amountFcfa: number;
  provider: PaymentProvider;
  phoneNumber: string;
}

export interface RequestPayoutPayload {
  amountFcfa: number;
  provider: PaymentProvider;
  recipientPhone: string;
}

export interface SubmitVendorKycPayload {
  idCardNumber: string;
  idCardUrl: string;
}

// ==============================================================================
// 7. MARKETING, MODE VACANCES, WAKHALE VENDEUR, LIVE SHOPPING & ANALYTICS
// ==============================================================================

export interface SetVacationPayload {
  isOnVacation: boolean;
  vacationMessage?: string;
}

export interface CreateCouponPayload {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmountFcfa?: number;
  maxUses?: number;
  expiresAt?: string;
}

export interface CouponRecord extends CreateCouponPayload {
  id: string;
  shopId: string;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface RespondNegotiationVendorPayload {
  action: VendorNegotiationAction;
  counterPriceFcfa?: number;
}

export interface CreateStreamPayload {
  title: string;
  description?: string;
  type: StreamType;
  mediaUrl: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
  productIds: string[];
}

export interface TopProductAnalyticsItem {
  productId: string;
  name: string;
  totalRevenueFcfa: number;
  totalUnitsSold: number;
  totalViews: number;
  conversionRate: number;
}

// ==============================================================================
// 8. BACK-OFFICE SUPER-ADMIN (`SUPER_ADMIN`)
// ==============================================================================

export interface EscrowOverviewResponse {
  totalHeldInEscrowFcfa: number;
  totalFrozenByDisputeFcfa: number;
  totalReleasedToVendorsFcfa: number;
  totalRefundedToClientsFcfa: number;
  totalPlatformCommissionsFcfa: number;
  activeEscrowOrdersCount: number;
  openDisputesCount: number;
}

export interface AdminDisputeRecord {
  id: string;
  orderId: string;
  openedByUserId: string;
  reason: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionNotes?: string | null;
  resolvedByAdminId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  order?: VendorOrderSummary;
}

export interface ArbitrateDisputePayload {
  decision: ArbitrateDecision;
  resolutionNotes: string;
}

export interface AdminReviewVendorKycPayload {
  status: 'VERIFIED' | 'REJECTED';
  verifyShopBadge?: boolean;
  adminNotes?: string;
}

export interface AdminVerifyShopPayload {
  isVerified: boolean;
  notes?: string;
}

export interface AdminReviewBuyerBnplKycPayload {
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

export interface AdminPayoutRecord {
  id: string;
  walletId: string;
  amountFcfa: number;
  provider: PaymentProvider;
  recipientPhone: string;
  status: PayoutStatus;
  providerReference?: string | null;
  createdAt: string;
}

export interface SecureViewResponse {
  expiringUrl: string;
  validitySeconds: number;
}
