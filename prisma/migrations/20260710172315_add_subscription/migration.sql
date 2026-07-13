-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "subscriptionEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionPlan" TEXT DEFAULT 'monthly',
ADD COLUMN     "subscriptionReminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionStart" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT DEFAULT 'active';
