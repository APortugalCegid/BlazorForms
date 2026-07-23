-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Form" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "loc" INTEGER NOT NULL,
    "token" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "classification" TEXT NOT NULL,
    "estimatedDays" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Backlog',
    "included" BOOLEAN NOT NULL DEFAULT true,
    "assignedUserId" TEXT,
    "checklistData" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "dueDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Form_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Form" ("assignedUserId", "checklistData", "className", "classification", "copies", "createdAt", "estimatedDays", "id", "included", "loc", "module", "status", "token", "updatedAt") SELECT "assignedUserId", "checklistData", "className", "classification", "copies", "createdAt", "estimatedDays", "id", "included", "loc", "module", "status", "token", "updatedAt" FROM "Form";
DROP TABLE "Form";
ALTER TABLE "new_Form" RENAME TO "Form";
CREATE INDEX "Form_module_idx" ON "Form"("module");
CREATE INDEX "Form_status_idx" ON "Form"("status");
CREATE INDEX "Form_assignedUserId_idx" ON "Form"("assignedUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
