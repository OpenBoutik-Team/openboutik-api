-- AlterTable
ALTER TABLE `installment_payments` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `installment_plans` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `media_streams` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `buyerProtectionFeeFcfa` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `salesChannel` ENUM('MARKETPLACE', 'SUBDOMAIN', 'CUSTOM_DOMAIN') NOT NULL DEFAULT 'MARKETPLACE';

-- AlterTable
ALTER TABLE `payment_transactions` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `price_negotiations` MODIFY `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_OFFERED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `shops` ADD COLUMN `announcementBarEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `announcementBarText` VARCHAR(191) NULL,
    ADD COLUMN `billingRetryCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `commissionRate` DOUBLE NOT NULL DEFAULT 3.0,
    ADD COLUMN `currentPeriodEnd` DATETIME(3) NULL,
    ADD COLUMN `currentPeriodStart` DATETIME(3) NULL,
    ADD COLUMN `customDomain` VARCHAR(191) NULL,
    ADD COLUMN `customDomainVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `faviconUrl` VARCHAR(191) NULL,
    ADD COLUMN `gatewayFeeRate` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `gracePeriodEndsAt` DATETIME(3) NULL,
    ADD COLUMN `hasUsedFreeTrial` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastBillingAttemptAt` DATETIME(3) NULL,
    ADD COLUMN `nextBillingRetryAt` DATETIME(3) NULL,
    ADD COLUMN `slogan` VARCHAR(191) NULL,
    ADD COLUMN `subdomainEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `subscriptionStatus` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED_DOWNGRADED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `themeConfig` JSON NULL,
    ADD COLUMN `totalCommissionSavedFcfa` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    ADD COLUMN `trialStartedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `subscriptions` MODIFY `status` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED_DOWNGRADED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `users` MODIFY `kycRejectionReason` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `shop_sponsors` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NOT NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `badgeText` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `shop_sponsors_shopId_isActive_displayOrder_idx`(`shopId`, `isActive`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_billing_logs` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `plan` ENUM('FREE', 'PRO', 'PREMIUM') NOT NULL,
    `amountFcfa` INTEGER NOT NULL,
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('SUCCESS', 'FAILED_INSUFFICIENT_FUNDS', 'MANUAL_REACTIVATION') NOT NULL,
    `failureReason` TEXT NULL,
    `walletBalanceBeforeFcfa` INTEGER NOT NULL,
    `walletBalanceAfterFcfa` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscription_billing_logs_shopId_createdAt_idx`(`shopId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `used_trial_registries` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `waveNumber` VARCHAR(191) NULL,
    `omNumber` VARCHAR(191) NULL,
    `idCardNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `used_trial_registries_userId_idx`(`userId`),
    INDEX `used_trial_registries_shopId_idx`(`shopId`),
    INDEX `used_trial_registries_phone_idx`(`phone`),
    INDEX `used_trial_registries_waveNumber_idx`(`waveNumber`),
    INDEX `used_trial_registries_omNumber_idx`(`omNumber`),
    INDEX `used_trial_registries_idCardNumber_idx`(`idCardNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_shopId_displayOrder_idx` ON `products`(`shopId`, `displayOrder`);

-- CreateIndex
CREATE INDEX `products_shopId_isFeatured_idx` ON `products`(`shopId`, `isFeatured`);

-- CreateIndex
CREATE UNIQUE INDEX `shops_customDomain_key` ON `shops`(`customDomain`);

-- AddForeignKey
ALTER TABLE `shop_sponsors` ADD CONSTRAINT `shop_sponsors_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_billing_logs` ADD CONSTRAINT `subscription_billing_logs_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
