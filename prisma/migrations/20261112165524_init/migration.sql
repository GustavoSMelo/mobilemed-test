-- CreateTable
CREATE TABLE `pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigoPedido` INTEGER NOT NULL,
    `nomePaciente` VARCHAR(191) NOT NULL,
    `dataNascimento` VARCHAR(191) NOT NULL,
    `sexo` VARCHAR(191) NOT NULL,
    `codUnidade` INTEGER NOT NULL,
    `integrado` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pedidos_codigoPedido_key`(`codigoPedido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_pedido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pedidoId` INTEGER NOT NULL,
    `codigoItemPedido` INTEGER NOT NULL,
    `accessionNumber` VARCHAR(191) NOT NULL,
    `modalidade` VARCHAR(191) NOT NULL,
    `nomeProcedimento` VARCHAR(191) NOT NULL,

    INDEX `itens_pedido_accessionNumber_idx`(`accessionNumber`),
    UNIQUE INDEX `itens_pedido_pedidoId_codigoItemPedido_key`(`pedidoId`, `codigoItemPedido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigoDocumento` INTEGER NOT NULL,
    `codigoPedido` INTEGER NOT NULL,
    `nomeDocumento` VARCHAR(191) NOT NULL,
    `conteudoBase64` LONGTEXT NOT NULL,
    `integrado` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `documentos_codigoPedido_idx`(`codigoPedido`),
    UNIQUE INDEX `documentos_codigoDocumento_codigoPedido_key`(`codigoDocumento`, `codigoPedido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exames` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accessionNumber` VARCHAR(191) NOT NULL,
    `nomePaciente` VARCHAR(191) NOT NULL,
    `modalidade` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NOVO',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exames_accessionNumber_key`(`accessionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_exames` (
    `documentoId` INTEGER NOT NULL,
    `exameId` INTEGER NOT NULL,
    `vinculadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`documentoId`, `exameId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `itens_pedido` ADD CONSTRAINT `itens_pedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_codigoPedido_fkey` FOREIGN KEY (`codigoPedido`) REFERENCES `pedidos`(`codigoPedido`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_exames` ADD CONSTRAINT `documentos_exames_documentoId_fkey` FOREIGN KEY (`documentoId`) REFERENCES `documentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_exames` ADD CONSTRAINT `documentos_exames_exameId_fkey` FOREIGN KEY (`exameId`) REFERENCES `exames`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
