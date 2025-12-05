-- ================================================
-- Supabase 数据库迁移脚本 - 添加缺失字段
-- 执行时间: 2025-12-04
-- ================================================

-- 添加飞行记录表的新字段
ALTER TABLE public.flight_logs 
ADD COLUMN IF NOT EXISTS takeoff_time TEXT,
ADD COLUMN IF NOT EXISTS landing_time TEXT,
ADD COLUMN IF NOT EXISTS outline TEXT,
ADD COLUMN IF NOT EXISTS is_tokutei_flight BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tokutei_flight_categories TEXT[],
ADD COLUMN IF NOT EXISTS flight_plan_notified BOOLEAN DEFAULT FALSE;

-- 添加注释
COMMENT ON COLUMN public.flight_logs.takeoff_time IS '离陆时刻 HH:mm';
COMMENT ON COLUMN public.flight_logs.landing_time IS '着陆时刻 HH:mm';
COMMENT ON COLUMN public.flight_logs.outline IS '飞行概要';
COMMENT ON COLUMN public.flight_logs.is_tokutei_flight IS '是否为特定飞行';
COMMENT ON COLUMN public.flight_logs.tokutei_flight_categories IS '特定飞行类别数组';
COMMENT ON COLUMN public.flight_logs.flight_plan_notified IS '是否已通报飞行计划';

-- 验证添加的字段
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'flight_logs' 
AND column_name IN ('takeoff_time', 'landing_time', 'outline', 'is_tokutei_flight', 'tokutei_flight_categories', 'flight_plan_notified');

-- 显示完成消息
DO $$
BEGIN
  RAISE NOTICE '✅ 字段添加完成！';
  RAISE NOTICE '已添加: takeoff_time, landing_time, outline, is_tokutei_flight, tokutei_flight_categories, flight_plan_notified';
END $$;


