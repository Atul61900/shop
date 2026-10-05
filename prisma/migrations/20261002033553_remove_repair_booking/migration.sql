/*
  Warnings:

  - You are about to drop the `RepairTicket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RepairUpdate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RepairTicket";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RepairUpdate";
PRAGMA foreign_keys=on;
