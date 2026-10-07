-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "txnUuid" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NPR';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "paidAt" DATETIME;

-- CreateIndex
CREATE INDEX "Payment_txnUuid_idx" ON "Payment"("txnUuid");
