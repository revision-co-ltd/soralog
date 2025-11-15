// 认证上下文 - 管理全局用户状态
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查用户状态
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { supabaseAuth } = await import('../services/supabase.service');
      const currentUser = await supabaseAuth.getCurrentUser();
      
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
          created_at: currentUser.created_at,
        });
        console.log('👤 用户已登录:', currentUser.email);
      } else {
        console.log('👤 未登录');
      }
    } catch (error) {
      console.warn('⚠️ 检查用户状态失败（可能未配置Supabase）:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { supabaseAuth } = await import('../services/supabase.service');
      const { user: authUser } = await supabaseAuth.signInWithEmail(email, password);
      
      const userData: User = {
        id: authUser.id,
        email: authUser.email || email,
        created_at: authUser.created_at,
      };
      
      setUser(userData);
      console.log('✅ 登录成功:', userData.email);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { supabaseAuth } = await import('../services/supabase.service');
      const { user: authUser } = await supabaseAuth.signUpWithEmail(email, password);
      
      const userData: User = {
        id: authUser.id,
        email: authUser.email || email,
        created_at: authUser.created_at,
      };
      
      setUser(userData);
      console.log('✅ 注册成功:', userData.email);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { supabaseAuth } = await import('../services/supabase.service');
      await supabaseAuth.signOut();
      setUser(null);
      console.log('👋 已登出');
      
      // 可选：清除本地缓存
      // localStorage.clear();
      // indexedDB.deleteDatabase('DroneLogDB');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

