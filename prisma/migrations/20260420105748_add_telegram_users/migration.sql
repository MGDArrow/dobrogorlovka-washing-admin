-- CreateTable
CREATE TABLE "telegram_users" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "first_name" TEXT,
    "username" TEXT,
    "is_activated" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_users_telegramId_key" ON "telegram_users"("telegramId");
