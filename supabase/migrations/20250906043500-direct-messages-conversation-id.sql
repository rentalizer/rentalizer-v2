-- Add conversation_id column, backfill existing rows, create trigger to maintain it, and index

-- 1) Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.direct_messages
      ADD COLUMN conversation_id text;
  END IF;
END $$;

-- 2) Helper function to normalize two UUIDs into a stable conversation id
CREATE OR REPLACE FUNCTION public.normalize_pair_uuid(a uuid, b uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF a <= b THEN
    RETURN a::text || '|' || b::text;
  ELSE
    RETURN b::text || '|' || a::text;
  END IF;
END;
$$;

-- 3) Backfill existing rows where conversation_id is null
UPDATE public.direct_messages dm
SET conversation_id = public.normalize_pair_uuid(sender_id, recipient_id)
WHERE dm.conversation_id IS NULL;

-- 4) Trigger to set conversation_id before insert
CREATE OR REPLACE FUNCTION public.set_direct_messages_conversation_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.conversation_id := public.normalize_pair_uuid(NEW.sender_id, NEW.recipient_id);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_direct_messages_conversation_id'
  ) THEN
    CREATE TRIGGER trg_set_direct_messages_conversation_id
    BEFORE INSERT ON public.direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_direct_messages_conversation_id();
  END IF;
END $$;

-- 5) Index for faster conversation loads
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_id
  ON public.direct_messages (conversation_id);
