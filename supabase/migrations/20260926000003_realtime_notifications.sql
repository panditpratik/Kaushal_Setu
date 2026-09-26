-- ===========================================================================
-- KAUSHALSETU MIGRATION 20260926000003: REALTIME NOTIFICATIONS
-- ===========================================================================
-- Ensures public.notifications is enabled for Supabase Realtime replication
-- and properly published to supabase_realtime publication.

-- 1. Ensure REPLICA IDENTITY FULL for complete payload delivery on events
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add public.notifications to supabase_realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- 3. Confirm permissions for authenticated role
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- 4. PostgreSQL NOTIFY trigger for low-latency Realtime bridge
CREATE OR REPLACE FUNCTION notify_realtime_notifications()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('realtime_notifications', json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_realtime_notifications ON public.notifications;
CREATE TRIGGER trg_realtime_notifications
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION notify_realtime_notifications();

