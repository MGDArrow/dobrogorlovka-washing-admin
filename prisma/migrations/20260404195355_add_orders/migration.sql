-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "rules_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- AddForeignKey
ALTER TABLE "order_wash_types" ADD CONSTRAINT "order_wash_types_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_wash_types" ADD CONSTRAINT "order_wash_types_wash_type_id_fkey" FOREIGN KEY ("wash_type_id") REFERENCES "wash_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
