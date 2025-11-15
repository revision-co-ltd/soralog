// 认证模态框 - 登录/注册
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 入力検証
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上必要です');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);

    try {
      // 动态导入 Supabase 服务
      const { supabaseAuth } = await import('../services/supabase.service');

      if (mode === 'login') {
        // ログイン
        const { user } = await supabaseAuth.signInWithEmail(email, password);
        console.log('✅ ログイン成功:', user.email);
        onSuccess(user);
        // onClose は親コンポーネントが処理
      } else {
        // 新規登録
        const { user } = await supabaseAuth.signUpWithEmail(email, password);
        console.log('✅ 登録成功:', user.email);
        setSuccessMessage('登録成功！自動的にログインしています...');
        
        // 自動的にログイン状態にする
        setTimeout(() => {
          onSuccess(user);
          // onClose は親コンポーネントが処理
        }, 1000);
      }
    } catch (err: any) {
      console.error('❌ 认证失败:', err);
      
      // エラーメッセージ
      if (err.message.includes('Invalid login credentials')) {
        setError('メールアドレスまたはパスワードが間違っています');
      } else if (err.message.includes('User already registered')) {
        setError('このメールアドレスは既に登録されています');
      } else {
        setError(err.message || '操作に失敗しました。もう一度お試しください');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            アカウントログイン
          </DialogTitle>
          <DialogDescription>
            ログイン後、複数のデバイス間でデータを同期できます
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => {
          setMode(v as 'login' | 'register');
          handleReset();
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">ログイン</TabsTrigger>
            <TabsTrigger value="register">新規登録</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertDescription className="text-green-600">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    ログイン
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-500">
              <p>アカウントをお持ちでない方は
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal"
                  onClick={() => setMode('register')}
                >
                  新規登録
                </Button>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">パスワード</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="6文字以上"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">パスワード確認</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="パスワードを再入力"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertDescription className="text-green-600">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    新規登録
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-500">
              <p>既にアカウントをお持ちの方は
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal"
                  onClick={() => setMode('login')}
                >
                  ログイン
                </Button>
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 <strong>ヒント：</strong></p>
            <p>• 新規登録後、すぐにログインして使用できます</p>
            <p>• データは自動的にクラウドに同期されます</p>
            <p>• 複数のデバイス間でデータを共有できます</p>
            <p>• オフラインでも通常通り使用できます</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

