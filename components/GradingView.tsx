
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
  const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseISODate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const toPersianDate = (s: string) => {
    try {
      const d = parseISODate(s);
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }).format(d);
    } catch (e) { return s; }
  };

  const [date, setDate] = useState(getToday());
  const [showSummary, setShowSummary] = useState(false);
  const [showRuleManager, setShowRuleManager] = useState<boolean>(false);
  const [localRules, setLocalRules] = useState<GradingRule[]>([]);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [activeCalendarType, setActiveCalendarType] = useState<'persian' | 'gregory' | 'islamic'>('persian');

  const analysisScrollRef = useRef<HTMLDivElement>(null);

  const tripleDate = useMemo(() => {
    try {
      const d = parseISODate(date);
      const format = (ca: string) => new Intl.DateTimeFormat(`fa-IR-u-ca-${ca}`, { 
        day: 'numeric', month: 'long', year: 'numeric', weekday: ca === 'persian' ? 'long' : undefined
      }).format(d);
      return { shamsi: format('persian'), miladi: format('gregory'), ghamari: format('islamic-umalqura') };
    } catch (e) { return null; }
  }, [date]);

  const students = useMemo(() => data.students.filter((s: Student) => s.classId === classRoom.id), [data.students, classRoom.id]);

  useEffect(() => {
    const entriesToday: GradeEntry[] = (data.gradeEntries as GradeEntry[] || []).filter(e => e.subjectId === subject.id && e.date === date);
    const combinedRules = [...subject.rules.map(r => ({ ...r }))];
    
    entriesToday.forEach(e => {
      const existingIdx = combinedRules.findIndex(r => r.id === e.ruleId);
      if (existingIdx === -1) {
        combinedRules.push({
          id: e.ruleId,
          name: e.ruleNameAtTime || 'سرفصل جدید',
          maxGrade: Number(e.maxAtTime),
          coefficient: Number(e.coefAtTime),
          percentage: Number(e.percentAtTime || 0),
          isNegative: false
        });
      } else {
        combinedRules[existingIdx].maxGrade = Number(e.maxAtTime);
        combinedRules[existingIdx].coefficient = Number(e.coefAtTime);
        combinedRules[existingIdx].name = e.ruleNameAtTime || combinedRules[existingIdx].name;
      }
    });

    setLocalRules(combinedRules);
  }, [date, subject.id, subject.rules]);

  const calculateStudentFinal = (studentId: string) => {
    const studentEntries = (data.gradeEntries as GradeEntry[]).filter(e => 
      e.studentId === studentId && e.subjectId === subject.id && !e.isIgnored
    );
    
    if (studentEntries.length === 0) return "---";
    
    let weightedSum = 0, totalWeights = 0;
    studentEntries.forEach(e => {
      const coef = Number(e.coefAtTime || 0);
      if (coef > 0) {
        const score20 = (e.value / e.maxAtTime) * 20;
        weightedSum += score20 * coef; 
        totalWeights += coef;
      }
    });

    return totalWeights === 0 ? "۰.۰۰" : (weightedSum / totalWeights).toFixed(2);
  };

  const updateGrade = (studentId: string, ruleId: string, val: any) => {
    const existingIdx = (data.gradeEntries as GradeEntry[]).findIndex(e => e.studentId === studentId && e.subjectId === subject.id && e.ruleId === ruleId && e.date === date);
    const rule = localRules.find(r => r.id === ruleId);
    if (!rule) return;
    
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    const finalVal = Math.min(Math.max(0, num), Number(rule.maxGrade));

    const newEntries = [...data.gradeEntries];
    if (existingIdx !== -1) {
      newEntries[existingIdx] = { 
        ...newEntries[existingIdx], 
        value: finalVal,
        maxAtTime: Number(rule.maxGrade),
        coefAtTime: Number(rule.coefficient),
        ruleNameAtTime: rule.name
      };
    } else {
      newEntries.push({ 
        id: `gr-${Date.now()}-${studentId}-${ruleId}`, 
        studentId, subjectId: subject.id, ruleId, date, value: finalVal, 
        maxAtTime: Number(rule.maxGrade), coefAtTime: Number(rule.coefficient), 
        percentAtTime: Number(rule.percentage || 0), ruleNameAtTime: rule.name, 
        isIgnored: false 
      });
    }
    updateData('gradeEntries', newEntries);
  };

  const toggleGradeIgnored = (e: React.MouseEvent, entryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newEntries = (data.gradeEntries as GradeEntry[]).map(entry => 
      entry.id === entryId ? { ...entry, isIgnored: !entry.isIgnored } : entry
    );
    updateData('gradeEntries', newEntries);
  };

  const toggleAttendance = (studentId: string) => {
    const existing = (data.attendanceRecords as AttendanceRecord[]).find(a => a.studentId === studentId && a.subjectId === subject.id && a.date === date);
    let newStatus: AttendanceStatus = existing?.status === 'present' ? 'absent' : existing?.status === 'absent' ? 'late' : 'present';
    const newRecords = existing 
      ? data.attendanceRecords.map((a: AttendanceRecord) => a.id === existing.id ? { ...a, status: newStatus } : a) 
      : [...data.attendanceRecords, { id: `att-${Date.now()}-${studentId}`, studentId, subjectId: subject.id, date, status: newStatus, isIgnored: false }];
    
    if (newStatus === 'absent') {
      const newEntries = [...data.gradeEntries];
      localRules.forEach(rule => {
        const idx = newEntries.findIndex(e => e.studentId === studentId && e.subjectId === subject.id && e.ruleId === rule.id && e.date === date);
        if (idx !== -1) {
          newEntries[idx] = { ...newEntries[idx], value: 0 };
        } else {
          newEntries.push({
            id: `gr-${Date.now()}-${studentId}-${rule.id}`,
            studentId, subjectId: subject.id, ruleId: rule.id, date, value: 0,
            maxAtTime: rule.maxGrade, coefAtTime: rule.coefficient, 
            percentAtTime: rule.percentage, ruleNameAtTime: rule.name, isIgnored: false
          });
        }
      });
      updateData('gradeEntries', newEntries);
    }
    updateData('attendanceRecords', newRecords);
  };

  const AnalysisModal = ({ studentId }: { studentId: string }) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const entries = (data.gradeEntries as GradeEntry[]).filter(e => e.studentId === studentId && e.subjectId === subject.id);
    const atts = (data.attendanceRecords as AttendanceRecord[]).filter(a => a.studentId === studentId && a.subjectId === subject.id);
    const finalScore = calculateStudentFinal(studentId);

    const stats = useMemo(() => {
        const presence = atts.filter(a => a.status === 'present').length;
        const absence = atts.filter(a => a.status === 'absent').length;
        const late = atts.filter(a => a.status === 'late').length;
        const total = atts.length;
        return { presence, absence, late, total, rate: total > 0 ? ((presence / total) * 100).toFixed(0) : '۱۰۰' };
    }, [atts]);

    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 backdrop-blur-3xl bg-slate-900/90 overflow-hidden">
        <div className="bg-white w-full max-w-7xl rounded-[4rem] shadow-2xl h-full max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
          
          <div className="p-10 md:p-14 border-b flex flex-col md:flex-row justify-between items-center gap-10 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-8">
              <div className="w-28 h-28 rounded-[3rem] bg-indigo-600 flex items-center justify-center text-white font-black text-5xl shadow-2xl shadow-indigo-200 rotate-6">{student.name.charAt(0)}</div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{student.name}</h2>
                <div className="flex gap-4">
                   <span className="bg-indigo-50 text-indigo-600 px-5 py-1.5 rounded-full text-xs font-black">درس: {subject.name}</span>
                   <span className="bg-slate-100 text-slate-500 px-5 py-1.5 rounded-full text-xs font-black">کلاس: {classRoom.name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-16 items-center">
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">تراز نهایی کل</p>
                <div className="flex items-baseline gap-2">
                   <h3 className={`text-8xl font-black tracking-tighter ${Number(finalScore) >= 10 ? 'text-indigo-600' : 'text-rose-500'}`}>{finalScore}</h3>
                   <span className="text-2xl font-black text-slate-200">/ ۲۰</span>
                </div>
              </div>
              <div className="w-px h-24 bg-slate-100"></div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">نرخ حضور</p>
                <div className="flex items-baseline gap-1">
                   <h3 className="text-6xl font-black text-slate-800 tracking-tighter">{stats.rate}</h3>
                   <span className="text-xl font-black text-slate-300">%</span>
                </div>
              </div>
            </div>
          </div>

          <div ref={analysisScrollRef} className="flex-grow overflow-y-auto p-10 md:p-14 space-y-20 no-scrollbar bg-white" style={{ overflowAnchor: 'none' }}>
            
            <div className="space-y-8">
               <div className="flex items-center gap-5">
                  <div className="w-2.5 h-10 bg-indigo-600 rounded-full"></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">تحلیل جامع سرفصل‌ها و اثر غیبت</h3>
                  </div>
               </div>

               <div className="bg-white border-2 border-slate-50 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-100">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr className="text-[10px] font-black uppercase tracking-widest">
                        <th className="p-8">تاریخ و حضور</th>
                        <th className="p-8">سرفصل ارزیابی</th>
                        <th className="p-8 text-center">نمره</th>
                        <th className="p-8 text-center">تراز ۲۰</th>
                        <th className="p-8 text-center">ضریب</th>
                        <th className="p-8 text-center">تأثیر در تراز کل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(e => {
                        const att = atts.find(a => a.date === e.date);
                        const isAbsent = att?.status === 'absent';
                        const score20 = (e.value / e.maxAtTime) * 20;
                        
                        return (
                          <tr key={e.id} className={`transition-all group hover:bg-slate-50/80 ${e.isIgnored ? 'opacity-30 grayscale' : ''}`}>
                            <td className="p-8">
                               <div className="flex items-center gap-5">
                                  <div className={`w-4 h-4 rounded-full ${
                                     att?.status === 'present' ? 'bg-emerald-500' :
                                     isAbsent ? 'bg-rose-500' :
                                     att?.status === 'late' ? 'bg-amber-500' : 'bg-slate-200'
                                  }`}></div>
                                  <div className="flex flex-col">
                                     <span className="font-black text-slate-700 text-base">{toPersianDate(e.date)}</span>
                                     <span className="text-[9px] font-black text-slate-300">{isAbsent ? 'غایب' : 'حاضر'}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="p-8 font-black text-slate-800">{e.ruleNameAtTime}</td>
                            <td className="p-8 text-center">
                               <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-2xl border-2 font-black ${isAbsent ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100'}`}>
                                  <span>{e.value}</span> / <span>{e.maxAtTime}</span>
                               </div>
                            </td>
                            <td className="p-8 text-center">
                               <span className={`text-3xl font-black tracking-tighter ${score20 >= 10 ? 'text-indigo-600' : 'text-rose-500'}`}>
                                 {score20.toFixed(2)}
                               </span>
                            </td>
                            <td className="p-8 text-center font-black text-slate-300">{e.isIgnored ? '۰' : e.coefAtTime}</td>
                            <td className="p-8 text-center">
                              <button 
                                onClick={(ev) => toggleGradeIgnored(ev, e.id)}
                                className={`relative inline-flex h-10 w-16 items-center rounded-full transition-all duration-300 ${e.isIgnored ? 'bg-slate-200' : 'bg-indigo-600 shadow-xl shadow-indigo-100'}`}
                              >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${e.isIgnored ? '-translate-x-1' : '-translate-x-9'}`} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="flex flex-col gap-12">
               <div className="bg-slate-50/50 p-12 rounded-[4rem] border border-slate-100 space-y-8 w-full">
                  <h4 className="text-xl font-black text-slate-800 tracking-tight">توزیع وضعیت حضور و غیاب</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {[
                        { label: 'حاضر', count: stats.presence, color: 'bg-emerald-500', icon: ICONS.Plus },
                        { label: 'غایب', count: stats.absence, color: 'bg-rose-500', icon: ICONS.Trash },
                        { label: 'تأخیر', count: stats.late, color: 'bg-amber-500', icon: ICONS.Settings }
                     ].map((st, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl ${st.color} flex items-center justify-center text-white shadow-lg`}><st.icon className="w-6 h-6" /></div>
                              <span className="font-black text-slate-700">{st.label}</span>
                           </div>
                           <span className="text-3xl font-black text-slate-900">{st.count}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="p-10 md:p-12 bg-slate-50 border-t flex justify-end">
             <button onClick={() => setDetailStudentId(null)} className="bg-slate-900 text-white px-20 py-5 rounded-[2.5rem] font-black">بستن پنجره</button>
          </div>
        </div>
      </div>
    );
  };

  const CalendarModal = () => {
    const [navDate, setNavDate] = useState(parseISODate(date));
    const calendarConfig = {
      persian: { label: 'شمسی', color: 'bg-indigo-600', locale: 'fa-IR-u-ca-persian' },
      gregory: { label: 'میلادی', color: 'bg-blue-600', locale: 'fa-IR-u-ca-gregory' },
      islamic: { label: 'قمری', color: 'bg-emerald-600', locale: 'fa-IR-u-ca-islamic-umalqura' }
    };
    const generateDays = () => {
      const days = [];
      const current = new Date(navDate.getFullYear(), navDate.getMonth(), 1);
      const startPoint = new Date(current);
      startPoint.setDate(startPoint.getDate() - 5); 
      for (let i = 0; i < 42; i++) {
        const d = new Date(startPoint); d.setDate(startPoint.getDate() + i);
        days.push(d);
      }
      return days;
    };

    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/40">
        <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="p-10 bg-slate-50 border-b flex flex-col gap-6">
            <div className="flex justify-between items-center">
               <h3 className="font-black text-slate-900 text-xl tracking-tighter">انتخاب تاریخ تقویم</h3>
               <button onClick={() => setShowCalendarModal(false)} className="bg-white p-3 rounded-2xl text-slate-400 border border-slate-100"><ICONS.Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              {(Object.keys(calendarConfig) as Array<keyof typeof calendarConfig>).map(type => (
                <button key={type} onClick={() => setActiveCalendarType(type)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeCalendarType === type ? `${calendarConfig[type].color} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-50'}`}>{calendarConfig[type].label}</button>
              ))}
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center px-4">
              <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1))} className="p-4 bg-slate-100 rounded-2xl text-indigo-600"><ICONS.ChevronLeft className="w-5 h-5 rotate-180" /></button>
              <span className="font-black text-slate-800 text-lg">{new Intl.DateTimeFormat(calendarConfig[activeCalendarType].locale, { month: 'long', year: 'numeric' }).format(navDate)}</span>
              <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1))} className="p-4 bg-slate-100 rounded-2xl text-indigo-600"><ICONS.ChevronLeft className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => (<div key={w} className="text-center text-[9px] font-black text-slate-300 py-2">{w}</div>))}
              {generateDays().map((d, i) => {
                const dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const isSelected = dateISO === date;
                const isCurrentMonth = d.getMonth() === navDate.getMonth();
                return (
                  <button key={i} onClick={() => { setDate(dateISO); setShowCalendarModal(false); }} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-xl scale-110' : isCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-200'}`}>{new Intl.DateTimeFormat(calendarConfig[activeCalendarType].locale, { day: 'numeric' }).format(d)}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RuleManagerModal = () => {
    const [editingRules, setEditingRules] = useState<GradingRule[]>([...localRules]);
    const handleSave = () => { setLocalRules(editingRules); setShowRuleManager(false); notify('سرفصل‌های امروز با موفقیت تنظیم شد.'); };
    const addLocalRule = () => { setEditingRules([...editingRules, { id: `rule-local-${Date.now()}`, name: 'سرفصل جدید', maxGrade: 20, coefficient: 1, percentage: 0, isNegative: false }]); };
    const removeLocalRule = (id: string) => { setEditingRules(editingRules.filter(r => r.id !== id)); };
    const updateLocalRule = (id: string, field: keyof GradingRule, value: any) => { setEditingRules(editingRules.map(r => r.id === id ? { ...r, [field]: value } : r)); };

    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/40">
        <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 max-h-[90vh]">
          <div className="p-10 bg-slate-50 border-b flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 text-2xl tracking-tighter">مدیریت سرفصل‌های امروز</h3>
              <p className="text-slate-400 text-xs font-bold mt-1">تغییرات فقط برای تاریخ {toPersianDate(date)} اعمال می‌شود.</p>
            </div>
            <button onClick={() => setShowRuleManager(false)} className="bg-white p-3 rounded-2xl text-slate-400 border border-slate-100"><ICONS.Plus className="w-6 h-6 rotate-45" /></button>
          </div>
          <div className="flex-grow overflow-y-auto p-10 space-y-4 no-scrollbar">
            {editingRules.map((rule) => (
              <div key={rule.id} className="flex flex-col lg:flex-row items-center gap-4 p-6 bg-slate-50/50 border-2 border-transparent hover:border-indigo-100 rounded-[2.5rem] transition-all">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">عنوان سرفصل</label><input type="text" value={rule.name} onChange={(e) => updateLocalRule(rule.id, 'name', e.target.value)} className="w-full px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black outline-none" /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">سقف نمره</label><input type="number" value={rule.maxGrade} onChange={(e) => updateLocalRule(rule.id, 'maxGrade', Number(e.target.value))} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-base font-black outline-none text-center" /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">ضریب</label><input type="number" step="0.1" value={rule.coefficient} onChange={(e) => updateLocalRule(rule.id, 'coefficient', Number(e.target.value))} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-base font-black outline-none text-center" /></div>
                </div>
                <button onClick={() => removeLocalRule(rule.id)} className="w-12 h-12 bg-white border border-rose-100 text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl flex items-center justify-center transition-all shadow-sm"><ICONS.Trash className="w-5 h-5" /></button>
              </div>
            ))}
            <button onClick={addLocalRule} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-black hover:border-indigo-400 transition-all flex items-center justify-center gap-3"><ICONS.Plus className="w-6 h-6" /> افزودن سرفصل جدید</button>
          </div>
          <div className="p-10 bg-slate-50 border-t flex justify-end gap-4">
             <button onClick={() => setShowRuleManager(false)} className="px-10 py-5 rounded-[2rem] font-black text-slate-500">انصراف</button>
             <button onClick={handleSave} className="bg-indigo-600 text-white px-16 py-5 rounded-[2rem] font-black shadow-xl">تأیید و اعمال</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-32">
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-top-10">
        <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
          <div onClick={() => setShowCalendarModal(true)} className="bg-slate-50 border-2 border-slate-50 hover:border-indigo-500 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-sm transition-all cursor-pointer w-full md:w-auto group">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform"><ICONS.Calendar className="w-7 h-7" /></div>
            <div><p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">تاریخ فعال ارزیابی</p><h4 className="text-xl font-black text-slate-800">{tripleDate?.shamsi}</h4></div>
          </div>
          <button onClick={() => setShowRuleManager(true)} className="w-full md:w-auto flex items-center justify-center gap-5 px-10 py-6 rounded-[2.5rem] font-black text-xs border-2 bg-white border-slate-100 text-slate-600 hover:border-indigo-500 transition-all shadow-sm">
            <ICONS.Settings className="w-5 h-5" /> تنظیم سرفصل‌های امروز
          </button>
        </div>
        <button onClick={() => setShowSummary(!showSummary)} className={`w-full md:w-auto px-10 py-6 rounded-[2.5rem] font-black text-xs flex items-center justify-center gap-5 shadow-2xl transition-all ${showSummary ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-indigo-50 text-indigo-600 shadow-indigo-50'}`}>
          {showSummary ? <><ICONS.Edit className="w-5 h-5" /> ورود نمرات</> : <><ICONS.Eye className="w-5 h-5" /> مشاهده ترازها</>}
        </button>
      </div>

      <div className="space-y-8">
        {students.map((student) => {
          const att = (data.attendanceRecords as AttendanceRecord[]).find(a => a.studentId === student.id && a.subjectId === subject.id && a.date === date);
          const isAbs = att?.status === 'absent';
          const finalScore = calculateStudentFinal(student.id);

          return (
            <div key={student.id} className={`bg-white rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden transition-all duration-500 ${isAbs ? 'opacity-40 grayscale-[0.6]' : 'hover:shadow-2xl hover:scale-[1.002]'}`}>
               <div className="p-8 lg:p-10 bg-slate-50/70 border-b flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex items-center gap-6 w-full lg:w-auto">
                     <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white font-black text-xl md:text-3xl shadow-xl shrink-0 ring-4 ring-white">{student.name.charAt(0)}</div>
                     <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                           <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight">{student.name}</h3>
                           <button onClick={() => setDetailStudentId(student.id)} className="p-2.5 bg-white rounded-xl text-indigo-400 hover:text-indigo-600 shadow-sm border border-slate-100 transition-all" title="مشاهده گزارش کامل نمرات و حضور غیاب"><ICONS.Eye className="w-5 h-5" /></button>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => toggleAttendance(student.id)} className={`px-5 py-2 rounded-2xl text-[10px] font-black border-2 transition-all ${att?.status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : isAbs ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : att?.status === 'late' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400'}`}>
                             {att?.status === 'present' ? 'حاضر' : isAbs ? 'غایب' : att?.status === 'late' ? 'تأخیر' : 'ثبت حضور'}
                           </button>
                        </div>
                     </div>
                  </div>

                  {showSummary && (
                    <div className="flex flex-col items-center lg:items-end animate-in zoom-in-95">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">تراز نهایی کل (۲۰)</p>
                       <span className={`text-4xl md:text-6xl font-black tracking-tighter ${Number(finalScore) >= 10 ? 'text-indigo-600' : 'text-rose-500'}`}>{finalScore}</span>
                    </div>
                  )}
               </div>

               {!showSummary && (
                 <div className="p-8 lg:p-10 flex flex-wrap gap-6 bg-white animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {localRules.map(rule => {
                      const entry = (data.gradeEntries as GradeEntry[]).find(e => e.studentId === student.id && e.subjectId === subject.id && e.ruleId === rule.id && e.date === date);
                      return (
                        <div key={rule.id} className={`flex flex-col p-6 rounded-[2.5rem] border-2 transition-all duration-300 min-w-[200px] flex-grow lg:flex-grow-0 ${entry?.value ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                           <div className="flex justify-between items-center gap-4 mb-4">
                              <span className="text-xs font-black text-slate-700 truncate max-w-[140px]">{rule.name}</span>
                              <div className="bg-white px-2 py-0.5 rounded-lg border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">سقف {rule.maxGrade}</div>
                           </div>
                           <input 
                             type="number" 
                             value={isAbs ? 0 : (entry?.value ?? '')} 
                             disabled={isAbs} 
                             onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; else e.target.select(); }}
                             onChange={(e) => updateGrade(student.id, rule.id, e.target.value)} 
                             className="w-full p-5 rounded-2xl text-center font-black text-3xl outline-none bg-white shadow-sm focus:ring-4 ring-indigo-500/10 transition-all border border-transparent focus:border-indigo-500 placeholder:text-slate-100" 
                             placeholder="---" 
                           />
                           <div className="mt-4 flex justify-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1 rounded-full border border-slate-100 shadow-sm">ضریب اثر: {rule.coefficient}</span>
                           </div>
                        </div>
                      );
                    })}
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {showCalendarModal && <CalendarModal />}
      {showRuleManager && <RuleManagerModal />}
      {detailStudentId && <AnalysisModal studentId={detailStudentId} />}
      
      <div className="fixed bottom-10 left-6 right-6 lg:left-10 lg:right-96 z-40 p-8 bg-slate-900 rounded-[3.5rem] text-white flex justify-between items-center shadow-2xl border border-white/5 animate-in slide-in-from-bottom-20 duration-1000">
         <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 shadow-inner"><ICONS.Save className="w-7 h-7" /></div>
            <div className="hidden sm:block">
               <h4 className="font-black text-sm md:text-lg tracking-tight">اطلاعات آماده ثبت نهایی است.</h4>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">تغییرات به صورت خودکار ذخیره می‌شوند.</p>
            </div>
         </div>
         <button onClick={() => notify('تمامی نمرات این صفحه با موفقیت در سامانه ثبت نهایی شد.')} className="bg-indigo-600 text-white px-12 md:px-20 py-5 rounded-[2rem] font-black text-xs md:text-base hover:bg-white hover:text-slate-950 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95">تأیید و ثبت نهایی</button>
      </div>
    </div>
  );
};

export default GradingView;
