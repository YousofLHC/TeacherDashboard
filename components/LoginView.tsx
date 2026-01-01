
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface Props {
  onLogin: (username: string, password: string, isRegister: boolean) => void;
  error?: string | null;
}

const LoginView: React.FC<Props> = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    if (isRegister && password !== confirmPassword) {
      alert('رمز عبور و تایید آن مطابقت ندارند.');
      return;
    }

    onLogin(username, password, isRegister);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 font-sans antialiased">
      <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] w-full max-w-xl border border-slate-100 flex flex-col items-center">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 mb-10 transform -rotate-6">
          <ICONS.Layout className="w-12 h-12 text-white rotate-6" />
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">
            {isRegister ? 'ثبت‌نام دبیر جدید' : 'ورود به سامانه مدیریت'}
          </h1>
          <p className="text-slate-500 font-medium text-base max-w-sm mx-auto leading-relaxed">
            {isRegister 
              ? 'با ایجاد حساب کاربری، از تمامی امکانات هوشمند مدیریت کلاس بهره‌مند شوید.' 
              : 'برای دسترسی به پنل نمرات و انضباط، اطلاعات حساب خود را وارد نمایید.'}
          </p>
        </div>

        {error && (
          <div className="w-full bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl text-sm font-bold mb-8 animate-pulse text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-3">نام کاربری</label>
            <div className="relative">
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                <ICONS.User className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full pl-6 pr-14 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
                placeholder="مثلا: m_ahmadi"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-3">گذرواژه</label>
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <ICONS.EyeOff className="w-5 h-5" /> : <ICONS.Eye className="w-5 h-5" />}
              </button>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                <ICONS.Settings className="w-5 h-5" />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-14 pr-14 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-3">تایید گذرواژه</label>
              <div className="relative">
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                  <ICONS.Save className="w-5 h-5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-6 pr-14 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black tracking-tight transition-all shadow-xl shadow-slate-200 active:scale-[0.98] text-xl mt-4"
          >
            {isRegister ? 'ایجاد حساب و ورود' : 'ورود به پنل کاربری'}
          </button>
        </form>
        
        <div className="mt-12 pt-8 border-t border-slate-100 w-full flex flex-col items-center gap-6">
          <button 
            onClick={() => { setIsRegister(!isRegister); setUsername(''); setPassword(''); }}
            className="text-indigo-600 font-black text-sm hover:underline underline-offset-8 transition-all"
          >
            {isRegister ? 'قبلاً عضو شده‌اید؟ وارد شوید' : 'هنوز عضو نشده‌اید؟ ثبت‌نام کنید'}
          </button>
          
          <div className="flex items-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span>اتصال امن به مرکز داده‌ها برقرار است</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
