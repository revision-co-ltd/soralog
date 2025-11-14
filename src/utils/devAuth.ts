// 開発環境用認証ヘルパー
// 本番環境では削除または無効化してください

/**
 * 開発用デモトークンを生成
 * 注意: これは開発環境専用です。本番では使用しないでください。
 */
export function generateDevToken(): string {
  // シンプルなデモトークン（実際のJWTではない）
  const demoToken = 'dev-token-' + Date.now();
  localStorage.setItem('auth_token', demoToken);
  localStorage.setItem('token', demoToken);
  return demoToken;
}

/**
 * 開発用トークンをクリア
 */
export function clearDevToken(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
}

/**
 * 開発用トークンが存在するかチェック
 */
export function hasDevToken(): boolean {
  return !!(localStorage.getItem('auth_token') || localStorage.getItem('token'));
}

/**
 * コンソールに開発用認証情報を表示
 */
export function showDevAuthInfo(): void {
  console.log('=== 🔧 開発環境用認証ヘルパー ===');
  console.log('');
  console.log('導出機能をテストするには:');
  console.log('1. ブラウザコンソールで以下を実行:');
  console.log('   localStorage.setItem("auth_token", "dev-token")');
  console.log('');
  console.log('2. または、App起動時に自動設定されます');
  console.log('');
  console.log('現在のトークン:', localStorage.getItem('auth_token') || 'なし');
  console.log('===================================');
}

