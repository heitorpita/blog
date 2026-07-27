-- CreateTable
CREATE TABLE "JournalLink" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "fromPostId" TEXT NOT NULL,
    CONSTRAINT "JournalLink_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "JournalLink_fromPostId_idx" ON "JournalLink"("fromPostId");
-- AddForeignKey
ALTER TABLE "JournalLink" ADD CONSTRAINT "JournalLink_fromPostId_fkey" FOREIGN KEY ("fromPostId") REFERENCES "JournalPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
