
import React, { useState } from 'react';
import { Teacher } from '../types';
import { ICONS } from '../constants';

interface Props {
  currentUser: Teacher;
  updateData: (key: string, value: any) => void;
  data: any;
  notify: (msg: string) => void;
}

const AccountView: React.FC<Props> = ({ currentUser, updateData, data, notify }) => {
  const [profile, setProfile] = useState({
    fullName: currentUser.fullName || '',
    email: currentUser.email || '',
    username: currentUser.username,
  });

  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: ''
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTeachers = data.teachers.map((t: Teacher) => 
      t.id === currentUser.id ? { ...t, ...profile } : t
    );
    updateData('teachers', updatedTeachers);
    notify('اطلاعات کاربری با موفقیت به‌روزرسانی شد.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      notify('رمز جدید و تایید آن همخوانی ندارند.');
      return;
    }
    // Simple mock logic for demo
    const updatedTeachers = data.teachers.map((t: Teacher) => 
      t.id === currentUser.id ? { ...t, password: passwords.new } : t
    );
    updateData('teachers', updatedTeachers);
    notify('رمز عبور شما با موفقیت تغییر یافت.');
    setPasswords({ old: '', new: '', confirm: '' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
      {/* Profile Section */}
      <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl border border-slate-50 flex flex-col gap-10">
        <div className="flex items-center gap-6">
           <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <ICONS.User className="w-10 h-10" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">اطلاعات شناسایی</h2>
              <p className="text-slate-400 font-bold text-sm">ویرایش مشخصات اصلی دبیر در سامانه</p>
           </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">نام و نام خانوادگی</label>
            <input 
              type="text" 
              value={profile.fullName}
              onChange={(e) => setProfile({...profile, fullName: e.target.value})}
              className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-black outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">پست الکترونیک</label>
            <input 
              type="email" 
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-black outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2 opacity-60">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">نام کاربری (غیر قابل تغییر)</label>
            <input 
              type="text" 
              value={profile.username}
              disabled
              className="w-full px-8 py-5 rounded-3xl bg-slate-100 border-2 border-transparent text-slate-500 font-black outline-none"
            />
          </div>
          <button className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black tracking-tighter hover:bg-indigo-600 transition-all shadow-xl active:scale-[0.98]">
            ذخیره تغییرات مشخصات
          </button>
        </form>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl border border-slate-50 flex flex-col gap-10">
        <div className="flex items-center gap-6">
           <div className="w-20 h-20 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <ICONS.Settings className="w-10 h-10" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">امنیت و گذرواژه</h2>
              <p className="text-slate-400 font-bold text-sm">مدیریت دسترسی و امنیت حساب کاربری</p>
           </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">رمز عبور فعلی</label>
            <input 
              type="password" 
              value={passwords.old}
              onChange={(e) => setPasswords({...passwords, old: e.target.value})}
              className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-black outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">رمز عبور جدید</label>
            <input 
              type="password" 
              value={passwords.new}
              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-black outline-none transition-all shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">تکرار رمز عبور جدید</label>
            <input 
              type="password" 
              value={passwords.confirm}
              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              className="w-full px-8 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-black outline-none transition-all shadow-sm"
            />
          </div>
          <button className="w-full bg-rose-600 text-white py-5 rounded-[2rem] font-black tracking-tighter hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 active:scale-[0.98]">
            تغییر گذرواژه اختصاصی
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountView;
