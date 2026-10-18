-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` ENUM('CLIENT', 'VENDOR', 'SUPER_ADMIN') NOT NULL DEFAULT 'CLIENT',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `refreshTokenHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shops` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `bannerUrl` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NULL DEFAULT '#10B981',
    `whatsappNumber` VARCHAR(191) NOT NULL,
    `waveNumber` VARCHAR(191) NULL,
    `omNumber` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL DEFAULT 'Dakar',
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `subscriptionPlan` ENUM('FREE', 'PRO', 'PREMIUM') NOT NULL DEFAULT 'FREE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shops_ownerId_key`(`ownerId`),
    UNIQUE INDEX `shops_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `plan` ENUM('FREE', 'PRO', 'PREMIUM') NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `priceFcfa` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NOT NULL,
    `paymentProvider` ENUM('WAVE', 'ORANGE_MONEY') NULL,
    `providerReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_shopId_slug_key`(`shopId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `priceFcfa` INTEGER NOT NULL,
    `compareAtPriceFcfa` INTEGER NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `images` JSON NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_shopId_slug_key`(`shopId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `checkout_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `totalAmountFcfa` INTEGER NOT NULL,
    `paymentProvider` ENUM('WAVE', 'ORANGE_MONEY') NOT NULL,
    `providerReference` VARCHAR(191) NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `checkout_sessions_providerReference_key`(`providerReference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `checkoutSessionId` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `subtotalFcfa` INTEGER NOT NULL,
    `deliveryFeeFcfa` INTEGER NOT NULL DEFAULT 0,
    `totalAmountFcfa` INTEGER NOT NULL,
    `commissionRate` INTEGER NOT NULL,
    `commissionAmountFcfa` INTEGER NOT NULL,
    `netVendorAmountFcfa` INTEGER NOT NULL,
    `deliveryMethod` ENUM('TIAK_TIAK', 'PICKUP') NOT NULL DEFAULT 'TIAK_TIAK',
    `deliveryAddress` VARCHAR(191) NOT NULL,
    `deliveryCity` VARCHAR(191) NOT NULL DEFAULT 'Dakar',
    `deliveryPhone` VARCHAR(191) NOT NULL,
    `deliveryNotes` VARCHAR(191) NULL,
    `deliveryConfirmationCode` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'PAID_ESCROW', 'PREPARING', 'SHIPPED_TIAK_TIAK', 'DELIVERED_CONFIRMED', 'DISPUTED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `autoReleaseAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `unitPriceFcfa` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `totalPriceFcfa` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `escrow_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `totalAmountFcfa` INTEGER NOT NULL,
    `commissionAmountFcfa` INTEGER NOT NULL,
    `netVendorAmountFcfa` INTEGER NOT NULL,
    `paymentProvider` ENUM('WAVE', 'ORANGE_MONEY') NOT NULL,
    `providerReference` VARCHAR(191) NULL,
    `status` ENUM('HELD_IN_ESCROW', 'RELEASED_TO_VENDOR', 'FROZEN_BY_DISPUTE', 'REFUNDED_TO_CLIENT') NOT NULL DEFAULT 'HELD_IN_ESCROW',
    `heldAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `releasedAt` DATETIME(3) NULL,
    `frozenAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `escrow_transactions_orderId_key`(`orderId`),
    UNIQUE INDEX `escrow_transactions_providerReference_key`(`providerReference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_wallets` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `escrowBalanceFcfa` INTEGER NOT NULL DEFAULT 0,
    `availableBalanceFcfa` INTEGER NOT NULL DEFAULT 0,
    `totalEarnedFcfa` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_wallets_shopId_key`(`shopId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_payouts` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `amountFcfa` INTEGER NOT NULL,
    `provider` ENUM('WAVE', 'ORANGE_MONEY') NOT NULL,
    `recipientPhone` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `providerReference` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disputes` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `evidenceUrls` JSON NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND_CLIENT', 'RESOLVED_RELEASE_VENDOR') NOT NULL DEFAULT 'OPEN',
    `arbitratedById` VARCHAR(191) NULL,
    `decisionNotes` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `disputes_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `shops` ADD CONSTRAINT `shops_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkout_sessions` ADD CONSTRAINT `checkout_sessions_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_checkoutSessionId_fkey` FOREIGN KEY (`checkoutSessionId`) REFERENCES `checkout_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escrow_transactions` ADD CONSTRAINT `escrow_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_wallets` ADD CONSTRAINT `vendor_wallets_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_payouts` ADD CONSTRAINT `wallet_payouts_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `vendor_wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_arbitratedById_fkey` FOREIGN KEY (`arbitratedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
