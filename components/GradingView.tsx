
import React, { useState, useMemo, useEffect } from 'react';
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
  // تنظیم تاریخ پیش‌فرض بر روی امروز (Today)
  const getToday = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getToday());
  const [showSummary, setShowSummary] = useState(false);
  const [editingOverrides, setEditingOverrides] = useState<string | null>(null);
  const [showRuleManager, setShowRuleManager] = useState<boolean>(false);
  const [localRules, setLocalRules] = useState<GradingRule[]>([]);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [activeCalendarType, setActiveCalendarType] = useState<'persian' | 'gregory' | 'islamic'>('persian');

  // تابع پیشرفته برای دریافت جزئیات دقیق تاریخ‌ها با اصلاح باگ میلادی
  const getTripleDateDetails = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;

      const format = (ca: string) => new Intl.DateTimeFormat(`fa-IR-u-ca-${ca}`, { 
        day: 'numeric', month: 'long', year: 'numeric', weekday: ca === 'persian' ? 'long' : undefined
      }).format(d);

      return {
        shamsi: format('persian'),
        miladi: format('gregory'),
        ghamari: format('islamic-umalqura')
      };
    } catch (e) {
      return null;
    }
  };

  const tripleDate = useMemo(() => getTripleDateDetails(date), [date]);

  const students = useMemo(() => data.students.filter((s: Student) => s.classId === classRoom.id), [data.students, classRoom.id]);

  useEffect(() => {
    const baseRules = subject.rules.map(r => ({
      ...r,
      maxGrade: Number(r.maxGrade),
      coefficient: Number(r.coefficient)
    }));

    const entriesToday = data.gradeEntries.filter((e: GradeEntry) => e.subjectId === subject.id && e.date === date);
    const mergedRules = [...baseRules];
    
    entriesToday.forEach((e: GradeEntry) => {
      const existingIdx = mergedRules.findIndex(r => r.id === e.ruleId);
      if (existingIdx !== -1) {
        mergedRules[existingIdx] = {
          ...mergedRules[existingIdx],
          name: e.ruleNameAtTime || mergedRules[existingIdx].name,
          maxGrade: Number(e.maxAtTime),
          coefficient: Number(e.coefAtTime)
        };
      } else {
        mergedRules.push({
          id: e.ruleId,
          name: e.ruleNameAtTime || 'آیتم جدید',
          maxGrade: Number(e.maxAtTime),
          coefficient: Number(e.coefAtTime),
          percentage: 0,
          isNegative: false
        });
      }
    });

    setLocalRules(mergedRules);
  }, [date, subject.id, subject.rules, data.gradeEntries]);

  // منطق تقویم سفارشی بهبود یافته
  const CalendarModal = () => {
    const [navDate, setNavDate] = useState(new Date(date));
    
    const calendarConfig = {
      persian: { label: 'شمسی (هجری)', color: 'bg-indigo-600', locale: 'fa-IR-u-ca-persian' },
      gregory: { label: 'میلادی (ژانویه)', color: 'bg-blue-600', locale: 'fa-IR-u-ca-gregory' },
      islamic: { label: 'قمری (ذی‌حجه)', color: 'bg-emerald-600', locale: 'fa-IR-u-ca-islamic-umalqura' }
    };

    const generateDays = () => {
      const days = [];
      const current = new Date(navDate);
      current.setDate(1);
      const startOfMonth = new Date(current);
      for (let i = -5; i < 37; i++) {
        const d = new Date(startOfMonth);
        d.setDate(i);
        days.push(d);
      }
      return days;
    };

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/40 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="p-10 bg-slate-50 border-b flex flex-col gap-6">
            <div className="flex justify-between items-center">
               <h3 className="font-black text-slate-900 text-xl tracking-tighter">تقویم هوشمند سه‌گانه</h3>
               <button onClick={() => setShowCalendarModal(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100 transition-all"><ICONS.Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              {(Object.keys(calendarConfig) as Array<keyof typeof calendarConfig>).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveCalendarType(type)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeCalendarType === type ? `${calendarConfig[type].color} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {calendarConfig[type].label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center px-4">
              <button onClick={() => { const d = new Date(navDate); d.setMonth(d.getMonth() - 1); setNavDate(d); }} className="p-4 bg-slate-100 rounded-2xl hover:bg-indigo-50 text-indigo-600 transition-all"><ICONS.ChevronLeft className="w-5 h-5 rotate-180" /></button>
              <span className="font-black text-slate-800 text-lg">
                {new Intl.DateTimeFormat(calendarConfig[activeCalendarType].locale, { month: 'long', year: 'numeric' }).format(navDate)}
              </span>
              <button onClick={() => { const d = new Date(navDate); d.setMonth(d.getMonth() + 1); setNavDate(d); }} className="p-4 bg-slate-100 rounded-2xl hover:bg-indigo-50 text-indigo-600 transition-all"><ICONS.ChevronLeft className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => (
                <div key={w} className="text-center text-[9px] font-black text-slate-300 py-2 uppercase tracking-widest">{w}</div>
              ))}
              {generateDays().slice(0, 35).map((d, i) => {
                const dateISO = d.toISOString().split('T')[0];
                const isSelected = dateISO === date;
                const isToday = dateISO === getToday();
                const isCurrentMonth = d.getMonth() === navDate.getMonth();

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setDate(dateISO);
                      setShowCalendarModal(false);
                    }}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                      isSelected ? 'bg-indigo-600 text-white shadow-xl scale-110 z-10' :
                      isToday ? 'border-2 border-indigo-200 text-indigo-600 bg-indigo-50' :
                      isCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-200'
                    }`}
                  >
                    {new Intl.DateTimeFormat(calendarConfig[activeCalendarType].locale, { day: 'numeric' }).format(d)}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={() => {
                setDate(getToday());
                setShowCalendarModal(false);
              }}
              className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-sm hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
            >
              <ICONS.Calendar className="w-5 h-5" />
              پرش به امروز
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getEntry = (studentId: string, ruleId: string, currentDate: string) => {
    return data.gradeEntries.find((e: GradeEntry) => e.studentId === studentId && e.ruleId === ruleId && e.date === currentDate);
  };

  const getAttendance = (studentId: string, currentDate: string) => {
    return data.attendanceRecords.find((a: AttendanceRecord) => a.studentId === studentId && a.date === currentDate);
  };

  const updateGrade = (studentId: string, ruleId: string, field: string, val: any) => {
    const existing = getEntry(studentId, ruleId, date);
    const rule = localRules.find(r => r.id === ruleId);
    if (!rule) return;

    const baseEntry: GradeEntry = existing || {
      id: `${Date.now()}-${Math.random()}`,
      studentId,
      subjectId: subject.id,
      ruleId,
      date,
      value: 0,
      maxAtTime: Number(rule.maxGrade),
      coefAtTime: Number(rule.coefficient),
      percentAtTime: Number(rule.percentage || 0),
      ruleNameAtTime: rule.name,
      note: ''
    };

    let updatedEntry = { ...baseEntry };
    if (field === 'value') {
      let num = parseFloat(val);
      if (isNaN(num)) num = 0;
      updatedEntry.value = Math.min(Math.max(0, num), Number(updatedEntry.maxAtTime));
    } else if (field === 'note') {
      updatedEntry.note = val;
    }

    let newList = existing 
      ? data.gradeEntries.map((e: GradeEntry) => e.id === existing.id ? updatedEntry : e)
      : [...data.gradeEntries, updatedEntry];
    
    updateData('gradeEntries', newList);
  };

  const toggleAttendance = (studentId: string) => {
    const existing = getAttendance(studentId, date);
    let newList;
    let newStatus: AttendanceStatus = 'present';

    if (existing) {
      const nextStatus: Record<AttendanceStatus, AttendanceStatus> = {
        'present': 'absent',
        'absent': 'late',
        'late': 'present'
      };
      newStatus = nextStatus[existing.status];
      newList = data.attendanceRecords.map((a: AttendanceRecord) => a.id === existing.id ? { ...a, status: newStatus } : a);
    } else {
      newStatus = 'present';
      newList = [...data.attendanceRecords, {
        id: `${Date.now()}-${Math.random()}`,
        studentId,
        subjectId: subject.id,
        date,
        status: newStatus
      }];
    }

    // اگر غایب شد، برای تمام ستون‌های امروز نمره صفر با نوت «غیبت» ثبت شود
    if (newStatus === 'absent') {
      const currentGrades = [...data.gradeEntries];
      localRules.forEach(rule => {
        const entryIdx = currentGrades.findIndex(e => e.studentId === studentId && e.ruleId === rule.id && e.date === date);
        const gradeObj: GradeEntry = {
          id: entryIdx !== -1 ? currentGrades[entryIdx].id : `${Date.now()}-${studentId}-${rule.id}`,
          studentId,
          subjectId: subject.id,
          ruleId: rule.id,
          date,
          value: 0,
          maxAtTime: Number(rule.maxGrade),
          coefAtTime: Number(rule.coefficient),
          ruleNameAtTime: rule.name,
          percentAtTime: Number(rule.percentage || 0),
          note: 'غیبت در کلاس'
        };
        if (entryIdx !== -1) currentGrades[entryIdx] = gradeObj;
        else currentGrades.push(gradeObj);
      });
      updateData('gradeEntries', currentGrades);
    }
    updateData('attendanceRecords', newList);
  };

  // محاسبه هوشمند معدل با در نظر گرفتن ضرایب و غیبت‌های نادیده گرفته شده
  const calculateStudentFinal = (studentId: string) => {
    const studentEntries = data.gradeEntries.filter((e: GradeEntry) => e.studentId === studentId && e.subjectId === subject.id);
    if (studentEntries.length === 0) return "---";

    let totalWeightedScore = 0;
    let totalWeights = 0;

    studentEntries.forEach((e: GradeEntry) => {
      const coef = Number(e.coefAtTime || 0);
      const val = Number(e.value || 0);
      const max = Number(e.maxAtTime || 1);
      
      // اگر ضریب صفر شده باشد (توسط دبیر برای نادیده گرفتن غیبت)، در معدل اثر ندارد
      if (coef <= 0) return;

      const normalizedScore = (val / max) * 20;
      totalWeightedScore += normalizedScore * coef;
      totalWeights += coef;
    });

    if (totalWeights === 0) return "---";
    return (totalWeightedScore / totalWeights).toFixed(2);
  };

  // تابع تغییر وضعیت نادیده گرفتن غیبت در ریز نمرات
  const toggleIgnoreAbsence = (entryId: string) => {
    const entry = data.gradeEntries.find((e: GradeEntry) => e.id === entryId);
    if (!entry) return;

    const rule = subject.rules.find(r => r.id === entry.ruleId);
    const originalCoef = rule ? Number(rule.coefficient) : 1;

    // اگر ضریب فعلی صفر است، یعنی قبلاً نادیده گرفته شده، پس ضریب اصلی را برمی‌گردانیم
    const isCurrentlyIgnored = Number(entry.coefAtTime) === 0;
    const newCoef = isCurrentlyIgnored ? originalCoef : 0;
    const newNote = isCurrentlyIgnored ? 'غیبت در کلاس' : 'غیبت نادیده گرفته شد (از معدل حذف شد)';

    const newList = data.gradeEntries.map((e: GradeEntry) => 
      e.id === entryId ? { ...e, coefAtTime: newCoef, note: newNote } : e
    );
    updateData('gradeEntries', newList);
    notify(isCurrentlyIgnored ? 'نمره غیبت مجدداً در معدل لحاظ شد.' : 'این فعالیت از محاسبات معدل حذف شد.');
  };

  const updateLocalRuleForDay = (id: string, field: keyof GradingRule, value: any) => {
    const rule = localRules.find(r => r.id === id);
    if (!rule) return;
    let newGradeEntries = [...data.gradeEntries];

    students.forEach(student => {
      const existing = getEntry(student.id, id, date);
      if (existing) {
        newGradeEntries = newGradeEntries.map(e => {
          if (e.id === existing.id) {
            const updated = { ...e };
            if (field === 'name') updated.ruleNameAtTime = String(value);
            if (field === 'maxGrade') {
              updated.maxAtTime = Number(value);
              updated.value = Math.min(Number(updated.value), Number(updated.maxAtTime));
            }
            if (field === 'coefficient') updated.coefAtTime = Number(value);
            return updated;
          }
          return e;
        });
      }
    });
    updateData('gradeEntries', newGradeEntries);
    notify('تغییرات ستونی اعمال شد.');
  };

  const addNewItemToDay = () => {
    const newId = `local-${Date.now()}`;
    const newEntries = students.map(s => ({
      id: `${Date.now()}-${s.id}`,
      studentId: s.id,
      subjectId: subject.id,
      ruleId: newId,
      date: date,
      value: 0,
      maxAtTime: 20,
      coefAtTime: 1,
      ruleNameAtTime: 'آیتم فوق‌العاده',
      percentAtTime: 0
    }));
    updateData('gradeEntries', [...data.gradeEntries, ...newEntries]);
    notify('آیتم جدید اضافه شد.');
  };

  const removeRuleFromDay = (id: string) => {
    if (!confirm('نمرات این ستون حذف شوند؟')) return;
    updateData('gradeEntries', data.gradeEntries.filter((e: GradeEntry) => !(e.ruleId === id && e.date === date)));
  };

  const detailStudent = detailStudentId ? students.find((s:Student) => s.id === detailStudentId) : null;
  const detailEntries = detailStudentId ? data.gradeEntries.filter((e:GradeEntry) => e.studentId === detailStudentId && e.subjectId === subject.id) : [];

  return (
    <div className="space-y-12 animate-in zoom-in-95 duration-700 relative pb-20">
      <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex flex-col md:flex-row items-center gap-10 w-full md:w-auto">
          {/* انتخابگر تاریخ با نمایش سه‌گانه */}
          <div className="relative group min-w-[360px]">
            <label className="absolute -top-3 right-10 px-4 bg-white text-[10px] font-black text-indigo-600 uppercase z-30 tracking-[0.2em] shadow-sm rounded-full border border-indigo-50">دوره زمانی ارزیابی</label>
            
            <div 
              onClick={() => setShowCalendarModal(true)}
              className="relative flex items-center bg-slate-50 border-2 border-slate-50 hover:border-indigo-500 hover:bg-white p-5 pr-6 rounded-[3rem] transition-all duration-500 cursor-pointer shadow-sm group active:scale-95 overflow-hidden h-32"
            >
              <div className="w-16 h-16 bg-indigo-600 rounded-[2.2rem] flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shrink-0">
                <ICONS.Calendar className="w-8 h-8" />
              </div>

              <div className="px-8 flex flex-col">
                {tripleDate ? (
                  <>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">{tripleDate.shamsi}</span>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/50">
                        <span className="text-[9px] font-black text-indigo-400 uppercase">میلادی</span>
                        <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">{tripleDate.miladi}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                        <span className="text-[9px] font-black text-emerald-400 uppercase">قمری</span>
                        <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">{tripleDate.ghamari}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-black text-slate-400 italic">انتخاب تاریخ...</span>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowRuleManager(!showRuleManager)}
            className={`flex items-center gap-5 px-12 py-7 rounded-[2.8rem] font-black text-xs transition-all border-2 active:scale-95 ${showRuleManager ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-500 hover:shadow-xl'}`}
          >
            <ICONS.Settings className="w-6 h-6" />
            شخصی‌سازی ضرایب امروز
          </button>
        </div>

        <button 
          onClick={() => setShowSummary(!showSummary)}
          className={`px-14 py-7 rounded-[2.8rem] font-black text-xs transition-all flex items-center gap-5 shadow-2xl active:scale-95 ${showSummary ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
        >
          {showSummary ? <><ICONS.Edit className="w-6 h-6" /> بازگشت به لیست اصلی</> : <><ICONS.Eye className="w-6 h-6" /> گزارش و آنالیز جامع</>}
        </button>
      </div>

      {showCalendarModal && <CalendarModal />}

      {showRuleManager && (
        <div className="bg-indigo-50/30 border-2 border-indigo-100 p-12 rounded-[4rem] animate-in slide-in-from-top-4 duration-500 space-y-10 shadow-inner">
           <div className="flex justify-between items-center">
              <div>
                 <h3 className="font-black text-indigo-900 text-2xl tracking-tighter">مدیریت لحظه‌ای ضرایب ارزیابی</h3>
                 <p className="text-sm text-indigo-400 font-bold mt-2">تغییرات شما فقط بر نمراتی که در تاریخ {tripleDate?.shamsi} ثبت می‌شوند، اثر می‌گذارد.</p>
              </div>
              <button onClick={addNewItemToDay} className="bg-indigo-600 text-white px-10 py-4 rounded-3xl text-xs font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">افزودن فعالیت فوق‌العاده به امروز</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
             {localRules.map(rule => (
               <div key={rule.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-indigo-50 flex flex-col gap-8 transition-all hover:shadow-2xl hover:border-indigo-200 group">
                  <div className="flex justify-between items-center gap-6">
                    <input 
                      className="font-black text-base text-slate-800 bg-transparent outline-none border-b-2 border-slate-100 focus:border-indigo-400 w-full pb-2 transition-all"
                      value={rule.name}
                      onChange={(e) => updateLocalRuleForDay(rule.id, 'name', e.target.value)}
                    />
                    <button onClick={() => removeRuleFromDay(rule.id)} className="text-rose-200 hover:text-rose-600 p-3 transition-colors"><ICONS.Trash className="w-6 h-6" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">سقف نمره</p>
                      <input type="number" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl p-4 text-lg font-black text-center transition-all outline-none" value={rule.maxGrade} onChange={(e) => updateLocalRuleForDay(rule.id, 'maxGrade', e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ضریب وزنی</p>
                      <input type="number" step="0.1" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl p-4 text-lg font-black text-center transition-all outline-none" value={rule.coefficient} onChange={(e) => updateLocalRuleForDay(rule.id, 'coefficient', e.target.value)} />
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <table className="w-full text-right border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="p-12 text-center w-28">#</th>
                <th className="p-12 sticky right-0 bg-slate-50 z-10 border-l">دانش‌آموز</th>
                {!showSummary ? (
                  <>
                    <th className="p-12 text-center w-56">وضعیت حضور</th>
                    {localRules.map(rule => (
                      <th key={rule.id} className="p-12 text-center min-w-[180px]">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-800 text-base font-black tracking-tight">{rule.name}</span>
                          <span className="text-[10px] text-slate-300 font-bold mt-2">({rule.maxGrade} نمره - ضریب {rule.coefficient})</span>
                        </div>
                      </th>
                    ))}
                  </>
                ) : (
                  <>
                    <th className="p-12 text-center w-64">معدل نهایی (مقیاس ۲۰)</th>
                    <th className="p-12 text-center w-64">تعداد غیبت / تأخیر</th>
                    <th className="p-12 text-center">عملیات آنالیز</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student, idx) => {
                const att = getAttendance(student.id, date);
                const isAbsent = att?.status === 'absent';
                const finalGrade = calculateStudentFinal(student.id);

                return (
                  <tr key={student.id} className={`hover:bg-slate-50/40 transition-all ${isAbsent ? 'bg-rose-50/20' : ''}`}>
                    <td className="p-12 text-center text-slate-300 font-black text-2xl italic">{String(idx + 1).padStart(2, '۰')}</td>
                    <td className="p-12 sticky right-0 bg-white z-10 border-l font-black text-slate-700 text-xl shadow-sm">{student.name}</td>
                    {!showSummary ? (
                      <>
                        <td className="p-12 text-center">
                          <button 
                            onClick={() => toggleAttendance(student.id)}
                            className={`w-full py-6 rounded-[2rem] text-xs font-black transition-all border-2 active:scale-95 ${
                              att?.status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' :
                              att?.status === 'absent' ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100' :
                              att?.status === 'late' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' :
                              'bg-white border-slate-100 text-slate-300'
                            }`}
                          >
                            {att?.status === 'present' ? 'حاضر' : att?.status === 'absent' ? 'غایب' : att?.status === 'late' ? 'تأخیر' : 'ثبت حضور'}
                          </button>
                        </td>
                        {localRules.map(rule => {
                          const entry = getEntry(student.id, rule.id, date);
                          const displayValue = isAbsent ? '' : (entry?.value ?? '');

                          return (
                            <td key={rule.id} className="p-12">
                              <div className="relative group mx-auto w-36">
                                <input 
                                  type="number"
                                  disabled={isAbsent}
                                  value={displayValue}
                                  placeholder="--"
                                  step="0.25"
                                  onChange={(e) => updateGrade(student.id, rule.id, 'value', e.target.value)}
                                  className={`w-full p-10 rounded-[2.5rem] text-center font-black text-4xl outline-none transition-all shadow-sm ${
                                    isAbsent ? 'bg-slate-100 text-slate-200 cursor-not-allowed opacity-40' : 'bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500 text-indigo-950'
                                  }`}
                                />
                                {!isAbsent && (
                                  <button 
                                    onClick={() => setEditingOverrides(editingOverrides === `${rule.id}-${student.id}` ? null : `${rule.id}-${student.id}`)}
                                    className="absolute -top-5 -left-5 w-12 h-12 bg-white rounded-2xl border border-slate-100 text-slate-300 hover:text-indigo-600 shadow-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 active:scale-90"
                                  >
                                    <ICONS.Edit className="w-6 h-6" />
                                  </button>
                                )}
                                {editingOverrides === `${rule.id}-${student.id}` && (
                                  <div className="absolute z-[100] top-full mt-8 right-0 bg-white border border-slate-100 p-10 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] min-w-[320px] animate-in slide-in-from-top-4">
                                    <h5 className="text-[11px] font-black text-indigo-600 mb-5 uppercase tracking-widest">یادداشت‌های ارزیابی</h5>
                                    <textarea 
                                      className="w-full bg-slate-50 p-6 rounded-3xl text-sm font-bold outline-none mb-8 h-40 resize-none border-2 border-transparent focus:border-indigo-500 transition-all"
                                      placeholder="ملاحظات خاص برای این نمره..."
                                      value={entry?.note || ''}
                                      onChange={(e) => updateGrade(student.id, rule.id, 'note', e.target.value)}
                                    />
                                    <button onClick={() => setEditingOverrides(null)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl text-xs font-black shadow-xl shadow-indigo-100 active:scale-95">ذخیره ملاحظات</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <td className="p-12 text-center">
                          <span className={`text-6xl font-black tracking-tighter ${Number(finalGrade) >= 10 ? 'text-indigo-600' : 'text-rose-500'}`}>
                            {finalGrade}
                          </span>
                        </td>
                        <td className="p-12 text-center">
                           <div className="flex flex-col gap-3 items-center">
                              <span className="text-xs font-black text-rose-500 bg-rose-50 px-5 py-2 rounded-full">{data.attendanceRecords.filter((a:any)=>a.studentId===student.id && a.status==='absent').length} غیبت</span>
                              <span className="text-xs font-black text-amber-500 bg-amber-50 px-5 py-2 rounded-full">{data.attendanceRecords.filter((a:any)=>a.studentId===student.id && a.status==='late').length} تأخیر</span>
                           </div>
                        </td>
                        <td className="p-12 text-center">
                           <button onClick={() => setDetailStudentId(student.id)} className="bg-indigo-50 text-indigo-600 px-10 py-5 rounded-[2.2rem] text-xs font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm">مشاهده پرونده جامع</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال آنالیز جامع دانش‌آموز - بازطراحی شده */}
      {detailStudentId && detailStudent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 backdrop-blur-3xl bg-slate-900/80 animate-in fade-in duration-500 overflow-hidden">
           <div className="bg-white w-full max-w-6xl rounded-[3rem] md:rounded-[4.5rem] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.6)] border border-white/20 h-full max-h-[95vh] flex flex-col overflow-hidden relative">
              
              {/* هدر ثابت مودال */}
              <div className="p-8 md:p-14 border-b border-slate-100 flex flex-col gap-8 md:gap-12 bg-white sticky top-0 z-[210]">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6 md:gap-10">
                       <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white font-black text-3xl md:text-5xl shadow-2xl rotate-3">
                          {detailStudent.name.charAt(0)}
                       </div>
                       <div>
                          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-1 md:mb-2">ریز نمرات: {detailStudent.name}</h2>
                          <p className="text-slate-400 font-bold text-xs md:text-sm">گزارش شفاف تمام نمرات، غیبت‌ها و تأثیرات بر معدل نهایی</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setDetailStudentId(null)} 
                      className="flex items-center gap-3 px-6 md:px-10 py-3 md:py-5 rounded-3xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100 font-black text-[10px] md:text-xs group active:scale-95 shadow-sm"
                    >
                       <ICONS.ArrowRight className="w-5 h-5 md:w-7 md:h-7 transition-transform group-hover:translate-x-2" />
                       بستن
                    </button>
                 </div>

                 {/* خلاصه وضعیت عددی - کوچکتر و ثابت */}
                 <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
                    <div className="bg-indigo-600 p-4 md:p-5 rounded-[1.8rem] shadow-xl shadow-indigo-100 flex flex-col items-center justify-center text-white text-center">
                       <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">معدل نهایی</p>
                       <p className="text-2xl md:text-3xl font-black tracking-tighter">{calculateStudentFinal(detailStudent.id)}</p>
                    </div>
                    <div className="bg-slate-900 p-4 md:p-5 rounded-[1.8rem] flex flex-col items-center justify-center text-white text-center">
                       <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">ارزیابی‌ها</p>
                       <p className="text-2xl md:text-3xl font-black tracking-tighter">{detailEntries.length}</p>
                    </div>
                    <div className="bg-rose-50 p-4 md:p-5 rounded-[1.8rem] border border-rose-100 flex flex-col items-center justify-center text-center">
                       <p className="text-[8px] md:text-[9px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">غیبت موثر</p>
                       <p className="text-2xl md:text-3xl font-black text-rose-600 tracking-tighter">
                         {detailEntries.filter(e => e.note === 'غیبت در کلاس' && Number(e.coefAtTime) > 0).length}
                       </p>
                    </div>
                    <div className="bg-emerald-50 p-4 md:p-5 rounded-[1.8rem] border border-emerald-100 flex flex-col items-center justify-center text-center">
                       <p className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">نادیده گرفته</p>
                       <p className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter">
                         {detailEntries.filter(e => Number(e.coefAtTime) === 0).length}
                       </p>
                    </div>
                    <div className="bg-amber-50 p-4 md:p-5 rounded-[1.8rem] border border-amber-100 flex flex-col items-center justify-center text-center">
                       <p className="text-[8px] md:text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">مجموع ضرایب کل</p>
                       <p className="text-2xl md:text-3xl font-black text-amber-600 tracking-tighter">
                         {detailEntries.reduce((acc, e) => {
                           const rule = subject.rules.find(r => r.id === e.ruleId);
                           return acc + (rule ? Number(rule.coefficient) : 1);
                         }, 0).toFixed(1)}
                       </p>
                    </div>
                    <div className="bg-indigo-50 p-4 md:p-5 rounded-[1.8rem] border border-indigo-100 flex flex-col items-center justify-center text-center">
                       <p className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">ضریب‌های جاری</p>
                       <p className="text-2xl md:text-3xl font-black text-indigo-600 tracking-tighter">
                         {detailEntries.reduce((acc, e) => acc + Number(e.coefAtTime || 0), 0).toFixed(1)}
                       </p>
                    </div>
                 </div>
              </div>

              {/* محتوای مودال - اسکرول شونده */}
              <div className="flex-grow overflow-y-auto pr-2 md:pr-4 no-scrollbar">
                 <div className="px-8 md:px-14 py-8 space-y-12">
                   <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-right border-collapse table-fixed">
                         <thead className="bg-slate-50/80 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest border-b sticky top-0 z-[205] backdrop-blur-md">
                            <tr>
                               <th className="p-6 md:p-8 w-1/5">تاریخ ارزیابی</th>
                               <th className="p-6 md:p-8 w-1/5">عنوان فعالیت</th>
                               <th className="p-6 md:p-8 text-center w-1/6">نمره خام</th>
                               <th className="p-6 md:p-8 text-center w-1/6">ضریب وزنی</th>
                               <th className="p-6 md:p-8 text-center bg-indigo-50/30 text-indigo-600 w-1/6">نمره نهایی (۲۰)</th>
                               <th className="p-6 md:p-8 w-1/4">وضعیت</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {detailEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => {
                               const v = Number(e.value || 0);
                               const m = Number(e.maxAtTime || 1);
                               const isAbsenceZero = e.value === 0 && (e.note?.includes('غیبت') || false);
                               const isIgnored = Number(e.coefAtTime) === 0;
                               const rowTripleDate = getTripleDateDetails(e.date);

                               return (
                               <tr key={e.id} className={`text-sm md:text-base font-bold text-slate-600 hover:bg-slate-50 transition-colors ${isAbsenceZero ? 'bg-rose-50/10' : ''} ${isIgnored ? 'opacity-40 grayscale' : ''}`}>
                                  <td className="p-6 md:p-8">
                                    <div className="flex flex-col">
                                      <span className="text-slate-900 font-black text-sm md:text-base">{rowTripleDate?.shamsi.split('،')[0]}</span>
                                      <span className="text-[8px] md:text-[9px] text-slate-400 font-bold mt-1">{rowTripleDate?.miladi}</span>
                                    </div>
                                  </td>
                                  <td className="p-6 md:p-8 font-black text-slate-900 text-sm md:text-base truncate">{e.ruleNameAtTime || 'آیتم عمومی'}</td>
                                  <td className="p-6 md:p-8 text-center font-black text-slate-800 text-xl md:text-2xl">{isAbsenceZero ? 'غایب' : v}</td>
                                  <td className="p-6 md:p-8 text-center">
                                     <span className={isIgnored ? 'text-rose-500 line-through decoration-2' : 'font-black text-indigo-600'}>
                                        {isIgnored ? '-' : Number(e.coefAtTime || 0)}
                                     </span>
                                  </td>
                                  <td className="p-6 md:p-8 text-center font-black bg-indigo-50/20 text-indigo-600 italic text-xl md:text-2xl">
                                     {isIgnored ? '---' : ((v / m) * 20).toFixed(2)}
                                  </td>
                                  <td className="p-6 md:p-8">
                                     <div className="flex flex-col gap-3">
                                        <span className={`text-[9px] md:text-[10px] font-black px-3 py-1.5 rounded-xl w-fit ${isIgnored ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                           {e.note || '---'}
                                        </span>
                                        {isAbsenceZero && (
                                          <button 
                                            onClick={() => toggleIgnoreAbsence(e.id)}
                                            className={`text-[9px] font-black px-4 py-2 rounded-2xl transition-all w-fit shadow-md flex items-center gap-2 ${
                                              isIgnored 
                                              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                              : 'bg-rose-600 text-white hover:bg-rose-700'
                                            }`}
                                          >
                                            {isIgnored ? 'لحاظ در معدل' : 'نادیده گرفتن'}
                                          </button>
                                        )}
                                     </div>
                                  </td>
                               </tr>
                            )})}
                         </tbody>
                      </table>
                   </div>
                 </div>
              </div>

              {/* فوتر مودال */}
              <div className="p-8 md:p-12 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10 mt-auto">
                 <div className="flex items-center gap-4">
                    <ICONS.Bell className="w-6 h-6 text-indigo-400" />
                    <p className="text-[10px] md:text-xs font-medium text-slate-400 leading-relaxed">
                       معدل نهایی براساس نمرات تایید شده و با تاثیر ضرایب وزنی محاسبه می‌شود. فعالیت‌های نادیده گرفته شده تاثیری در نمره نهایی ندارند.
                    </p>
                 </div>
                 <button onClick={() => setDetailStudentId(null)} className="w-full md:w-auto bg-white/10 hover:bg-white/20 px-12 py-4 rounded-2xl text-xs font-black transition-all">تایید و خروج</button>
              </div>
           </div>
        </div>
      )}

      {/* نوار وضعیت ذخیره‌سازی انتهای صفحه */}
      <div className="fixed bottom-10 left-10 right-96 z-40 px-12 py-8 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] border border-white/5 animate-in slide-in-from-bottom-10 duration-700">
         <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center text-indigo-400 shadow-inner">
               <ICONS.Save className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[11px] font-black text-slate-500 tracking-[0.4em] mb-1 uppercase">Cloud Status: Synchronized</p>
               <h4 className="text-xl font-black tracking-tight">تمامی تغییرات ارزیابی لحظه‌ای ذخیره شد.</h4>
            </div>
         </div>
         <button onClick={() => notify('اطلاعات جلسه ارزیابی با موفقیت ثبت نهایی شد.')} className="bg-indigo-600 text-white px-14 py-5 rounded-[1.8rem] font-black text-base hover:bg-white hover:text-slate-950 transition-all active:scale-95 shadow-2xl shadow-indigo-500/30">تأیید و اتمام جلسه</button>
      </div>
    </div>
  );
};

export default GradingView;
