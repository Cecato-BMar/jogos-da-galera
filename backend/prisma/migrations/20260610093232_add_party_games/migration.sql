-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('STOP', 'HANGMAN', 'TICTACTOE');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "gameType" "GameType" NOT NULL DEFAULT 'STOP';

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'RUNNING',
    "state" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
