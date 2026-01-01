
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSummary, setShowSummary] = useState(false);
  const [editingOverrides, setEditingOverrides] = useState<string | null>(null);
  const [showRuleManager, setShowRuleManager] = useState<boolean>(false);
  const [localRules, setLocalRules] = useState<GradingRule[]>([]);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);

  const students = useMemo(() => data.students.filter((s: Student) => s.classId === classRoom.id), [data.students, classRoom.id]);

  // منطق هوشمند برای استخراج قوانین روز جاری
  useEffect(() => {
    const baseRules = subject.rules.map(r => ({
      ...r,
      maxGrade: Number(r.maxGrade),
      coefficient: Number(r.coefficient)
    }));

    const entriesToday = data.gradeEntries.filter((e: GradeEntry) => e.subjectId === subject.id && e.date === date);
    
    // ترکیب قوانین پایه با هرگونه تغییر یا آیتم اضافی که در این روز ثبت شده
    const mergedRules = [...baseRules];
    
    entriesToday.forEach((e: GradeEntry) => {
      const existingIdx = mergedRules.findIndex(r => r.id === e.ruleId);
      if (existingIdx !== -1) {
        // اگر نمره‌ای با سقف یا ضریب متفاوت ثبت شده، نمایش در جدول را با آن همگام کن
        mergedRules[existingIdx] = {
          ...mergedRules[existingIdx],
          name: e.ruleNameAtTime || mergedRules[existingIdx].name,
          maxGrade: Number(e.maxAtTime),
          coefficient: Number(e.coefAtTime)
        };
      } else {
        // اگر آیتم کاملا جدیدی است که در قوانین اصلی درس نیست
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

    let newList;
    if (existing) {
      newList = data.gradeEntries.map((e: GradeEntry) => e.id === existing.id ? updatedEntry : e);
    } else {
      newList = [...data.gradeEntries, updatedEntry];
    }
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

    // اگر غایب شد، برای تمامی آیتم‌های تعریف شده امروز نمره صفر ثبت کن
    if (newStatus === 'absent') {
      const currentGrades = [...data.gradeEntries];
      localRules.forEach(rule => {
        const entryIdx = currentGrades.findIndex(e => e.studentId === studentId && e.ruleId === rule.id && e.date === date);
        const gradeObj = {
          id: entryIdx !== -1 ? currentGrades[entryIdx].id : `${Date.now()}-${studentId}-${rule.id}`,
          studentId,
          subjectId: subject.id,
          ruleId: rule.id,
          date,
          value: 0, // نمره صفر برای غایبین
          maxAtTime: Number(rule.maxGrade),
          coefAtTime: Number(rule.coefficient),
          ruleNameAtTime: rule.name,
          percentAtTime: Number(rule.percentage || 0),
          note: 'غیبت در کلاس'
        };

        if (entryIdx !== -1) {
          currentGrades[entryIdx] = gradeObj;
        } else {
          currentGrades.push(gradeObj);
        }
      });
      updateData('gradeEntries', currentGrades);
    }
    
    updateData('attendanceRecords', newList);
  };

  const calculateStudentFinal = (studentId: string) => {
    const studentEntries = data.gradeEntries.filter((e: GradeEntry) => e.studentId === studentId && e.subjectId === subject.id);
    if (studentEntries.length === 0) return "---";

    let totalWeightedScore = 0;
    let totalWeights = 0;

    studentEntries.forEach((e: GradeEntry) => {
      const coef = Number(e.coefAtTime || 0);
      const val = Number(e.value || 0);
      const max = Number(e.maxAtTime || 1);
      if (coef <= 0) return; // اگر ضریب صفر شده باشد (صرف نظر)، در محاسبات شرکت نمی‌کند
      const normalizedScore = (val / max) * 20;
      totalWeightedScore += normalizedScore * coef;
      totalWeights += coef;
    });

    if (totalWeights === 0) return "---";
    return (totalWeightedScore / totalWeights).toFixed(2);
  };

  const handleIgnoreAbsence = (entryId: string, ignore: boolean) => {
    const entry = data.gradeEntries.find((e: GradeEntry) => e.id === entryId);
    if (!entry) return;

    // پیدا کردن ضریب اصلی آیتم از قوانین روز یا درس
    const rule = localRules.find(r => r.id === entry.ruleId);
    const originalCoef = rule ? Number(rule.coefficient) : 1;

    const newList = data.gradeEntries.map((e: GradeEntry) => 
      e.id === entryId 
        ? { ...e, coefAtTime: ignore ? 0 : originalCoef, note: ignore ? 'غیبت نادیده گرفته شد' : 'غیبت در کلاس' } 
        : e
    );
    
    updateData('gradeEntries', newList);
    notify(ignore ? 'این آیتم از محاسبه معدل خارج شد.' : 'آیتم مجدداً در محاسبه معدل لحاظ شد.');
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
      } else {
        const newVal = field === 'maxGrade' ? Number(value) : Number(rule.maxGrade);
        const newCoef = field === 'coefficient' ? Number(value) : Number(rule.coefficient);
        const newName = field === 'name' ? String(value) : rule.name;
        
        newGradeEntries.push({
          id: `tmp-${student.id}-${id}-${date}`,
          studentId: student.id,
          subjectId: subject.id,
          ruleId: id,
          date: date,
          value: 0,
          maxAtTime: newVal,
          coefAtTime: newCoef,
          ruleNameAtTime: newName,
          percentAtTime: 0
        });
      }
    });

    updateData('gradeEntries', newGradeEntries);
    notify('تغییرات بر تمامی دانش‌آموزان در این تاریخ اعمال شد.');
  };

  const addNewItemToDay = () => {
    const newId = `local-${Date.now()}`;
    const newRuleName = 'آیتم فوق‌العاده';
    
    const newEntries = students.map(s => ({
      id: `${Date.now()}-${s.id}`,
      studentId: s.id,
      subjectId: subject.id,
      ruleId: newId,
      date: date,
      value: 0,
      maxAtTime: 20,
      coefAtTime: 1,
      ruleNameAtTime: newRuleName,
      percentAtTime: 0
    }));

    updateData('gradeEntries', [...data.gradeEntries, ...newEntries]);
    notify('آیتم جدید به لیست امروز اضافه شد.');
  };

  const removeRuleFromDay = (id: string) => {
    if (!confirm('تمامی نمرات این ستون در تاریخ انتخابی حذف شوند؟')) return;
    const filtered = data.gradeEntries.filter((e: GradeEntry) => !(e.ruleId === id && e.date === date));
    updateData('gradeEntries', filtered);
    notify('ستون از لیست امروز حذف شد.');
  };

  const detailStudent = detailStudentId ? students.find((s:Student) => s.id === detailStudentId) : null;
  const detailEntries = detailStudentId ? data.gradeEntries.filter((e:GradeEntry) => e.studentId === detailStudentId && e.subjectId === subject.id) : [];

  return (
    <div className="space-y-12 animate-in zoom-in-95 duration-700">
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
          <div className="relative w-full md:w-72">
             <label className="absolute -top-3 right-6 px-3 bg-white text-[9px] font-black text-indigo-600 uppercase z-10">تاریخ ارزیابی</label>
             <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-50 px-6 py-4 rounded-2xl text-sm font-black text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
             />
          </div>
          <button 
            onClick={() => setShowRuleManager(!showRuleManager)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs transition-all border-2 ${showRuleManager ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-500'}`}
          >
            <ICONS.Settings className="w-4 h-4" />
            مدیریت آیتم‌های امروز
          </button>
        </div>

        <button 
          onClick={() => setShowSummary(!showSummary)}
          className={`px-10 py-4 rounded-2xl font-black text-xs transition-all flex items-center gap-3 shadow-xl active:scale-95 ${showSummary ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
        >
          {showSummary ? <><ICONS.Edit className="w-4 h-4" /> بازگشت به نمره‌دهی</> : <><ICONS.Eye className="w-4 h-4" /> مشاهده گزارش نهایی</>}
        </button>
      </div>

      {showRuleManager && (
        <div className="bg-indigo-50/30 border-2 border-indigo-100 p-8 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-500 space-y-6">
           <div className="flex justify-between items-center">
              <h3 className="font-black text-indigo-900 text-sm">تغییر ضرایب و آیتم‌ها مخصوص تاریخ {new Date(date).toLocaleDateString('fa-IR')}</h3>
              <button onClick={addNewItemToDay} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all">افزودن آیتم جدید به لیست امروز</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {localRules.map(rule => (
               <div key={rule.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-50 flex flex-col gap-4">
                  <div className="flex justify-between items-center gap-2">
                    <input 
                      className="font-black text-xs text-slate-800 bg-transparent outline-none border-b-2 border-slate-100 focus:border-indigo-400 w-full"
                      value={rule.name}
                      onChange={(e) => updateLocalRuleForDay(rule.id, 'name', e.target.value)}
                    />
                    <button onClick={() => removeRuleFromDay(rule.id)} className="text-rose-300 hover:text-rose-600 p-1"><ICONS.Trash className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">سقف نمره</p>
                      <input type="number" className="w-full bg-slate-50 rounded-xl p-2 text-xs font-black text-center" value={rule.maxGrade} onChange={(e) => updateLocalRuleForDay(rule.id, 'maxGrade', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">ضریب امروز</p>
                      <input type="number" step="0.1" className="w-full bg-slate-50 rounded-xl p-2 text-xs font-black text-center" value={rule.coefficient} onChange={(e) => updateLocalRuleForDay(rule.id, 'coefficient', e.target.value)} />
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <table className="w-full text-right border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="p-8 text-center w-20">#</th>
                <th className="p-8 sticky right-0 bg-slate-50 z-10 border-l">دانش‌آموز</th>
                {!showSummary ? (
                  <>
                    <th className="p-8 text-center w-40">وضعیت حضور</th>
                    {localRules.map(rule => (
                      <th key={rule.id} className="p-8 text-center min-w-[140px]">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-800 text-xs font-black">{rule.name}</span>
                          <span className="text-[8px] text-slate-300">({rule.maxGrade} نمره - ض: {rule.coefficient})</span>
                        </div>
                      </th>
                    ))}
                  </>
                ) : (
                  <>
                    <th className="p-8 text-center w-48">معدل کل (وزن‌دار)</th>
                    <th className="p-8 text-center w-48">وضعیت انضباطی</th>
                    <th className="p-8 text-center">جزئیات و تحلیل نمره</th>
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
                    <td className="p-8 text-center text-slate-300 font-black text-base italic">{String(idx + 1).padStart(2, '۰')}</td>
                    <td className="p-8 sticky right-0 bg-white z-10 border-l font-black text-slate-700 text-base shadow-sm">{student.name}</td>
                    {!showSummary ? (
                      <>
                        <td className="p-8 text-center">
                          <button 
                            onClick={() => toggleAttendance(student.id)}
                            className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all border-2 ${
                              att?.status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white' :
                              att?.status === 'absent' ? 'bg-rose-500 border-rose-500 text-white' :
                              att?.status === 'late' ? 'bg-amber-500 border-amber-500 text-white' :
                              'bg-white border-slate-100 text-slate-300'
                            }`}
                          >
                            {att?.status === 'present' ? 'حاضر' : att?.status === 'absent' ? 'غایب' : att?.status === 'late' ? 'تأخیر' : 'ثبت'}
                          </button>
                        </td>
                        {localRules.map(rule => {
                          const entry = getEntry(student.id, rule.id, date);
                          // برای غایبین، نمره صفر در بک‌اند ثبت شده اما در جدول نباید نمایش داده شود
                          const displayValue = isAbsent ? '' : (entry?.value ?? '');

                          return (
                            <td key={rule.id} className="p-8">
                              <div className="relative group mx-auto w-28">
                                <input 
                                  type="number"
                                  disabled={isAbsent}
                                  value={displayValue}
                                  placeholder={isAbsent ? "--" : "--"}
                                  step="0.25"
                                  onChange={(e) => updateGrade(student.id, rule.id, 'value', e.target.value)}
                                  className={`w-full p-6 rounded-[1.8rem] text-center font-black text-2xl outline-none transition-all shadow-sm ${
                                    isAbsent ? 'bg-slate-100 text-slate-200 cursor-not-allowed opacity-50' : 'bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500 text-indigo-950'
                                  }`}
                                />
                                {!isAbsent && (
                                  <button 
                                    onClick={() => setEditingOverrides(editingOverrides === `${rule.id}-${student.id}` ? null : `${rule.id}-${student.id}`)}
                                    className="absolute -top-3 -left-3 w-8 h-8 bg-white rounded-xl border border-slate-100 text-slate-300 hover:text-indigo-600 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
                                  >
                                    <ICONS.Edit className="w-4 h-4" />
                                  </button>
                                )}
                                {editingOverrides === `${rule.id}-${student.id}` && (
                                  <div className="absolute z-[100] top-full mt-4 right-0 bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-2xl min-w-[240px] animate-in slide-in-from-top-4">
                                    <textarea 
                                      className="w-full bg-slate-50 p-4 rounded-xl text-xs font-bold outline-none mb-4 h-24 resize-none border-2 border-transparent focus:border-indigo-500"
                                      placeholder="ملاحظات نمره..."
                                      value={entry?.note || ''}
                                      onChange={(e) => updateGrade(student.id, rule.id, 'note', e.target.value)}
                                    />
                                    <button onClick={() => setEditingOverrides(null)} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-xs font-black">تایید</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <td className="p-8 text-center">
                          <span className={`text-4xl font-black tracking-tighter ${Number(finalGrade) >= 10 ? 'text-indigo-600' : 'text-rose-500'}`}>
                            {finalGrade}
                          </span>
                        </td>
                        <td className="p-8 text-center">
                           <div className="flex flex-col gap-1 items-center">
                              <span className="text-[10px] font-black text-rose-500">{data.attendanceRecords.filter((a:any)=>a.studentId===student.id && a.status==='absent').length} غیبت</span>
                              <span className="text-[10px] font-black text-amber-500">{data.attendanceRecords.filter((a:any)=>a.studentId===student.id && a.status==='late').length} تأخیر</span>
                           </div>
                        </td>
                        <td className="p-8 text-center">
                           <button onClick={() => setDetailStudentId(student.id)} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm">مشاهده ریز نمرات و آنالیز</button>
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

      {detailStudentId && detailStudent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/60 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-xl">
                       {detailStudent.name.charAt(0)}
                    </div>
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 tracking-tighter">آنالیز جامع: {detailStudent.name}</h2>
                       <p className="text-slate-400 font-bold text-sm">گزارش تفصیلی تمامی فعالیت‌ها و نمرات ثبت شده (شامل نمرات صفر ناشی از غیبت)</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setDetailStudentId(null)} 
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 font-black text-xs group"
                 >
                    <ICONS.ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    بازگشت به لیست
                 </button>
              </div>

              <div className="flex-grow overflow-y-auto pr-4 no-scrollbar space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">معدل کل نهایی</p>
                       <p className="text-5xl font-black text-indigo-600 tracking-tighter">{calculateStudentFinal(detailStudent.id)}</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">تعداد ارزیابی‌ها</p>
                       <p className="text-5xl font-black text-slate-700 tracking-tighter">{detailEntries.length}</p>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[2rem]">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">مجموع ضرایب وزنی</p>
                       <p className="text-5xl font-black text-white tracking-tighter">
                         {detailEntries.reduce((acc, e) => acc + Number(e.coefAtTime || 0), 0).toFixed(1)}
                       </p>
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-right border-collapse">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                          <tr>
                             <th className="p-6">تاریخ</th>
                             <th className="p-6">عنوان فعالیت</th>
                             <th className="p-6 text-center">نمره خام</th>
                             <th className="p-6 text-center">سقف</th>
                             <th className="p-6 text-center">ضریب</th>
                             <th className="p-6 text-center bg-indigo-50/50 text-indigo-600">نمره از ۲۰</th>
                             <th className="p-6">توضیحات و عملیات</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {detailEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => {
                             const v = Number(e.value || 0);
                             const m = Number(e.maxAtTime || 1);
                             const isGradeZeroByAbsence = (e.note === 'غیبت در کلاس' || e.note === 'غیبت نادیده گرفته شد') && v === 0;
                             const isIgnored = Number(e.coefAtTime) === 0 && isGradeZeroByAbsence;

                             return (
                             <tr key={e.id} className={`text-sm font-bold text-slate-600 hover:bg-slate-50/50 transition-colors ${isGradeZeroByAbsence ? 'bg-rose-50/30' : ''} ${isIgnored ? 'opacity-60' : ''}`}>
                                <td className="p-6 whitespace-nowrap">{new Date(e.date).toLocaleDateString('fa-IR')}</td>
                                <td className="p-6 font-black text-slate-900">{e.ruleNameAtTime || 'نامشخص'}</td>
                                <td className="p-6 text-center font-black text-slate-800">{v}</td>
                                <td className="p-6 text-center">{m}</td>
                                <td className="p-6 text-center">
                                   <span className={isIgnored ? 'text-rose-500 line-through' : ''}>
                                      {Number(e.coefAtTime || 0)}
                                   </span>
                                </td>
                                <td className="p-6 text-center font-black bg-indigo-50/30 text-indigo-600 italic">
                                   {((v / m) * 20).toFixed(2)}
                                </td>
                                <td className="p-6">
                                   <div className="flex flex-col gap-2">
                                      <span className="text-[10px] text-slate-400 italic block">{e.note || '---'}</span>
                                      {isGradeZeroByAbsence && (
                                         <button 
                                           onClick={() => handleIgnoreAbsence(e.id, !isIgnored)}
                                           className={`text-[9px] font-black px-3 py-1 rounded-lg transition-all w-fit ${
                                              isIgnored 
                                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' 
                                              : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                                           }`}
                                         >
                                            {isIgnored ? 'لغو صرف نظر (لحاظ در معدل)' : 'صرف نظر کردن از غیبت در این آیتم'}
                                         </button>
                                      )}
                                   </div>
                                </td>
                             </tr>
                          )})}
                       </tbody>
                    </table>
                 </div>

                 <div className="p-10 bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-[2.5rem]">
                    <h4 className="font-black text-indigo-900 mb-4 flex items-center gap-3">
                       <ICONS.Bell className="w-5 h-5" />
                       شفافیت در محاسبات:
                    </h4>
                    <ul className="text-xs text-indigo-700 leading-relaxed font-bold space-y-2 list-disc list-inside">
                       <li>معدل نهایی حاصل میانگین وزن‌دار نمرات تبدیل شده به مقیاس ۲۰ است.</li>
                       <li>غیبت در کلاس به منزله نمره صفر تلقی شده و در معدل اثرگذار است.</li>
                       <li>در صورت انتخاب "صرف نظر کردن"، ضریب آن فعالیت صفر شده و تأثیری در کاهش یا افزایش معدل نخواهد داشت.</li>
                    </ul>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white flex justify-between items-center shadow-2xl">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center text-indigo-400">
               <ICONS.Save className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] mb-1 uppercase">Cloud Sync Active</p>
               <h4 className="text-xl font-black tracking-tight leading-none">تغییرات شما با دقت بالا ثبت و پشتیبان‌گیری شد.</h4>
            </div>
         </div>
         <button onClick={() => notify('لیست با موفقیت ثبت نهایی شد.')} className="bg-indigo-600 text-white px-12 py-5 rounded-[2.2rem] font-black text-lg hover:bg-white hover:text-slate-950 transition-all active:scale-95 shadow-2xl shadow-indigo-500/20">ثبت نهایی و اتمام جلسه</button>
      </div>
    </div>
  );
};

export default GradingView;
