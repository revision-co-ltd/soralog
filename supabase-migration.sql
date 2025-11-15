-- ================================================
-- Supabase 数据库迁移脚本
-- 无人机飞行记录系统
-- ================================================

-- 创建日期: 2025-11-15
-- 说明: 在 Supabase SQL Editor 中执行此脚本

-- ================================================
-- 1. 创建飞行记录表 (flight_logs)
-- ================================================

CREATE TABLE IF NOT EXISTS public.flight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  date DATE NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER, -- 飞行时长（分钟）
  
  -- 地点信息
  location TEXT NOT NULL,
  location_address_detail TEXT,
  location_latitude DOUBLE PRECISION,
  location_longitude DOUBLE PRECISION,
  
  -- 无人机信息
  drone_model TEXT NOT NULL,
  
  -- 天气和飞行条件
  weather TEXT,
  wind_speed DOUBLE PRECISION, -- 风速 (m/s)
  altitude INTEGER, -- 飞行高度 (m)
  
  -- 飞行目的和备注
  purpose TEXT NOT NULL,
  notes TEXT,
  
  -- 操作员和客户信息
  pilot TEXT NOT NULL,
  client_name TEXT,
  
  -- 同步状态
  sync_status TEXT DEFAULT 'synced',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_flight_logs_user_id ON public.flight_logs(user_id);
CREATE INDEX idx_flight_logs_date ON public.flight_logs(date DESC);
CREATE INDEX idx_flight_logs_pilot ON public.flight_logs(pilot);
CREATE INDEX idx_flight_logs_drone_model ON public.flight_logs(drone_model);

-- 添加注释
COMMENT ON TABLE public.flight_logs IS '飞行记录表';
COMMENT ON COLUMN public.flight_logs.duration IS '飞行时长（分钟）';
COMMENT ON COLUMN public.flight_logs.wind_speed IS '风速 (m/s)';
COMMENT ON COLUMN public.flight_logs.altitude IS '飞行高度 (m)';

-- ================================================
-- 2. 创建飞行员表 (pilots)
-- ================================================

CREATE TABLE IF NOT EXISTS public.pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name TEXT NOT NULL,
  license_number TEXT,
  license_type TEXT,
  
  -- 联系信息
  email TEXT,
  phone TEXT,
  
  -- 飞行时间（分钟）
  initial_flight_hours INTEGER DEFAULT 0,
  total_flight_hours INTEGER DEFAULT 0,
  
  -- 状态
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_pilots_user_id ON public.pilots(user_id);
CREATE INDEX idx_pilots_name ON public.pilots(name);
CREATE INDEX idx_pilots_is_active ON public.pilots(is_active);

-- 添加注释
COMMENT ON TABLE public.pilots IS '飞行员信息表';
COMMENT ON COLUMN public.pilots.initial_flight_hours IS '初始飞行时间（分钟）';
COMMENT ON COLUMN public.pilots.total_flight_hours IS '总飞行时间（分钟）';

-- ================================================
-- 3. 创建无人机表 (uavs)
-- ================================================

CREATE TABLE IF NOT EXISTS public.uavs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  nickname TEXT NOT NULL,
  registration_id TEXT,
  manufacturer TEXT,
  model TEXT NOT NULL,
  
  -- 认证信息
  category TEXT NOT NULL CHECK (category IN ('certified', 'uncertified')),
  certification_number TEXT,
  certification_date DATE,
  
  -- 飞行时间（小时）
  total_flight_hours DOUBLE PRECISION DEFAULT 0,
  hours_since_last_maintenance DOUBLE PRECISION DEFAULT 0,
  
  -- 状态
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_uavs_user_id ON public.uavs(user_id);
CREATE INDEX idx_uavs_model ON public.uavs(model);
CREATE INDEX idx_uavs_is_active ON public.uavs(is_active);
CREATE INDEX idx_uavs_category ON public.uavs(category);

-- 添加注释
COMMENT ON TABLE public.uavs IS '无人机信息表';
COMMENT ON COLUMN public.uavs.category IS '认证类别: certified(已认证) 或 uncertified(未认证)';
COMMENT ON COLUMN public.uavs.total_flight_hours IS '总飞行时间（小时）';
COMMENT ON COLUMN public.uavs.hours_since_last_maintenance IS '距上次维护的飞行时间（小时）';

-- ================================================
-- 4. 启用行级安全 (Row Level Security)
-- ================================================

-- 启用 RLS
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uavs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. 创建 RLS 策略
-- ================================================

-- 飞行记录策略：用户只能访问自己的记录
CREATE POLICY "Users can view own flight logs"
  ON public.flight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flight logs"
  ON public.flight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flight logs"
  ON public.flight_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flight logs"
  ON public.flight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- 飞行员策略：用户只能访问自己的飞行员
CREATE POLICY "Users can view own pilots"
  ON public.pilots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pilots"
  ON public.pilots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pilots"
  ON public.pilots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pilots"
  ON public.pilots FOR DELETE
  USING (auth.uid() = user_id);

-- 无人机策略：用户只能访问自己的无人机
CREATE POLICY "Users can view own UAVs"
  ON public.uavs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own UAVs"
  ON public.uavs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own UAVs"
  ON public.uavs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own UAVs"
  ON public.uavs FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- 6. 创建更新时间戳的触发器
-- ================================================

-- 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为每个表添加触发器
CREATE TRIGGER set_updated_at_flight_logs
  BEFORE UPDATE ON public.flight_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pilots
  BEFORE UPDATE ON public.pilots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_uavs
  BEFORE UPDATE ON public.uavs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- 7. 插入示例数据（可选，用于测试）
-- ================================================

-- 注意：需要先有一个认证用户才能插入数据
-- 以下 SQL 仅用于演示，实际使用时请替换 user_id

/*
-- 示例：插入飞行员
INSERT INTO public.pilots (user_id, name, license_number, license_type, total_flight_hours, is_active)
VALUES 
  (auth.uid(), '山田太郎', '123456789', '一等無人航空機操縦士', 6000, TRUE),
  (auth.uid(), '田中花子', '987654321', '二等無人航空機操縦士', 3000, TRUE);

-- 示例：插入无人机
INSERT INTO public.uavs (user_id, nickname, model, category, total_flight_hours, is_active)
VALUES 
  (auth.uid(), 'メイン機体', 'DJI Mini 3', 'uncertified', 15.5, TRUE),
  (auth.uid(), '撮影用機体', 'DJI Air 2S', 'certified', 32.1, TRUE);

-- 示例：插入飞行记录
INSERT INTO public.flight_logs (user_id, date, time, duration, location, drone_model, purpose, pilot)
VALUES 
  (auth.uid(), '2024-11-15', '10:30', 45, '東京都渋谷区代々木公園', 'DJI Mini 3', '撮影・映像制作', '山田太郎');
*/

-- ================================================
-- 8. 创建视图（可选）
-- ================================================

-- 飞行统计视图
CREATE OR REPLACE VIEW public.flight_statistics AS
SELECT 
  user_id,
  COUNT(*) AS total_flights,
  SUM(duration) AS total_minutes,
  COUNT(DISTINCT drone_model) AS unique_drones,
  COUNT(DISTINCT pilot) AS unique_pilots,
  MIN(date) AS first_flight_date,
  MAX(date) AS last_flight_date
FROM public.flight_logs
GROUP BY user_id;

-- ================================================
-- 9. 授予权限
-- ================================================

-- 授予认证用户访问权限
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uavs TO authenticated;
GRANT SELECT ON public.flight_statistics TO authenticated;

-- ================================================
-- 完成
-- ================================================

-- 查看创建的表
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('flight_logs', 'pilots', 'uavs')
ORDER BY table_name;

-- 显示完成消息
DO $$
BEGIN
  RAISE NOTICE '✅ Supabase 数据库迁移完成！';
  RAISE NOTICE '已创建表: flight_logs, pilots, uavs';
  RAISE NOTICE '已启用行级安全 (RLS)';
  RAISE NOTICE '已创建索引和触发器';
  RAISE NOTICE '';
  RAISE NOTICE '下一步:';
  RAISE NOTICE '1. 在前端配置 .env 文件';
  RAISE NOTICE '2. 添加 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY';
  RAISE NOTICE '3. 重启应用';
END $$;

