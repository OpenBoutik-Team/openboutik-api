/**
 * OPENBOUTIK — TYPESCRIPT INTERFACES POUR LE FRONTEND DEV 1 (@mansss7)
 * Fichier prêt à l'emploi pour Next.js (App Router, Strict Mode)
 * Zéro type `any` — Alignement 100% avec Prisma et NestJS
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
  | 'HELD_ESCROW'
  | 'RELEASED_TO_VENDOR'
  | 'REFUNDED_TO_CLIENT'
  | 'FROZEN_BY_DISPUTE';

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY';

export type DeliveryMethod = 'TIAK_TIAK' | 'STORE_PICKUP';

export type CouponType = 'PERCENTAGE' | 'FIXED_FCFA';

export type NegotiationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTER_OFFERED'
  | 'EXPIRED';

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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ==============================================================================
// 3. AUTHENTIFICATION & UTILISATEUR
// ==============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  fullName: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
  acceptedTermsAt?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

// ==============================================================================
// 4. RÉSOLUTION MULTI-TENANT & VITRINE DÉDIÉE
// ==============================================================================

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  bannerStyle?: 'FULL_WIDTH' | 'CONTAINED' | 'MINIMAL';
  wakhaleEnabled?: boolean;
  slogan?: string;
  showSponsors?: boolean;
  customCss?: string;
  [key: string]: unknown;
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
}

export interface ShopStorefrontInfo {
  id: string;
  name: string;
  slug: string;
  slogan?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  whatsappNumber?: string | null;
  announcementBarEnabled: boolean;
  announcementBarText?: string | null;
  themeConfig?: ThemeConfig | null;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subdomainEnabled: boolean;
  customDomain?: string | null;
  customDomainVerified: boolean;
}

export interface StorefrontActiveResponse {
  subdomainActive: true;
  themeConfig?: ThemeConfig | null;
  shop: ShopStorefrontInfo;
  sponsors: ShopSponsor[];
  featuredProducts: ProductSummary[];
  products: ProductSummary[];
}

export interface StorefrontRedirectResponse {
  subdomainActive: false;
  redirectToMarketplace: true;
  reason: 'PLAN_FREE_NO_SUBDOMAIN' | 'SUBDOMAIN_SUSPENDED';
  marketplaceUrl: string;
  redirectMarketplaceUrl: string;
  shopBasicInfo: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    mainCategory?: string | null;
  };
}

export type StorefrontResolution =
  | StorefrontActiveResponse
  | StorefrontRedirectResponse;

// ==============================================================================
// 5. CATALOGUE & PRODUITS
// ==============================================================================

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

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceFcfa: number;
  compareAtPriceFcfa?: number | null;
  stock: number;
  lowStockThreshold?: number;
  images: string[];
  isFeatured?: boolean;
  displayOrder?: number;
  shop?: {
    id: string;
    name: string;
    slug: string;
    isVerified: boolean;
    primaryColor?: string | null;
    whatsappNumber?: string | null;
  };
  variants?: ProductVariant[];
}

export interface ProductDetail extends ProductSummary {
  category?: CategorySummary | null;
  reviews?: ProductReview[];
  averageRating?: number;
  totalReviews?: number;
  viewsCount?: number;
}

export interface ProductReview {
  id: string;
  productId: string;
  rating: number; // 1 à 5
  comment?: string | null;
  clientName: string; // Ex: "Fatou N."
  vendorReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

// ==============================================================================
// 6. PANIER & CHECKOUT
// ==============================================================================

export interface CheckoutItemPayload {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckoutPayload {
  items: CheckoutItemPayload[];
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryPhone: string;
  deliveryNotes?: string;
  deliveryMethod?: DeliveryMethod;
  paymentProvider: PaymentProvider;
  couponCode?: string;
}

export interface CheckoutSessionResult {
  id: string;
  totalAmountFcfa: number;
  paymentProvider: PaymentProvider;
  providerReference: string;
  paymentUrl?: string;
}

export interface OrderItemSummary {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  variantAttributes?: Record<string, string> | null;
  unitPriceFcfa: number;
  quantity: number;
  totalPriceFcfa: number;
}

export interface OrderTrackingStep {
  id: string;
  statusStep: OrderStatus;
  title: string;
  comment?: string | null;
  timestamp: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  shopId: string;
  shopName?: string;
  status: OrderStatus;
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  discountAmountFcfa: number;
  couponCode?: string | null;
  totalAmountFcfa: number;
  buyerProtectionFeeFcfa: number;
  salesChannel: SalesChannel;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryConfirmationCode?: string;
  invoiceUrl: string;
  items?: OrderItemSummary[];
  trackings?: OrderTrackingStep[];
  escrowStatus?: EscrowStatus;
  createdAt: string;
}

export interface CheckoutResponseData {
  checkoutSession: CheckoutSessionResult;
  orders: OrderSummary[];
}

// ==============================================================================
// 7. CODES PROMO & MARKETING
// ==============================================================================

export interface ValidateCouponPayload {
  code: string;
  shopId: string;
  subtotalFcfa: number;
}

export interface ValidatedCouponResult {
  valid: boolean;
  couponId: string;
  code: string;
  type: CouponType;
  value: number;
  discountAmountFcfa: number;
  newSubtotalFcfa: number;
}

// ==============================================================================
// 8. WAKHALE (NÉGOCIATION DE PRIX)
// ==============================================================================

export interface CreateNegotiationPayload {
  productId: string;
  proposedPriceFcfa: number;
  notes?: string;
}

export interface NegotiationResult {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  originalPriceFcfa: number;
  proposedPriceFcfa: number;
  counterPriceFcfa?: number | null;
  status: NegotiationStatus;
  expiresAt: string;
  generatedCoupon?: {
    code: string;
    discountAmountFcfa: number;
  } | null;
  createdAt: string;
}

export interface RespondNegotiationPayload {
  action: 'ACCEPT' | 'REJECT';
}

// ==============================================================================
// 9. WISHLIST / FAVORIS
// ==============================================================================

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product: ProductSummary;
  createdAt: string;
}
