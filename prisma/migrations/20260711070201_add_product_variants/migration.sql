-- AlterTable
ALTER TABLE "products" ADD COLUMN     "hasVariants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentProductId" TEXT;

-- CreateTable
CREATE TABLE "product_variant_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_variant_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_group_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_variant_group_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_option_assignments" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "product_variant_option_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_option_assignments_variantId_optionId_key" ON "product_variant_option_assignments"("variantId", "optionId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_groups" ADD CONSTRAINT "product_variant_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_group_options" ADD CONSTRAINT "product_variant_group_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_variant_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_option_assignments" ADD CONSTRAINT "product_variant_option_assignments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_option_assignments" ADD CONSTRAINT "product_variant_option_assignments_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_variant_group_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
