-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(1024) NOT NULL,
    "value" BYTEA NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_key_key" ON "Document"("key");
