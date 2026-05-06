/*
  Warnings:

  - You are about to drop the column `seat_id` on the `booking_seats` table. All the data in the column will be lost.
  - The `language` column on the `movies` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `format` column on the `schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `language` column on the `schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `capacity` on the `studios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schedule_seat_id]` on the table `booking_seats` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[booking_id,schedule_seat_id]` on the table `booking_seats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schedule_seat_id` to the `booking_seats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `cinemas` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MovieFormat" AS ENUM ('TWO_D', 'THREE_D', 'IMAX', 'FOUR_DX');

-- CreateEnum
CREATE TYPE "MovieLanguage" AS ENUM ('INDONESIA', 'ENGLISH', 'SUBTITLED');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('BASE', 'WEEKEND', 'HOLIDAY', 'PEAK_HOUR', 'PROMOTION');

-- DropForeignKey
ALTER TABLE "booking_seats" DROP CONSTRAINT "booking_seats_seat_id_fkey";

-- AlterTable
ALTER TABLE "booking_seats" DROP COLUMN "seat_id",
ADD COLUMN     "schedule_seat_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "expired_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cinemas" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "movies" ADD COLUMN     "cast" TEXT,
ADD COLUMN     "director" TEXT,
ADD COLUMN     "end_date" DATE,
ADD COLUMN     "format" "MovieFormat" NOT NULL DEFAULT 'TWO_D',
DROP COLUMN "language",
ADD COLUMN     "language" "MovieLanguage" NOT NULL DEFAULT 'INDONESIA';

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "is_sold_out" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "format",
ADD COLUMN     "format" "MovieFormat" NOT NULL DEFAULT 'TWO_D',
DROP COLUMN "language",
ADD COLUMN     "language" "MovieLanguage" NOT NULL DEFAULT 'SUBTITLED';

-- AlterTable
ALTER TABLE "studios" DROP COLUMN "capacity";

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "seat_type" "SeatType",
    "pricing_type" "PricingType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_schedule_id_idx" ON "pricing_rules"("schedule_id");

-- CreateIndex
CREATE INDEX "pricing_rules_is_active_idx" ON "pricing_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_schedule_id_seat_type_pricing_type_key" ON "pricing_rules"("schedule_id", "seat_type", "pricing_type");

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_schedule_seat_id_key" ON "booking_seats"("schedule_seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_booking_id_schedule_seat_id_key" ON "booking_seats"("booking_id", "schedule_seat_id");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_schedule_id_idx" ON "bookings"("schedule_id");

-- CreateIndex
CREATE INDEX "cinemas_city_is_active_idx" ON "cinemas"("city", "is_active");

-- CreateIndex
CREATE INDEX "movies_is_active_release_date_idx" ON "movies"("is_active", "release_date");

-- CreateIndex
CREATE INDEX "payments_booking_id_status_idx" ON "payments"("booking_id", "status");

-- CreateIndex
CREATE INDEX "schedule_seats_status_idx" ON "schedule_seats"("status");

-- CreateIndex
CREATE INDEX "schedules_movie_id_show_time_idx" ON "schedules"("movie_id", "show_time");

-- CreateIndex
CREATE INDEX "schedules_is_sold_out_idx" ON "schedules"("is_sold_out");

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_schedule_seat_id_fkey" FOREIGN KEY ("schedule_seat_id") REFERENCES "schedule_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
