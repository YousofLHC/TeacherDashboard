
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
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = () => {
    if (username.length < 4) return 'نام کاربری باید حداقل ۴ کاراکتر باشد.';
    if (password.length < 6) return 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
    if (isRegister && password !== confirmPassword) return 'تکرار رمز عبور با رمز عبور اصلی مطابقت ندارد.';
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }

    onLogin(username.trim(), password.trim(), isRegister);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 font-sans antialiased">
      <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] w-full max-w-xl border border-slate-100 flex flex-col items-center">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 mb-10 transform -rotate-6">
          <ICONS.Layout className="w-12 h-12 text-white rotate-6" />
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">
            {isRegister ? 'عضویت در سامانه' : 'خوش آمدید'}
          </h1>
          <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto leading-relaxed">
            {isRegister 
              ? 'اطلاعات خود را برای ایجاد پنل مدیریت هوشمند وارد کنید.' 
              : 'نام کاربری و رمز عبور خود را برای ورود به پنل وارد نمایید.'}
          </p>
          {!isRegister && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
               <p className="text-[10px] font-black text-indigo-600 uppercase">ورود سریع با داده‌های پیش‌فرض:</p>
               <p className="text-xs font-bold text-slate-600">نام کاربری: <span className="text-indigo-700">admin</span> | رمز: <span className="text-indigo-700">admin123</span></p>
            </div>
          )}
        </div>

        {displayError && (
          <div className="w-full bg-rose-50 border-2 border-rose-100 text-rose-600 px-6 py-4 rounded-3xl text-xs font-black mb-8 animate-bounce text-center">
            {displayError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">نام کاربری</label>
            <div className="relative">
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                <ICONS.User className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300"
                placeholder="نام کاربری شما..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">گذرواژه</label>
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
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
                className="w-full pl-14 pr-14 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300"
                placeholder="حداقل ۶ کاراکتر..."
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">تایید گذرواژه</label>
              <div className="relative">
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                  <ICONS.Save className="w-5 h-5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300"
                  placeholder="تکرار رمز عبور..."
                />
              </div>
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-[1.8rem] font-black tracking-tight transition-all shadow-xl active:scale-95 text-lg mt-4"
          >
            {isRegister ? 'عضویت و ورود هوشمند' : 'ورود به پنل کاربری'}
          </button>
        </form>
        
        <div className="mt-10 pt-6 border-t border-slate-50 w-full flex flex-col items-center gap-4">
          <button 
            onClick={() => { setIsRegister(!isRegister); setUsername(''); setPassword(''); setLocalError(null); }}
            className="text-indigo-600 font-black text-xs hover:text-indigo-800 transition-all"
          >
            {isRegister ? 'حساب دارید؟ وارد شوید' : 'حساب ندارید؟ ثبت‌نام رایگان'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
