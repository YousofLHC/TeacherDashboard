
import React, { useState, useMemo } from 'react';
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
  const [editingOverrides, setEditingOverrides] = useState<string | null>(null); // ruleId-studentId
  const [showConsistencyModal, setShowConsistencyModal] = useState(false);

  const students = useMemo(() => data.students.filter((s: Student) => s.classId === classRoom.id), [data.students, classRoom.id]);
  const rules = subject.rules || [];

  const getEntry = (studentId: string, ruleId: string, currentDate: string) => {
    return data.gradeEntries.find((e: GradeEntry) => e.studentId === studentId && e.ruleId === ruleId && e.date === currentDate);
  };

  const getAttendance = (studentId: string, currentDate: string) => {
    return data.attendanceRecords.find((a: AttendanceRecord) => a.studentId === studentId && a.date === currentDate);
  };

  const updateGrade = (studentId: string, ruleId: string, field: string, val: any) => {
    const existing = getEntry(studentId, ruleId, date);
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const baseEntry = existing || {
      id: Date.now().toString() + Math.random(),
      studentId,
      subjectId: subject.id,
      ruleId,
      date,
      value: 0,
      maxAtTime: rule.maxGrade,
      coefAtTime: rule.coefficient,
      percentAtTime: rule.percentage,
      note: ''
    };

    let updatedValue = baseEntry.value;
    let updatedMax = baseEntry.maxAtTime;
    let updatedCoef = baseEntry.coefAtTime;
    let updatedNote = baseEntry.note;

    if (field === 'value') {
      updatedValue = parseFloat(val);
      if (isNaN(updatedValue)) updatedValue = 0;
      if (updatedValue < 0) updatedValue = 0;
      if (updatedValue > updatedMax) updatedValue = updatedMax;
    } else if (field === 'max') {
      updatedMax = parseFloat(val) || rule.maxGrade;
      if (updatedValue > updatedMax) updatedValue = updatedMax;
    } else if (field === 'coef') {
      updatedCoef = parseFloat(val) || 0;
    } else if (field === 'note') {
      updatedNote = val;
    }

    const newEntry = { 
      ...baseEntry, 
      value: updatedValue, 
      maxAtTime: updatedMax, 
      coefAtTime: updatedCoef,
      note: updatedNote
    };

    let newList;
    if (existing) {
      newList = data.gradeEntries.map((e: GradeEntry) => e.id === existing.id ? newEntry : e);
    } else {
      newList = [...data.gradeEntries, newEntry];
    }
    updateData('gradeEntries', newList);
  };

  const toggleAttendance = (studentId: string) => {
    const existing = getAttendance(studentId, date);
    let newList;
    if (existing) {
      const nextStatus: Record<AttendanceStatus, AttendanceStatus> = {
        'present': 'absent',
        'absent': 'late',
        'late': 'present'
      };
      newList = data.attendanceRecords.map((a: AttendanceRecord) => a.id === existing.id ? { ...a, status: nextStatus[a.status] } : a);
    } else {
      newList = [...data.attendanceRecords, {
        id: Date.now().toString() + Math.random(),
        studentId,
        subjectId: subject.id,
        date,
        status: 'present'
      }];
    }
    updateData('attendanceRecords', newList);
  };

  // CHECK CONSISTENCY
  const checkInconsistency = () => {
    let hasInconsistency = false;
    rules.forEach(rule => {
      const entries = students.map(s => getEntry(s.id, rule.id, date)).filter(Boolean);
      if (entries.length > 1) {
        const firstMax = entries[0]?.maxAtTime;
        const firstCoef = entries[0]?.coefAtTime;
        const mismatch = entries.some(e => e?.maxAtTime !== firstMax || e?.coefAtTime !== firstCoef);
        if (mismatch) hasInconsistency = true;
      }
    });
    return hasInconsistency;
  };

  const bulkFixRules = (ruleId: string, targetMax: number, targetCoef: number) => {
    const updatedEntries = data.gradeEntries.map((e: GradeEntry) => {
      if (e.ruleId === ruleId && e.date === date && students.some(s => s.id === e.studentId)) {
        return { ...e, maxAtTime: targetMax, coefAtTime: targetCoef, value: Math.min(e.value, targetMax) };
      }
      return e;
    });
    updateData('gradeEntries', updatedEntries);
    notify(`تنظیمات تمامی نمرات برای سرفصل یکسان‌سازی شد.`);
  };

  const handleFinalize = () => {
    if (checkInconsistency()) {
      setShowConsistencyModal(true);
    } else {
      notify('تمامی نمرات با موفقیت ذخیره و بایگانی شدند.');
    }
  };

  const calculateStudentFinal = (studentId: string) => {
    const studentEntries = data.gradeEntries.filter((e: GradeEntry) => e.studentId === studentId && e.subjectId === subject.id);
    const ruleGroups: Record<string, GradeEntry[]> = {};
    studentEntries.forEach(e => {
      if (!ruleGroups[e.ruleId]) ruleGroups[e.ruleId] = [];
      ruleGroups[e.ruleId].push(e);
    });

    let totalWeightedScore = 0;
    let totalWeights = 0;

    rules.forEach(rule => {
      const entries = ruleGroups[rule.id] || [];
      if (entries.length === 0) return;
      const avgNormalized = entries.reduce((acc, curr) => acc + (curr.value / curr.maxAtTime), 0) / entries.length;
      const lastEntry = entries[entries.length-1];
      const weight = lastEntry.coefAtTime;
      totalWeightedScore += (avgNormalized * 20) * weight;
      totalWeights += weight;
    });

    return totalWeights === 0 ? "---" : (totalWeightedScore / totalWeights).toFixed(2);
  };

  return (
    <div className="space-y-12 animate-in zoom-in-95 duration-1000">
      {/* Settings Bar */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-50 flex flex-wrap items-center justify-between gap-10">
        <div className="flex flex-wrap items-center gap-10">
          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] px-2">تاریخ ثبت فعالیت</p>
             <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-50 border-2 border-transparent px-8 py-5 rounded-[2rem] text-sm font-black text-indigo-900 focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-sm"
             />
          </div>
          <div className="bg-indigo-50/50 px-8 py-5 rounded-3xl border border-indigo-100">
             <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em] mb-1">تعداد دانش‌آموزان</p>
             <span className="font-black text-indigo-700 text-xl tracking-tight">{students.length} نفر</span>
          </div>
        </div>

        <button 
          onClick={() => setShowSummary(!showSummary)}
          className={`px-12 py-5 rounded-[2.2rem] font-black text-sm tracking-tight transition-all flex items-center gap-4 shadow-2xl active:scale-[0.98] border-2 ${
            showSummary 
            ? 'bg-slate-900 text-white border-slate-900 shadow-slate-300' 
            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-600 hover:text-indigo-600'
          }`}
        >
          {showSummary ? 'مشاهده دفتر نمرات' : 'تولید گزارش کارنامه'}
        </button>
      </div>

      {/* Main Table Matrix */}
      <div className="bg-white rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-right border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b">
                <th className="p-10 text-center w-24">#</th>
                <th className="p-10 sticky right-0 bg-slate-50/50 z-20">نام دانش‌آموز</th>
                {!showSummary ? (
                  <>
                    <th className="p-10 text-center w-36">حضور</th>
                    {rules.map(rule => (
                      <th key={rule.id} className="p-10 text-center min-w-[180px]">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-900 text-xs font-black">{rule.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1">سقف: {rule.maxGrade} | ضریب: {rule.coefficient}</span>
                        </div>
                      </th>
                    ))}
                  </>
                ) : (
                  <>
                    <th className="p-10 text-center">معدل کلاسی (۲۰)</th>
                    <th className="p-10 text-center">وضعیت حضور</th>
                    <th className="p-10 text-center">یادداشت نهایی</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student: Student, index: number) => {
                const att = getAttendance(student.id, date);
                return (
                  <tr key={student.id} className="hover:bg-indigo-50/10 transition-all duration-500 group">
                    <td className="p-10 text-center text-slate-200 font-black italic text-xl tracking-tighter">{String(index + 1).padStart(2, '۰')}</td>
                    <td className="p-10 sticky right-0 bg-white group-hover:bg-indigo-50/5 transition-colors z-10 border-l border-slate-50">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-50 text-indigo-400 flex items-center justify-center font-black text-base">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-black text-slate-800 text-lg tracking-tight">{student.name}</span>
                      </div>
                    </td>
                    {!showSummary ? (
                      <>
                        <td className="p-10 text-center">
                          <button 
                            onClick={() => toggleAttendance(student.id)}
                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-90 border-2 ${
                              att?.status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white' :
                              att?.status === 'absent' ? 'bg-rose-500 border-rose-500 text-white' :
                              att?.status === 'late' ? 'bg-amber-500 border-amber-500 text-white' :
                              'bg-white border-slate-100 text-slate-300'
                            }`}
                          >
                            {att?.status === 'present' ? 'حاضر' : att?.status === 'absent' ? 'غایب' : att?.status === 'late' ? 'تأخیر' : 'ثبت حضور'}
                          </button>
                        </td>
                        {rules.map(rule => {
                          const entry = getEntry(student.id, rule.id, date);
                          const isEditing = editingOverrides === `${rule.id}-${student.id}`;
                          return (
                            <td key={rule.id} className="p-8">
                              <div className="flex flex-col items-center gap-4 relative">
                                <div className="relative group/input">
                                  <input 
                                    type="number"
                                    min="0"
                                    max={entry?.maxAtTime || rule.maxGrade}
                                    step="0.25"
                                    value={entry?.value ?? ''}
                                    placeholder="۰"
                                    onChange={(e) => updateGrade(student.id, rule.id, 'value', e.target.value)}
                                    className="w-24 px-5 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.8rem] text-center font-black text-2xl outline-none transition-all shadow-inner text-indigo-950"
                                  />
                                  <button 
                                    onClick={() => setEditingOverrides(isEditing ? null : `${rule.id}-${student.id}`)}
                                    className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center border transition-all shadow-lg z-20 ${
                                      isEditing ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-300 hover:text-indigo-600 opacity-0 group-hover/input:opacity-100'
                                    }`}
                                  >
                                    <ICONS.Settings className="w-4 h-4" />
                                  </button>
                                </div>

                                {isEditing && (
                                  <div className="absolute z-[100] top-full mt-4 flex flex-col gap-3 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)] animate-in slide-in-from-top-4 duration-300 min-w-[220px]">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase text-center border-b pb-2 mb-2">تغییر ویژگی آیتم برای {student.name}</h4>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase pr-2">سقف نمره این شاگرد</p>
                                      <input 
                                        type="number" 
                                        className="w-full bg-slate-50 text-[11px] font-black p-4 rounded-xl text-center outline-none border-2 border-transparent focus:border-indigo-500"
                                        value={entry?.maxAtTime || rule.maxGrade}
                                        onChange={(e) => updateGrade(student.id, rule.id, 'max', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase pr-2">ضریب اختصاصی</p>
                                      <input 
                                        type="number" 
                                        step="0.1"
                                        className="w-full bg-slate-50 text-[11px] font-black p-4 rounded-xl text-center outline-none border-2 border-transparent focus:border-indigo-500"
                                        value={entry?.coefAtTime || rule.coefficient}
                                        onChange={(e) => updateGrade(student.id, rule.id, 'coef', e.target.value)}
                                      />
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder="یادداشت و ملاحظات..."
                                      className="bg-slate-50 text-[11px] font-bold p-4 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 mt-2"
                                      value={entry?.note || ''}
                                      onChange={(e) => updateGrade(student.id, rule.id, 'note', e.target.value)}
                                    />
                                    <button 
                                      onClick={() => setEditingOverrides(null)}
                                      className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black mt-2 shadow-lg"
                                    >تایید و بستن</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <td className="p-10 text-center">
                          <span className="text-4xl font-black text-indigo-600 tracking-tighter">{calculateStudentFinal(student.id)}</span>
                        </td>
                        <td className="p-10 text-center">
                          <div className="flex flex-col gap-1 items-center">
                             <span className="text-[11px] font-black text-rose-500 bg-rose-50 px-5 py-2 rounded-2xl border border-rose-100">
                                {data.attendanceRecords.filter((a: any) => a.studentId === student.id && a.status === 'absent').length} غیبت
                             </span>
                          </div>
                        </td>
                        <td className="p-10">
                          <p className="text-xs font-bold text-slate-400 max-w-[250px] truncate italic leading-relaxed">
                            {data.gradeEntries.filter((e: any) => e.studentId === student.id).slice(-1)[0]?.note || '---'}
                          </p>
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

      <div className="flex items-center justify-between py-10 px-6 bg-white/50 rounded-[3rem] border border-white">
         <div className="flex items-center gap-6 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] italic">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>تمامی نمرات لحظه‌ای ذخیره می‌شوند</span>
         </div>
         {!showSummary && (
           <button 
             onClick={handleFinalize}
             className="bg-slate-900 text-white px-24 py-6 rounded-[2.5rem] font-black text-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-indigo-600 transition-all duration-500 active:scale-95"
           >
             تایید نهایی و بایگانی کلاس
           </button>
         )}
      </div>

      {/* Bulk Consistency Fix Modal */}
      {showConsistencyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/60 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] p-16 shadow-[0_100px_200px_-50px_rgba(0,0,0,0.4)] border border-slate-100 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-8 mb-12">
                 <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-500 shadow-inner">
                    <ICONS.Bell className="w-12 h-12" />
                 </div>
                 <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">عدم تطابق ضرایب دانش‌آموزان</h2>
                    <p className="text-slate-500 font-bold text-lg leading-relaxed max-w-2xl">
                        تعدادی از دانش‌آموزان دارای نمرات با ویژگی‌های متفاوت (سقف نمره یا ضریب اختصاصی) هستند. 
                        می‌توانید همین نمرات را ذخیره کنید یا با وارد کردن مقادیر زیر، تمامی شاگردان را یکسان‌سازی نمایید.
                    </p>
                 </div>
              </div>

              <div className="space-y-6 mb-12 max-h-[400px] overflow-y-auto pr-6 no-scrollbar">
                {rules.map(rule => {
                   const entries = students.map(s => getEntry(s.id, rule.id, date)).filter(Boolean);
                   const isMismatch = entries.some(e => e?.maxAtTime !== entries[0]?.maxAtTime || e?.coefAtTime !== entries[0]?.coefAtTime);
                   
                   return isMismatch ? (
                     <div key={rule.id} className="p-10 bg-slate-50 border-2 border-amber-200 rounded-[3rem] flex items-center justify-between gap-10">
                        <div className="flex-grow">
                           <p className="font-black text-slate-900 text-2xl mb-2">{rule.name}</p>
                           <p className="text-xs font-black text-amber-600 bg-amber-100/50 px-4 py-1.5 rounded-full inline-block">تفاوت در ویژگی‌ها شناسایی شد</p>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-black text-slate-400 px-3 uppercase tracking-widest">سقف نمره همگانی</span>
                              <input 
                                type="number" 
                                defaultValue={rule.maxGrade}
                                id={`bulk-max-${rule.id}`}
                                className="w-28 bg-white border-2 border-slate-200 rounded-2xl p-4 text-center font-black outline-none focus:border-indigo-600 shadow-sm"
                              />
                           </div>
                           <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-black text-slate-400 px-3 uppercase tracking-widest">ضریب همگانی</span>
                              <input 
                                type="number" 
                                step="0.1"
                                defaultValue={rule.coefficient}
                                id={`bulk-coef-${rule.id}`}
                                className="w-28 bg-white border-2 border-slate-200 rounded-2xl p-4 text-center font-black outline-none focus:border-indigo-600 shadow-sm"
                              />
                           </div>
                           <button 
                             onClick={() => {
                               const m = parseFloat((document.getElementById(`bulk-max-${rule.id}`) as HTMLInputElement).value);
                               const c = parseFloat((document.getElementById(`bulk-coef-${rule.id}`) as HTMLInputElement).value);
                               bulkFixRules(rule.id, m, c);
                             }}
                             className="bg-indigo-600 text-white px-8 py-5 rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                           >اعمال یکسان‌سازی</button>
                        </div>
                     </div>
                   ) : null;
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-6 pt-6 border-t border-slate-100">
                 <button 
                   onClick={() => { setShowConsistencyModal(false); notify('نمرات با تفاوت‌های اختصاصی ذخیره شدند.'); }}
                   className="flex-grow bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black transition-all hover:bg-slate-200 text-base"
                 >تایید و ذخیره با تفاوت‌ها</button>
                 <button 
                   onClick={() => setShowConsistencyModal(false)}
                   className="flex-grow bg-slate-900 text-white py-6 rounded-[2.2rem] font-black shadow-2xl hover:bg-black transition-all text-base"
                 >برگشت جهت اصلاح دستی</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GradingView;
