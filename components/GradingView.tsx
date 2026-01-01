
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Subject, ClassRoom, Student, GradeEntry, AttendanceRecord, AttendanceStatus, GradingRule } from '../types';
import { ICONS } from '../constants';

interface Props {
  data: any;
  updateData: (key: string, value: any) => void;
  subject: Subject;
  classRoom: ClassRoom;
  notify: (msg: string, type?: 'info' | 'error') => void;
}

const GradingView: React.FC<Props> = ({ data, updateData, subject, classRoom, notify }) => {
  const getToday = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getToday());
  const [showSummary, setShowSummary] = useState(false);
  const [showRuleManager, setShowRuleManager] = useState<boolean>(false);
  const [localRules, setLocalRules] = useState<GradingRule[]>([]);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [activeCalendarType, setActiveCalendarType] = useState<'persian' | 'gregory' | 'islamic'>('persian');

  // تابع تبدیل تاریخ میلادی (ISO) به شمسی
  const toPersianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { 
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(d);
    } catch (e) { return dateStr; }
  };

  const getTripleDateDetails = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const format = (ca: string) => new Intl.DateTimeFormat(`fa-IR-u-ca-${ca}`, { 
        day: 'numeric', month: 'long', year: 'numeric', weekday: ca === 'persian' ? 'long' : undefined
      }).format(d);
      return { shamsi: format('persian'), miladi: format('gregory'), ghamari: format('islamic-umalqura') };
    } catch (e) { return null; }
  };

  const tripleDate = useMemo(() => getTripleDateDetails(date), [date]);
  const students = useMemo(() => data.students.filter((s: Student) => s.classId === classRoom.id), [data.students, classRoom.id]);

  useEffect(() => {
    const baseRules = subject.rules.map(r => ({ ...r, maxGrade: Number(r.maxGrade), coefficient: Number(r.coefficient) }));
    const entriesToday = data.gradeEntries.filter((e: GradeEntry) => e.subjectId === subject.id && e.date === date);
    
    const mergedRules = baseRules.map(br => {
      const sample = entriesToday.find(e => e.ruleId === br.id);
      if (sample) {
        return { 
          ...br, 
          name: sample.ruleNameAtTime || br.name, 
          maxGrade: Number(sample.maxAtTime), 
          coefficient: Number(sample.coefAtTime),
          isNegative: sample.note?.includes('نمره منفی') || br.isNegative
        };
      }
      return br;
    });

    entriesToday.forEach(e => {
      if (!mergedRules.find(r => r.id === e.ruleId)) {
        mergedRules.push({
          id: e.ruleId,
          name: e.ruleNameAtTime || 'آیتم جدید',
          maxGrade: Number(e.maxAtTime),
          coefficient: Number(e.coefAtTime),
          percentage: 0,
          isNegative: e.note?.includes('نمره منفی') || false
        });
      }
    });

    setLocalRules(mergedRules);
  }, [date, subject.id, subject.rules, data.gradeEntries]);

  const toggleIgnoredGrade = (entryId: string) => {
    const newList = data.gradeEntries.map((e: GradeEntry) => 
      e.id === entryId ? { ...e, isIgnored: !e.isIgnored } : e
    );
    updateData('gradeEntries', newList);
  };

  const calculateStudentFinal = (studentId: string) => {
    const studentEntries = data.gradeEntries.filter((e: GradeEntry) => 
      e.studentId === studentId && e.subjectId === subject.id && !e.isIgnored
    );
    if (studentEntries.length === 0) return "---";
    let weightedSum = 0, totalWeights = 0;
    studentEntries.forEach(e => {
      const isNegative = e.note?.includes('نمره منفی');
      const coef = Number(e.coefAtTime || 0);
      if (coef > 0) {
        const score20 = (e.value / e.maxAtTime) * 20;
        if (isNegative) weightedSum -= score20 * coef;
        else { weightedSum += score20 * coef; totalWeights += coef; }
      }
    });
    if (totalWeights === 0) return "۰.۰۰";
    return Math.max(0, weightedSum / totalWeights).toFixed(2);
  };

  const AnalysisModal = ({ studentId }: { studentId: string }) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const studentEntries = data.gradeEntries.filter((e: GradeEntry) => e.studentId === studentId && e.subjectId === subject.id);
    const studentAtt = data.attendanceRecords.filter((a: AttendanceRecord) => a.studentId === studentId && a.subjectId === subject.id);
    
    const finalGrade = calculateStudentFinal(studentId);
    
    const sessionAbsences = studentAtt.filter(a => a.status === 'absent' && !a.isIgnored).length;
    
    const effectiveAbsences = studentEntries.filter(e => {
        const attOnDate = studentAtt.find(a => a.date === e.date);
        return attOnDate?.status === 'absent' && !e.isIgnored && (e.coefAtTime || 0) > 0;
    }).length;

    const totalActiveCoeff = studentEntries.filter(e => !e.isIgnored).reduce((acc, e) => acc + (e.coefAtTime || 0), 0);

    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl bg-slate-900/80 overflow-hidden">
        <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl h-full max-h-[92vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-500">
          
          <div className="p-10 md:p-14 border-b flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-white font-black text-4xl shadow-2xl">
                {student.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{student.name}</h2>
                <div className="flex gap-4 mt-2">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest">آنالیز تحلیلی درس {subject.name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">معدل کل ترازشده</p>
               <h3 className="text-6xl font-black text-indigo-600 tracking-tighter">{finalGrade}</h3>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-10 md:p-14 space-y-12 no-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-rose-50 p-8 rounded-[2.5rem] border-2 border-rose-100 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">غیبت‌های موثر (آیتم‌ها)</p>
                    <h4 className="text-4xl font-black text-rose-600 tracking-tighter">{effectiveAbsences}</h4>
                    <p className="text-[9px] font-bold text-rose-300 mt-2">تعداد فعالیت‌های نمره‌دار در روزهای غیبت</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">غیبت جلسات (روزها)</p>
                    <h4 className="text-4xl font-black text-slate-800 tracking-tighter">{sessionAbsences}</h4>
                    <p className="text-[9px] font-bold text-slate-300 mt-2">تعداد کل روزهای ثبت شده به عنوان غایب</p>
                </div>
                <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-indigo-100 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">مجموع ضرایب موثر</p>
                    <h4 className="text-4xl font-black text-indigo-600 tracking-tighter">{totalActiveCoeff.toFixed(1)}</h4>
                    <p className="text-[9px] font-bold text-indigo-300 mt-2">مجموع وزن تمامی فعالیت‌های لحاظ شده</p>
                </div>
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-8">تاریخ شمسی و سرفصل</th>
                    <th className="p-8 text-center">وضعیت حضور</th>
                    <th className="p-8 text-center">ضریب</th>
                    <th className="p-8 text-center">نمره خام</th>
                    <th className="p-8 text-center">تراز ۲۰</th>
                    <th className="p-8 text-center">مدیریت (Ignore)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {studentEntries.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(e => {
                    const att = studentAtt.find(a => a.date === e.date);
                    const isNeg = e.note?.includes('نمره منفی');
                    const normalized = ((e.value / e.maxAtTime) * 20).toFixed(2);
                    const persianDate = toPersianDate(e.date);
                    
                    let statusColor = "text-slate-400 bg-slate-50";
                    let btnColor = "border-slate-200 text-slate-300";
                    
                    if (e.isIgnored) {
                      btnColor = "bg-slate-200 border-slate-300 text-slate-500 shadow-inner";
                    } else {
                      if (att?.status === 'present') {
                        statusColor = "text-emerald-600 bg-emerald-50";
                        btnColor = "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-100";
                      } else if (att?.status === 'absent') {
                        statusColor = "text-rose-600 bg-rose-50";
                        btnColor = "border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-100";
                      } else if (att?.status === 'late') {
                        statusColor = "text-amber-600 bg-amber-50";
                        btnColor = "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-100";
                      } else {
                        btnColor = "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100";
                      }
                    }

                    return (
                      <tr key={e.id} className={`transition-all duration-300 ${e.isIgnored ? 'opacity-40 grayscale bg-slate-50/30' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-8">
                          <p className="font-black text-slate-800 text-base">{e.ruleNameAtTime}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{persianDate} {isNeg && <span className="text-rose-500 mr-2">• نمره منفی</span>}</p>
                        </td>
                        <td className="p-8 text-center">
                          <span className={`px-5 py-2 rounded-2xl text-[10px] font-black ${statusColor}`}>
                            {att?.status === 'present' ? 'حاضر' : att?.status === 'absent' ? 'غایب' : att?.status === 'late' ? 'تأخیر' : 'ثبت نشده'}
                          </span>
                        </td>
                        <td className="p-8 text-center font-black text-slate-600 text-lg">{e.coefAtTime}</td>
                        <td className="p-8 text-center">
                          <span className="font-black text-slate-800 text-xl">{e.value}</span>
                          <span className="text-xs text-slate-300 font-bold"> / {e.maxAtTime}</span>
                        </td>
                        <td className="p-8 text-center">
                          <span className={`text-2xl font-black ${Number(normalized) >= 10 ? 'text-indigo-600' : 'text-rose-500'}`}>
                            {isNeg && '-'}{normalized}
                          </span>
                        </td>
                        <td className="p-8 text-center">
                          <button 
                            onClick={() => toggleIgnoredGrade(e.id)} 
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black transition-all border-2 active:scale-90 ${btnColor}`}
                          >
                            {e.isIgnored ? 'نادیده گرفته شده' : 'موثر در معدل'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {studentEntries.length === 0 && (
                <div className="py-32 text-center text-slate-300 font-black text-lg">هیچ داده‌ای برای نمایش یافت نشد.</div>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-100 border-t flex flex-col md:flex-row justify-between items-center gap-6 mt-auto">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100"><ICONS.Bell className="w-5 h-5" /></div>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-2xl">
                اطلاعات نمایش داده شده صرفاً مربوط به درس <span className="text-indigo-600">{subject.name}</span> است. تمامی محاسبات بر اساس ضرایب فعلی انجام شده‌اند.
              </p>
            </div>
            <button 
              onClick={() => setDetailStudentId(null)} 
              className="bg-slate-900 text-white hover:bg-indigo-600 px-8 py-3 rounded-2xl font-black text-xs shadow-xl transition-all active:scale-95 flex items-center gap-3 group"
            >
              بستن و بازگشت
              <ICONS.ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CalendarModal = () => {
    const [navDate, setNavDate] = useState(new Date(date));
    const calendarConfig = {
      persian: { label: 'شمسی', color: 'bg-indigo-600', locale: 'fa-IR-u-ca-persian' },
      gregory: { label: 'میلادی', color: 'bg-blue-600', locale: 'fa-IR-u-ca-gregory' },
      islamic: { label: 'قمری', color: 'bg-emerald-600', locale: 'fa-IR-u-ca-islamic-umalqura' }
    };
    const generateDays = () => {
      const days = [];
      const current = new Date(navDate); current.setDate(1);
      const startOfMonth = new Date(current);
      for (let i = -5; i < 37; i++) {
        const d = new Date(startOfMonth); d.setDate(i); days.push(d);
      }
      return days;
    };
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/40">
        <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="p-10 bg-slate-50 border-b flex flex-col gap-6">
            <div className="flex justify-between items-center">
               <h3 className="font-black text-slate-900 text-xl tracking-tighter">انتخاب تاریخ ارزیابی</h3>
               <button onClick={() => setShowCalendarModal(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100"><ICONS.Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              {(Object.keys(calendarConfig) as Array<keyof typeof calendarConfig>).map(type => (
                <button key={type} onClick={() => setActiveCalendarType(type)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeCalendarType === type ? `${calendarConfig[type].color} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-50'}`}>{calendarConfig[type].label}</button>
              ))}
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center px-4">
              <button onClick={() => { const d = new Date(navDate); d.setMonth(d.getMonth() - 1); setNavDate(d); }} className="p-4 bg-slate-100 rounded-2xl text-indigo-600"><ICONS.ChevronLeft className="w-5 h-5 rotate-180" /></button>
              <span className="font-black text-slate-800 text-lg">{new Intl.DateTimeFormat(calendarConfig[activeCalendarType].locale, { month: 'long', year: 'numeric' }).format(navDate)}</span>
              <button onClick={() => { const d = new Date(navDate); d.setMonth(d.getMonth() + 1); setNavDate(d); }} className="p-4 bg-slate-100 rounded-2xl text-indigo-600"><ICONS.ChevronLeft className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => (<div key={w} className="text-center text-[9px] font-black text-slate-300 py-2">{w}</div>))}
              {generateDays().slice(0, 35).map((d, i) => {
                const dateISO = d.toISOString().split('T')[0];
                const isSelected = dateISO === date;
                return (<button key={i} onClick={() => { setDate(dateISO); setShowCalendarModal(false); }} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-700 hover:bg-slate-100'}`}>{new Intl.DateTimeFormat(calendarConfig[activeCalendarType].locale, { day: 'numeric' }).format(d)}</button>);
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RuleManagerModal = () => {
    const [tempRules, setTempRules] = useState<GradingRule[]>([...localRules]);
    const rulesListRef = useRef<HTMLDivElement>(null);

    const handleAdd = () => {
      const newId = `local-${Date.now()}`;
      setTempRules([...tempRules, { id: newId, name: '', maxGrade: 20, coefficient: 1, percentage: 0, isNegative: false }]);
      setTimeout(() => {
        if (rulesListRef.current) {
          const inputs = rulesListRef.current.querySelectorAll('input[type="text"]');
          const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
          if (lastInput) { lastInput.focus(); lastInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }
      }, 50);
    };

    const handleRemove = (id: string) => { setTempRules(tempRules.filter(r => r.id !== id)); };
    const handleUpdate = (id: string, field: keyof GradingRule, val: any) => { setTempRules(tempRules.map(r => r.id === id ? { ...r, [field]: val } : r)); };
    const handleApply = () => {
      let filteredEntries = data.gradeEntries.filter((e: GradeEntry) => !(e.subjectId === subject.id && e.date === date));
      const newEntries: GradeEntry[] = [];
      tempRules.forEach(rule => {
        students.forEach(student => {
          const oldEntry = data.gradeEntries.find((e: GradeEntry) => e.studentId === student.id && e.ruleId === rule.id && e.date === date);
          newEntries.push({
            id: oldEntry?.id || `${Date.now()}-${student.id}-${rule.id}`,
            studentId: student.id,
            subjectId: subject.id,
            ruleId: rule.id,
            date: date,
            value: oldEntry?.value || 0,
            maxAtTime: rule.maxGrade,
            coefAtTime: rule.coefficient,
            percentAtTime: rule.percentage,
            ruleNameAtTime: rule.name,
            note: rule.isNegative ? 'نمره منفی' : (oldEntry?.note || ''),
            isIgnored: oldEntry?.isIgnored || false
          });
        });
      });
      updateData('gradeEntries', [...filteredEntries, ...newEntries]);
      setLocalRules(tempRules);
      setShowRuleManager(false);
      notify('تغییرات با موفقیت بر روی لیست نمرات امروز اعمال شد.');
    };

    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/60">
        <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
          <div className="p-10 bg-slate-50 border-b flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 text-2xl tracking-tighter">شخصی‌سازی ستون‌های نمره</h3>
              <p className="text-xs font-bold text-slate-400 mt-2">تغییرات فقط برای همین تاریخ اعمال می‌شود.</p>
            </div>
            <button onClick={handleAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-90 transition-all">
               <ICONS.Plus className="w-5 h-5" /> افزودن ستون جدید
            </button>
          </div>
          <div ref={rulesListRef} className="p-10 space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
            {tempRules.map((rule) => (
              <div key={rule.id} className="flex flex-col md:flex-row items-center gap-4 p-6 bg-white border-2 border-slate-100 rounded-3xl">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">عنوان فعالیت</label><input type="text" value={rule.name} onChange={e => handleUpdate(rule.id, 'name', e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black outline-none border-2 border-transparent focus:border-indigo-400 transition-all" /></div>
                  <div className="space-y-1 text-center"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">سقف نمره</label><input type="number" value={rule.maxGrade} onChange={e => handleUpdate(rule.id, 'maxGrade', Number(e.target.value))} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black outline-none text-center border-2 border-transparent focus:border-indigo-400 transition-all" /></div>
                  <div className="space-y-1 text-center"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">ضریب وزنی</label><input type="number" step="0.1" value={rule.coefficient} onChange={e => handleUpdate(rule.id, 'coefficient', Number(e.target.value))} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-black outline-none text-center border-2 border-transparent focus:border-indigo-400 transition-all" /></div>
                  <div className="flex items-center justify-center pt-5"><button onClick={() => handleUpdate(rule.id, 'isNegative', !rule.isNegative)} className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${rule.isNegative ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-white border-slate-100 text-slate-300'}`}>{rule.isNegative ? 'نمره منفی فعال' : 'تبدیل به منفی'}</button></div>
                </div>
                <button onClick={() => handleRemove(rule.id)} className="p-4 text-slate-300 hover:text-rose-600 transition-colors"><ICONS.Trash className="w-6 h-6" /></button>
              </div>
            ))}
          </div>
          <div className="p-10 bg-slate-50 border-t flex gap-4">
             <button onClick={() => setShowRuleManager(false)} className="flex-1 py-5 bg-white text-slate-400 rounded-[1.8rem] font-black text-sm border-2 active:scale-95 transition-all">انصراف</button>
             <button onClick={handleApply} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black text-sm shadow-xl active:scale-95 transition-all">تایید و همگام‌سازی</button>
          </div>
        </div>
      </div>
    );
  };

  const updateGrade = (studentId: string, ruleId: string, val: any) => {
    const existing = data.gradeEntries.find((e: GradeEntry) => e.studentId === studentId && e.ruleId === ruleId && e.date === date);
    const rule = localRules.find(r => r.id === ruleId);
    if (!rule) return;
    let num = parseFloat(val); if (isNaN(num)) num = 0;
    const finalVal = Math.min(Math.max(0, num), Number(rule.maxGrade));
    const updatedEntry: GradeEntry = existing ? { ...existing, value: finalVal } : { id: `${Date.now()}-${studentId}-${ruleId}`, studentId, subjectId: subject.id, ruleId, date, value: finalVal, maxAtTime: Number(rule.maxGrade), coefAtTime: Number(rule.coefficient), percentAtTime: Number(rule.percentage || 0), ruleNameAtTime: rule.name, note: rule.isNegative ? 'نمره منفی' : '', isIgnored: false };
    updateData('gradeEntries', existing ? data.gradeEntries.map((e: GradeEntry) => e.id === existing.id ? updatedEntry : e) : [...data.gradeEntries, updatedEntry]);
  };

  const toggleAttendance = (studentId: string) => {
    const existing = data.attendanceRecords.find((a: AttendanceRecord) => a.studentId === studentId && a.date === date);
    let newStatus: AttendanceStatus = existing?.status === 'present' ? 'absent' : existing?.status === 'absent' ? 'late' : 'present';
    
    // هنگام غایب کردن، تمام نمرات همان روز دانش‌آموز را صفر کن تا در آنالیز ریزنمرات لحاظ شود
    let newGradeEntries = [...data.gradeEntries];
    if (newStatus === 'absent') {
      localRules.forEach(rule => {
        const entryIdx = newGradeEntries.findIndex(e => e.studentId === studentId && e.ruleId === rule.id && e.date === date);
        const updatedEntry: GradeEntry = {
          id: entryIdx !== -1 ? newGradeEntries[entryIdx].id : `${Date.now()}-${studentId}-${rule.id}`,
          studentId,
          subjectId: subject.id,
          ruleId: rule.id,
          date,
          value: 0,
          maxAtTime: Number(rule.maxGrade),
          coefAtTime: Number(rule.coefficient),
          percentAtTime: Number(rule.percentage || 0),
          ruleNameAtTime: rule.name,
          note: 'غایب',
          isIgnored: false
        };
        if (entryIdx !== -1) newGradeEntries[entryIdx] = updatedEntry;
        else newGradeEntries.push(updatedEntry);
      });
    }

    const newAttendanceRecords = existing 
      ? data.attendanceRecords.map((a: AttendanceRecord) => a.id === existing.id ? { ...a, status: newStatus } : a)
      : [...data.attendanceRecords, { id: `${Date.now()}-${studentId}`, studentId, subjectId: subject.id, date, status: newStatus, isIgnored: false }];

    updateData('gradeEntries', newGradeEntries);
    updateData('attendanceRecords', newAttendanceRecords);
  };

  return (
    <div className="space-y-12 pb-32">
      <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div onClick={() => setShowCalendarModal(true)} className="relative cursor-pointer group">
            <div className="bg-slate-50 border-2 border-slate-50 hover:border-indigo-500 p-6 rounded-[2.8rem] flex items-center gap-6 shadow-sm transition-all">
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white"><ICONS.Calendar className="w-8 h-8" /></div>
              <div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">تاریخ ارزیابی</p><h4 className="text-xl font-black text-slate-800 tracking-tighter">{tripleDate?.shamsi}</h4></div>
            </div>
          </div>
          <button onClick={() => setShowRuleManager(true)} className="flex items-center gap-5 px-12 py-7 rounded-[2.8rem] font-black text-xs border-2 bg-white border-slate-100 text-slate-600 hover:border-indigo-500 hover:shadow-xl active:scale-95 transition-all">
            <ICONS.Settings className="w-6 h-6" /> شخصی‌سازی ضرایب امروز
          </button>
        </div>
        <button onClick={() => setShowSummary(!showSummary)} className={`px-12 py-7 rounded-[2.8rem] font-black text-xs flex items-center gap-5 shadow-2xl transition-all active:scale-95 ${showSummary ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
          {showSummary ? <><ICONS.Edit className="w-6 h-6" /> بازگشت به لیست</> : <><ICONS.Eye className="w-6 h-6" /> مشاهده پرونده جامع</>}
        </button>
      </div>

      <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-right border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="p-10 text-center w-20">#</th><th className="p-10 sticky right-0 bg-slate-50 z-10 border-l">دانش‌آموز</th>
                {!showSummary ? (<><th className="p-10 text-center w-48">حضور غیاب</th>{localRules.map(rule => (<th key={rule.id} className="p-10 text-center min-w-[160px]"><div className="flex flex-col items-center"><span className={`text-sm font-black ${rule.isNegative ? 'text-rose-600' : 'text-slate-800'}`}>{rule.name}</span><span className="text-[9px] text-slate-300 font-bold mt-1">({rule.maxGrade} نمره - ضریب {rule.coefficient})</span></div></th>))}</>) : (<><th className="p-10 text-center w-56">معدل کل (۲۰)</th><th className="p-10 text-center">عملیات آنالیز</th></>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student, idx) => {
                const att = data.attendanceRecords.find((a:any)=>a.studentId===student.id && a.date===date);
                const isAbsent = att?.status === 'absent';
                return (
                  <tr key={student.id} className={`hover:bg-slate-50/40 transition-all ${isAbsent ? 'bg-rose-50/20' : ''}`}>
                    <td className="p-10 text-center text-slate-300 font-black text-xl">{idx + 1}</td>
                    <td className="p-10 sticky right-0 bg-white z-10 border-l font-black text-slate-700 text-lg">{student.name}</td>
                    {!showSummary ? (<>
                      <td className="p-10 text-center"><button onClick={() => toggleAttendance(student.id)} className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all border-2 active:scale-95 ${att?.status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white' : isAbsent ? 'bg-rose-500 border-rose-500 text-white' : att?.status === 'late' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-100 text-slate-300'}`}>{att?.status === 'present' ? 'حاضر' : isAbsent ? 'غایب' : att?.status === 'late' ? 'تأخیر' : 'ثبت'}</button></td>
                      {localRules.map(rule => { 
                        const entry = data.gradeEntries.find((e: GradeEntry) => e.studentId === student.id && e.ruleId === rule.id && e.date === date); 
                        return (
                          <td key={rule.id} className="p-10">
                            <div className="relative group w-24 mx-auto">
                              <input 
                                type="number" 
                                value={isAbsent ? 0 : (entry?.value ?? '')} 
                                placeholder={isAbsent ? "0" : "--"} 
                                disabled={isAbsent} 
                                onChange={(e) => updateGrade(student.id, rule.id, e.target.value)} 
                                className={`w-full p-4 rounded-2xl text-center font-black text-2xl outline-none transition-all ${
                                  isAbsent 
                                    ? 'bg-slate-50 text-slate-300 opacity-30 cursor-not-allowed select-none' 
                                    : 'bg-slate-50 focus:bg-white focus:ring-2 ring-indigo-500 border-2 border-transparent focus:border-indigo-200'
                                }`} 
                              />
                            </div>
                          </td>
                        ); 
                      })}
                    </>) : (<><td className="p-10 text-center"><span className="text-4xl font-black text-indigo-600">{calculateStudentFinal(student.id)}</span></td><td className="p-10 text-center"><button onClick={() => setDetailStudentId(student.id)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black active:scale-95 transition-all">آنالیز ریزنمرات</button></td></>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCalendarModal && <CalendarModal />}
      {showRuleManager && <RuleManagerModal />}
      {detailStudentId && <AnalysisModal studentId={detailStudentId} />}
      
      <div className="fixed bottom-10 left-10 right-96 z-40 p-8 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center shadow-2xl border border-white/5 animate-in slide-in-from-bottom-10">
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400"><ICONS.Save className="w-6 h-6" /></div>
            <h4 className="font-black tracking-tight">تغییرات شما به صورت خودکار در مرورگر ذخیره شد.</h4>
         </div>
         <button onClick={() => notify('اطلاعات جلسه ارزیابی با موفقیت ثبت نهایی شد.')} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-sm hover:bg-white hover:text-slate-950 transition-all shadow-xl active:scale-95">تأیید نهایی</button>
      </div>
    </div>
  );
};

export default GradingView;
