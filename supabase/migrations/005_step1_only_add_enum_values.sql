-- PASSO 1 — Rode APENAS este arquivo primeiro (sozinho), depois teste criar um card.
-- Se o script grande anterior falhou no meio, o Postgres pode ter desfeito o ALTER TYPE na mesma transação.
--
-- Depois de rodar, execute no SQL Editor para conferir:
--   SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
--   WHERE t.typname = 'defect_status' ORDER BY e.enumsortorder;
-- Deve aparecer entre outros: Aguardando, Em execução

ALTER TYPE defect_status ADD VALUE IF NOT EXISTS 'Aguardando';
ALTER TYPE defect_status ADD VALUE IF NOT EXISTS 'Em execução';
