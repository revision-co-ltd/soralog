-- 飞行会话状态表 - 用于保存进行中的飞行状态
-- 这样即使关闭浏览器或换设备也能恢复飞行状态

CREATE TABLE IF NOT EXISTS public.flight_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'started', 'finished')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  form_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每个用户只能有一个活跃的飞行会话
  UNIQUE (user_id)
);

-- 启用 RLS
ALTER TABLE public.flight_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can view own flight sessions"
  ON public.flight_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flight sessions"
  ON public.flight_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flight sessions"
  ON public.flight_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flight sessions"
  ON public.flight_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_flight_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flight_sessions_timestamp
  BEFORE UPDATE ON public.flight_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_flight_session_timestamp();

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_flight_sessions_user_id ON public.flight_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_sessions_status ON public.flight_sessions(status);

-- 注释
COMMENT ON TABLE public.flight_sessions IS '用户的活跃飞行会话状态';
COMMENT ON COLUMN public.flight_sessions.status IS '飞行状态: ready=准备中, started=飞行中, finished=已结束';
COMMENT ON COLUMN public.flight_sessions.form_data IS '表单数据的 JSON 备份';

