-- ================================================
-- Supabase 数据库迁移脚本 - 点検整備記録表 (様式3)
-- 执行时间: 2025-12-04
-- CSV字段: 点検整備ID, 作成年月日, 実施年月日, 点検整備総時間, 前回実施年月日,
--          実施者ID, 実施者名, ドローンID, ドローン名, ドローン登録記号,
--          実施場所ID, 実施場所名, 実施場所地番, 備考, 実施理由,
--          点検整備内容(装備品等の交換), 点検整備内容(定期点検の実施),
--          点検整備内容(装置等の取付け・取卸し記録), 点検整備内容(その他点検整備等)
-- ================================================

-- ================================================
-- 1. 创建点検整備記録表 (maintenance_records)
-- ================================================

CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本情報
  created_at TIMESTAMPTZ DEFAULT NOW(),           -- 作成年月日
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  execution_date DATE NOT NULL,                   -- 実施年月日
  total_flight_time_at_moment TEXT,              -- 点検整備総時間（その時点の総飛行時間）
  previous_execution_date DATE,                   -- 前回実施年月日
  
  -- 実施者情報
  executor_id TEXT,                               -- 実施者ID
  executor_name TEXT,                             -- 実施者名
  
  -- ドローン情報
  drone_id TEXT,                                  -- ドローンID
  drone_name TEXT,                                -- ドローン名
  drone_registration_mark TEXT,                   -- ドローン登録記号（例: JU2321）
  
  -- 実施場所情報
  execution_place_id TEXT,                        -- 実施場所ID
  execution_place_name TEXT,                      -- 実施場所名
  execution_place_address TEXT,                   -- 実施場所地番
  
  -- 備考・理由
  remarks TEXT,                                   -- 備考
  reason TEXT,                                    -- 実施理由
  
  -- 点検整備内容（4つのカテゴリ）
  content_equipment_replacement TEXT,             -- 装備品等の交換
  content_regular_inspection TEXT,                -- 定期点検の実施
  content_installation_removal TEXT,              -- 装置等の取付け・取卸し記録
  content_other TEXT,                             -- その他点検整備等
  
  -- 同步状态
  sync_status TEXT DEFAULT 'synced',
  
  -- 論理削除
  deleted_at TIMESTAMPTZ
);

-- ================================================
-- 2. 创建索引
-- ================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON public.maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_execution_date ON public.maintenance_records(execution_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_drone_id ON public.maintenance_records(drone_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_executor_id ON public.maintenance_records(executor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_drone_registration ON public.maintenance_records(drone_registration_mark);

-- ================================================
-- 3. 添加注释
-- ================================================

COMMENT ON TABLE public.maintenance_records IS '点検整備記録表（様式3）- 無人航空機の点検整備記録';
COMMENT ON COLUMN public.maintenance_records.execution_date IS '実施年月日';
COMMENT ON COLUMN public.maintenance_records.total_flight_time_at_moment IS 'その時点の総飛行時間';
COMMENT ON COLUMN public.maintenance_records.previous_execution_date IS '前回実施年月日';
COMMENT ON COLUMN public.maintenance_records.executor_id IS '実施者ID';
COMMENT ON COLUMN public.maintenance_records.executor_name IS '実施者名';
COMMENT ON COLUMN public.maintenance_records.drone_id IS 'ドローンID';
COMMENT ON COLUMN public.maintenance_records.drone_name IS 'ドローン名';
COMMENT ON COLUMN public.maintenance_records.drone_registration_mark IS 'ドローン登録記号（例: JU2321）';
COMMENT ON COLUMN public.maintenance_records.execution_place_id IS '実施場所ID';
COMMENT ON COLUMN public.maintenance_records.execution_place_name IS '実施場所名';
COMMENT ON COLUMN public.maintenance_records.execution_place_address IS '実施場所地番';
COMMENT ON COLUMN public.maintenance_records.remarks IS '備考';
COMMENT ON COLUMN public.maintenance_records.reason IS '実施理由';
COMMENT ON COLUMN public.maintenance_records.content_equipment_replacement IS '点検整備内容: 装備品等の交換';
COMMENT ON COLUMN public.maintenance_records.content_regular_inspection IS '点検整備内容: 定期点検の実施';
COMMENT ON COLUMN public.maintenance_records.content_installation_removal IS '点検整備内容: 装置等の取付け・取卸し記録';
COMMENT ON COLUMN public.maintenance_records.content_other IS '点検整備内容: その他点検整備等';

-- ================================================
-- 4. 启用行级安全 (Row Level Security)
-- ================================================

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. 创建 RLS 策略
-- ================================================

-- 点検整備記録策略：用户只能访问自己的记录
CREATE POLICY "Users can view own maintenance records"
  ON public.maintenance_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance records"
  ON public.maintenance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance records"
  ON public.maintenance_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance records"
  ON public.maintenance_records FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================
-- 6. 创建更新时间戳的触发器
-- ================================================

CREATE TRIGGER set_updated_at_maintenance_records
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- 7. 授予权限
-- ================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;

-- ================================================
-- 8. 验证表结构
-- ================================================

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance_records' 
ORDER BY ordinal_position;

-- ================================================
-- 完成
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 点検整備記録テーブルの作成が完了しました！';
  RAISE NOTICE '✅ maintenance_records テーブルを作成しました';
  RAISE NOTICE '✅ RLSポリシーを設定しました';
  RAISE NOTICE '✅ インデックスを作成しました';
  RAISE NOTICE '';
  RAISE NOTICE 'CSV出力フィールド:';
  RAISE NOTICE '- 点検整備ID, 作成年月日, 実施年月日, 点検整備総時間';
  RAISE NOTICE '- 前回実施年月日, 実施者ID, 実施者名';
  RAISE NOTICE '- ドローンID, ドローン名, ドローン登録記号';
  RAISE NOTICE '- 実施場所ID, 実施場所名, 実施場所地番';
  RAISE NOTICE '- 備考, 実施理由';
  RAISE NOTICE '- 点検整備内容（4カテゴリ）';
END $$;

