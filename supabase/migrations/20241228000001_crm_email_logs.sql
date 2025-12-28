-- CRM Email Logs table
-- Tracks which automated emails have been sent to users

CREATE TABLE IF NOT EXISTS crm_email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_crm_email_logs_user_automation 
  ON crm_email_logs(user_id, automation_id);

CREATE INDEX IF NOT EXISTS idx_crm_email_logs_sent_at 
  ON crm_email_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_email_logs_automation_id 
  ON crm_email_logs(automation_id);

-- Enable RLS
ALTER TABLE crm_email_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all logs
CREATE POLICY "Admins can read all CRM logs" ON crm_email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Allow service role to insert (for cron/automations)
CREATE POLICY "Service role can insert CRM logs" ON crm_email_logs
  FOR INSERT
  WITH CHECK (true);

