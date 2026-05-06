/*
  Warnings:

  - The primary key for the `booking_seats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `bookings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `cinemas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `movies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `gateway` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `schedule_seats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `locked_by` column on the `schedule_seats` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `schedules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `seats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `studios` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `booking_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `booking_id` on the `booking_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `seat_id` on the `booking_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `schedule_id` on the `bookings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `cinemas` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `movies` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `movies` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `booking_id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `schedule_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `schedule_id` on the `schedule_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `seat_id` on the `schedule_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `end_time` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `movie_id` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `studio_id` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `studio_id` on the `seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `studios` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `cinema_id` on the `studios` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('MIDTRANS', 'XENDIT');

-- DropForeignKey
ALTER TABLE "booking_seats" DROP CONSTRAINT "booking_seats_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_seats" DROP CONSTRAINT "booking_seats_seat_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_seats" DROP CONSTRAINT "schedule_seats_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_seats" DROP CONSTRAINT "schedule_seats_seat_id_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_movie_id_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "seats" DROP CONSTRAINT "seats_studio_id_fkey";

-- DropForeignKey
ALTER TABLE "studios" DROP CONSTRAINT "studios_cinema_id_fkey";

-- AlterTable
ALTER TABLE "booking_seats" DROP CONSTRAINT "booking_seats_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "booking_id",
ADD COLUMN     "booking_id" UUID NOT NULL,
DROP COLUMN "seat_id",
ADD COLUMN     "seat_id" UUID NOT NULL,
ADD CONSTRAINT "booking_seats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_pkey",
ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "schedule_id",
ADD COLUMN     "schedule_id" UUID NOT NULL,
ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "cinemas" DROP CONSTRAINT "cinemas_pkey",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "cinemas_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "movies" DROP CONSTRAINT "movies_pkey",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'INDONESIA',
ADD COLUMN     "trailer_url" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "release_date" SET DATA TYPE DATE,
ADD CONSTRAINT "movies_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payments" DROP CONSTRAINT "payments_pkey",
ADD COLUMN     "expired_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "booking_id",
ADD COLUMN     "booking_id" UUID NOT NULL,
DROP COLUMN "gateway",
ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'MIDTRANS',
ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "schedule_seats" DROP CONSTRAINT "schedule_seats_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "schedule_id",
ADD COLUMN     "schedule_id" UUID NOT NULL,
DROP COLUMN "seat_id",
ADD COLUMN     "seat_id" UUID NOT NULL,
DROP COLUMN "locked_by",
ADD COLUMN     "locked_by" UUID,
ADD CONSTRAINT "schedule_seats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_pkey",
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'TWO_D',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'SUBTITLED',
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "movie_id",
ADD COLUMN     "movie_id" UUID NOT NULL,
DROP COLUMN "studio_id",
ADD COLUMN     "studio_id" UUID NOT NULL,
ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "seats" DROP CONSTRAINT "seats_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "studio_id",
ADD COLUMN     "studio_id" UUID NOT NULL,
ADD CONSTRAINT "seats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "studios" DROP CONSTRAINT "studios_pkey",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "cinema_id",
ADD COLUMN     "cinema_id" UUID NOT NULL,
ADD CONSTRAINT "studios_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "booking_seats_booking_id_idx" ON "booking_seats"("booking_id");

-- CreateIndex
CREATE INDEX "booking_seats_ticket_code_idx" ON "booking_seats"("ticket_code");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_booking_code_idx" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "cinemas_city_idx" ON "cinemas"("city");

-- CreateIndex
CREATE INDEX "cinemas_is_active_idx" ON "cinemas"("is_active");

-- CreateIndex
CREATE INDEX "movies_is_active_idx" ON "movies"("is_active");

-- CreateIndex
CREATE INDEX "movies_release_date_idx" ON "movies"("release_date");

-- CreateIndex
CREATE INDEX "movies_genre_idx" ON "movies"("genre");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_gateway_ref_idx" ON "payments"("gateway_ref");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "schedule_seats_schedule_id_status_idx" ON "schedule_seats"("schedule_id", "status");

-- CreateIndex
CREATE INDEX "schedule_seats_seat_id_idx" ON "schedule_seats"("seat_id");

-- CreateIndex
CREATE INDEX "schedule_seats_locked_until_idx" ON "schedule_seats"("locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_seats_schedule_id_seat_id_key" ON "schedule_seats"("schedule_id", "seat_id");

-- CreateIndex
CREATE INDEX "schedules_end_time_idx" ON "schedules"("end_time");

-- CreateIndex
CREATE INDEX "schedules_movie_id_idx" ON "schedules"("movie_id");

-- CreateIndex
CREATE INDEX "schedules_studio_id_idx" ON "schedules"("studio_id");

-- CreateIndex
CREATE INDEX "schedules_is_active_show_time_idx" ON "schedules"("is_active", "show_time");

-- CreateIndex
CREATE INDEX "seats_studio_id_idx" ON "seats"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "seats_studio_id_row_label_seat_number_key" ON "seats"("studio_id", "row_label", "seat_number");

-- CreateIndex
CREATE INDEX "studios_cinema_id_idx" ON "studios"("cinema_id");

-- CreateIndex
CREATE INDEX "studios_is_active_idx" ON "studios"("is_active");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "studios" ADD CONSTRAINT "studios_cinema_id_fkey" FOREIGN KEY ("cinema_id") REFERENCES "cinemas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_seats" ADD CONSTRAINT "schedule_seats_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_seats" ADD CONSTRAINT "schedule_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
