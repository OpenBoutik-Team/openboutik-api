/**
 * OPENBOUTIK — TYPESCRIPT INTERFACES POUR LE FRONTEND DEV 1 (@mansss7)
 * Dépôt : `openboutik-marketplace` (Port local : 3000)
 * Fichier prêt à l'emploi pour Next.js (App Router, Strict Mode)
 * Zéro type `any` — Alignement 100% avec Prisma et NestJS (`openboutik-api`)
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

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY';

export type DeliveryMethod = 'TIAK_TIAK' | 'PICKUP';

export type CouponType = 'PERCENTAGE' | 'FIXED_FCFA';

export type NegotiationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTER_OFFERED'
  | 'EXPIRED';

export type StreamType = 'LIVE_STREAM' | 'SHORT_VIDEO';

export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

export type InstallmentPlanStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DEFAULTED'
  | 'CANCELLED';

export type InstallmentPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==============================================================================
// 3. AUTHENTIFICATION & PROFIL ACHETEUR
// ==============================================================================

export interface RegisterClientPayload {
  phone: string;
  fullName: string;
  email?: string;
  password: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  fullName: string;
  email?: string | null;
  role: Role;
  kycStatus?: KycStatus;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

// ==============================================================================
// 4. RÉSOLUTION MULTI-TENANT & VITRINE DÉDIÉE (`StorefrontRenderer`)
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
  isVerified?: boolean;
  isOnVacation?: boolean;
  vacationMessage?: string | null;
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
// 5. CATALOGUE, VARIANTES, AVIS 5★ & FAVORIS
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
    isOnVacation?: boolean;
    vacationMessage?: string | null;
  };
  variants?: ProductVariant[];
}

export interface ProductReview {
  id: string;
  productId: string;
  rating: number;
  comment?: string | null;
  clientName: string;
  vendorReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

export interface ProductReviewsResponse {
  averageRating: number;
  totalReviews: number;
  reviews: ProductReview[];
}

export interface CreateReviewPayload {
  rating: number;
  comment?: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product: ProductSummary;
  createdAt: string;
}

// ==============================================================================
// 6. PANIER, CODES PROMO & CHECKOUT SÉQUESTRE
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
  salesChannel: SalesChannel;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryConfirmationCode?: string;
  invoiceUrl?: string | null;
  items?: OrderItemSummary[];
  trackings?: OrderTrackingStep[];
  escrowStatus?: EscrowStatus;
  createdAt: string;
}

export interface CheckoutResponseData {
  checkoutSession: {
    id: string;
    totalAmountFcfa: number;
    paymentProvider: PaymentProvider;
    providerReference: string;
    paymentUrl?: string;
  };
  orders: OrderSummary[];
}

// ==============================================================================
// 7. LITIGES ACHETEUR (DISPUTES)
// ==============================================================================

export interface OpenDisputePayload {
  reason: string;
  evidenceUrls?: string[];
}

export interface DisputeRecord {
  id: string;
  orderId: string;
  openedByUserId: string;
  reason: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

// ==============================================================================
// 8. WAKHALE (NÉGOCIATION DE PRIX ACHETEUR)
// ==============================================================================

export interface CreateNegotiationPayload {
  productId: string;
  proposedPriceFcfa: number;
}

export interface NegotiationRecord {
  id: string;
  productId: string;
  buyerId: string;
  shopId: string;
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

// ==============================================================================
// 9. LIVE SHOPPING & VIDÉOS COURTES
// ==============================================================================

export interface StreamProductItem {
  id: string;
  productId: string;
  isPinned: boolean;
  specialPriceFcfa?: number | null;
  product: ProductSummary;
}

export interface MediaStream {
  id: string;
  shopId: string;
  title: string;
  description?: string | null;
  type: StreamType;
  status: StreamStatus;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  scheduledAt?: string | null;
  streamProducts: StreamProductItem[];
  createdAt: string;
}

// ==============================================================================
// 10. PAIEMENT FRACTIONNÉ BNPL (3x / 4x) & KYC ACHETEUR
// ==============================================================================

export interface SubmitBuyerKycPayload {
  idCardNumber: string;
  idCardUrl: string;
}

export interface InitBnplPayload {
  installmentsCount: 3 | 4;
}

export interface InstallmentPaymentItem {
  id: string;
  planId: string;
  installmentNumber: number;
  amountFcfa: number;
  dueDate: string;
  paidAt?: string | null;
  status: InstallmentPaymentStatus;
}

export interface InstallmentPlan {
  id: string;
  orderId: string;
  userId: string;
  totalAmountFcfa: number;
  installmentsCount: number;
  status: InstallmentPlanStatus;
  payments: InstallmentPaymentItem[];
  createdAt: string;
}

// ==============================================================================
// 11. MESSAGERIE INTERNE & STOCKAGE CLOUD
// ==============================================================================

export interface SendMessagePayload {
  receiverId: string;
  shopId?: string;
  productId?: string;
  orderId?: string;
  content: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  shopId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreateUploadTicketPayload {
  filename: string;
  fileType: string;
  fileSize: number;
  category: UploadCategory;
}

export interface UploadTicketResponse {
  ticketId: string;
  provider: string;
  uploadUrl: string;
  publicUrl: string;
  signedParams: Record<string, string | number>;
  expiresAt: string;
  isPrivate: boolean;
}
