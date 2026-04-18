-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "timetableData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wash_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "temperature" INTEGER NOT NULL,
    "dryingSpin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wash_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "rules_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "comment" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_wash_types" (
    "order_id" INTEGER NOT NULL,
    "wash_type_id" INTEGER NOT NULL,

    CONSTRAINT "order_wash_types_pkey" PRIMARY KEY ("order_id","wash_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_effectiveFrom_key" ON "Schedule"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "wash_types_name_key" ON "wash_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- AddForeignKey
ALTER TABLE "order_wash_types" ADD CONSTRAINT "order_wash_types_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_wash_types" ADD CONSTRAINT "order_wash_types_wash_type_id_fkey" FOREIGN KEY ("wash_type_id") REFERENCES "wash_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
