
import React, { useState, useEffect } from 'react';
import { Subject, GradingRule } from '../types';
import { ICONS } from '../constants';

interface Props {
  subject: Subject;
  data: any;
  updateData: (key: string, value: any) => void;
  notify: (msg: string, type?: 'info' | 'error') => void;
}

const SubjectSettingsView: React.FC<Props> = ({ subject, data, updateData, notify }) => {
  const [rules, setRules] = useState<GradingRule[]>([]);

  // بارگذاری قوانین درس در هنگام تغییر درس انتخابی
  useEffect(() => {
    if (subject && subject.rules) {
      setRules([...subject.rules]);
    }
  }, [subject.id]); 

  const saveRules = () => {
    const updatedSubjects = data.subjects.map((s: Subject) => 
      s.id === subject.id ? { ...s, rules: [...rules] } : s
    );
    updateData('subjects', updatedSubjects);
    notify('تنظیمات نمرات با موفقیت ذخیره شد.');
  };

  const addRule = () => {
    const newRule: GradingRule = {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: 'آیتم جدید',
      maxGrade: 20,
      coefficient: 1,
      percentage: 0,
      isNegative: false
    };
    setRules(prev => [...prev, newRule]);
  };

  const removeRule = (id: string) => {
    // حذف مستقیم آیتم از وضعیت محلی
    setRules(prev => {
      const filtered = prev.filter(r => r.id !== id);
      if (filtered.length !== prev.length) {
        notify('آیتم حذف شد. حتماً دکمه "ذخیره نهایی" را بزنید.');
      }
      return filtered;
    });
  };

  const updateRule = (id: string, field: keyof GradingRule, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalPercent = rules.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
  const totalCoeff = rules.reduce((acc, r) => acc + (Number(r.coefficient) || 0), 0);

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-8 md:p-12 animate-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="text-center md:text-right">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">ساختار نمره‌دهی درس</h2>
          <p className="text-slate-400 font-bold text-sm">تنظیم سهم و ضرایب ارزیابی برای <span className="text-indigo-600 font-black">{subject.name}</span></p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={addRule}
             className="bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-4 rounded-[1.8rem] font-black text-sm transition-all flex items-center gap-3 shadow-xl shadow-indigo-100 active:scale-95"
           >
             <ICONS.Plus className="w-5 h-5" />
             افزودن سرفصل جدید
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-col lg:flex-row items-center gap-4 p-6 bg-slate-50/50 border-2 border-transparent hover:border-indigo-100 hover:bg-white rounded-[2.5rem] transition-all duration-300 shadow-sm">
            
            {/* دکمه حذف - برای دسترسی بهتر در سمت چپ (RTL) */}
            <div className="order-last lg:order-first">
              <button 
                type="button"
                onClick={() => removeRule(rule.id)}
                className="w-12 h-12 bg-white border border-rose-100 text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90"
                title="حذف این آیتم"
              >
                <ICONS.Trash className="w-5 h-5" />
              </button>
            </div>

            {/* ورودی‌ها */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">عنوان سرفصل</label>
                <input 
                  type="text" 
                  value={rule.name}
                  onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                  className="w-full px-6 py-3 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-2xl text-sm font-black outline-none shadow-sm transition-all"
                  placeholder="نام فعالیت..."
                />
              </div>
              
              <div className="space-y-1 text-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">سقف نمره</label>
                <input 
                  type="number" 
                  value={rule.maxGrade}
                  onChange={(e) => updateRule(rule.id, 'maxGrade', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-2xl text-base font-black outline-none text-center"
                />
              </div>

              <div className="space-y-1 text-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">ضریب</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={rule.coefficient}
                  onChange={(e) => updateRule(rule.id, 'coefficient', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-2xl text-base font-black outline-none text-center"
                />
              </div>

              <div className="space-y-1 text-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">سهم از ۱۰۰٪</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={rule.percentage}
                    onChange={(e) => updateRule(rule.id, 'percentage', Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-2xl text-base font-black outline-none text-center"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">%</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/20">
             <p className="text-slate-400 font-black">هیچ قانونی تعریف نشده است. با دکمه بالا سرفصل اضافه کنید.</p>
          </div>
        )}
      </div>

      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl">
        <div className="flex gap-12 text-[11px] font-black uppercase tracking-[0.2em]">
          <div className="flex flex-col gap-1 text-center md:text-right">
             <span className="text-slate-500">مجموع سهم‌ها</span>
             <span className={`text-2xl font-black ${totalPercent === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{totalPercent}%</span>
          </div>
          <div className="flex flex-col gap-1 text-center md:text-right">
             <span className="text-slate-500">مجموع ضرایب</span>
             <span className="text-2xl font-black text-indigo-400">{totalCoeff}</span>
          </div>
        </div>
        <button 
          onClick={saveRules}
          className="bg-indigo-600 text-white hover:bg-white hover:text-slate-900 px-16 py-5 rounded-[1.8rem] font-black text-lg tracking-tighter shadow-2xl transition-all duration-300 active:scale-95"
        >
          ذخیره نهایی تغییرات
        </button>
      </div>
    </div>
  );
};

export default SubjectSettingsView;
