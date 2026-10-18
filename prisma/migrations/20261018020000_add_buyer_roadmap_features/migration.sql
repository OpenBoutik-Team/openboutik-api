-- AlterTable
ALTER TABLE `shops` ADD COLUMN IF NOT EXISTS `freeMoneyNumber` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS `payment_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amountFcfa` INTEGER NOT NULL,
    `provider` ENUM('WAVE', 'ORANGE_MONEY', 'FREE_MONEY') NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `externalTxId` VARCHAR(191) NULL,
    `status` ENUM('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `rawWebhookPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_transactions_externalTxId_key`(`externalTxId`),
    INDEX `payment_transactions_orderId_idx`(`orderId`),
    INDEX `payment_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `wishlists` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wishlists_userId_idx`(`userId`),
    UNIQUE INDEX `wishlists_userId_productId_key`(`userId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `messages` (
    `id` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `receiverId` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_senderId_receiverId_idx`(`senderId`, `receiverId`),
    INDEX `messages_receiverId_isRead_idx`(`receiverId`, `isRead`),
    INDEX `messages_shopId_idx`(`shopId`),
    INDEX `messages_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `order_trackings` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `statusStep` ENUM('PENDING_PAYMENT', 'PAID_ESCROW', 'PREPARING', 'SHIPPED_TIAK_TIAK', 'DELIVERED_CONFIRMED', 'DISPUTED', 'REFUNDED', 'CANCELLED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `comment` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_trackings_orderId_timestamp_idx`(`orderId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
