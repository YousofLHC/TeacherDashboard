
import React, { useState, useMemo } from 'react';
import { Teacher, AcademicYear, School, ClassRoom, Subject, Reminder, Student } from '../types';
import { ICONS } from '../constants';

interface Props {
  data: any;
  currentUser: Teacher;
  selectedYear: string | null;
  setSelectedYear: (id: string | null) => void;
  selectedSchool: string | null;
  setSelectedSchool: (id: string | null) => void;
  selectedClass: string | null;
  setSelectedClass: (id: string | null) => void;
  selectedSubject: string | null;
  setSelectedSubject: (id: string | null) => void;
  onStartGrading: () => void;
  onManageRules: () => void;
  updateData: (key: string, value: any) => void;
}

const DashboardView: React.FC<Props> = ({
  data, currentUser,
  selectedYear, setSelectedYear,
  selectedSchool, setSelectedSchool,
  selectedClass, setSelectedClass,
  selectedSubject, setSelectedSubject,
  onStartGrading,
  onManageRules,
  updateData
}) => {
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    targetType: 'global' as 'global' | 'class' | 'subject' | 'student', 
    targetClassId: '', 
    targetSubjectId: '',
    targetStudentId: ''
  });

  const teacherYears = data.academicYears.filter((y: AcademicYear) => y.teacherId === currentUser.id);
  const yearSchools = data.schools.filter((s: School) => s.yearId === selectedYear);
  const schoolClasses = data.classes.filter((c: ClassRoom) => c.schoolId === selectedSchool);
  const classSubjects = data.subjects.filter((s: Subject) => s.classId === (newReminder.targetClassId || selectedClass));
  const classStudents = data.students.filter((s: Student) => s.classId === (newReminder.targetClassId || selectedClass));

  const today = new Date().toISOString().split('T')[0];
  
  // تمام یادآورهای امروز دبیر جاری
  const allTodayReminders = useMemo(() => {
    return (data.reminders as Reminder[] || []).filter(r => r.date === today && r.teacherId === currentUser.id);
  }, [data.reminders, today, currentUser.id]);

  // یادآورهای مرتبط با کلاس، درس و دانش‌آموزان انتخاب شده
  const contextReminders = useMemo(() => {
    if (!selectedClass) return [];
    
    return allTodayReminders.filter(r => {
      // اگر یادآور مربوط به همین کلاس باشد
      const matchesClass = r.classId === selectedClass;
      
      // اگر یادآور مربوط به دانش‌آموزی در این کلاس باشد
      const isStudentInClass = r.studentId && data.students.some((s: any) => s.id === r.studentId && s.classId === selectedClass);
      
      // اگر درسی انتخاب شده، یادآورهای آن درس را هم نشان بده
      const matchesSubject = selectedSubject && r.subjectId === selectedSubject;
      
      // یادآورهای کلی کلاس یا دانش‌آموزان آن یا درس خاص انتخاب شده
      return matchesClass || isStudentInClass || matchesSubject;
    });
  }, [allTodayReminders, selectedClass, selectedSubject, data.students]);

  const handleAddReminder = () => {
    if (!newReminder.title.trim()) return;
    
    const reminder: Reminder = {
      id: `rem-${Date.now()}`,
      teacherId: currentUser.id,
      title: newReminder.title,
      date: newReminder.date,
      isCompleted: false,
      classId: newReminder.targetClassId || undefined,
      subjectId: newReminder.targetSubjectId || undefined,
      studentId: newReminder.targetStudentId || undefined,
    };

    updateData('reminders', [...(data.reminders || []), reminder]);
    setNewReminder({ title: '', date: today, targetType: 'global', targetClassId: '', targetSubjectId: '', targetStudentId: '' });
    setShowReminderModal(false);
  };

  const toggleReminder = (id: string) => {
    const updated = (data.reminders as Reminder[]).map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r);
    updateData('reminders', updated);
  };

  const deleteReminder = (id: string) => {
    updateData('reminders', (data.reminders as Reminder[]).filter(r => r.id !== id));
  };

  const StepCard = ({ number, title, items, selectedId, onSelect, placeholder }: any) => (
    <div className={`relative bg-white rounded-[2rem] border-2 transition-all duration-300 p-8 flex flex-col gap-6 ${selectedId ? 'border-blue-500 shadow-xl shadow-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${selectedId ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
          {number}
        </div>
        {selectedId && <div className="bg-blue-50 text-blue-600 p-1 rounded-full"><ICONS.Save className="w-5 h-5" /></div>}
      </div>
      
      <div>
        <h3 className="font-black text-slate-800 text-lg mb-1">{title}</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{placeholder}</p>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
        {items.length === 0 ? (
          <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
             <span className="text-[10px] text-slate-300 font-black uppercase">اطلاعاتی یافت نشد</span>
          </div>
        ) : (
          items.map((item: any) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                selectedId === item.id 
                  ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-offset-2' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.name}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Reminder Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
                <ICONS.Bell className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">یادآورهای هوشمند امروز</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">تعداد کل یادداشت‌ها: {allTodayReminders.length}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowReminderModal(true)}
              className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-100 hover:scale-110 active:scale-95 transition-all"
            >
              <ICONS.Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
            {allTodayReminders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <ICONS.EyeOff className="w-10 h-10 mb-4 opacity-20" />
                <p className="font-bold text-sm">برای امروز یادآوری ثبت نشده است.</p>
              </div>
            ) : (
              allTodayReminders.map(rem => (
                <div key={rem.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${rem.isCompleted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-indigo-50 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleReminder(rem.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rem.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 hover:border-indigo-400'}`}
                    >
                      {rem.isCompleted && <ICONS.Save className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${rem.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>{rem.title}</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {rem.classId && <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">کلاس: {data.classes.find((c:any)=>c.id===rem.classId)?.name}</span>}
                        {rem.subjectId && <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">درس: {data.subjects.find((s:any)=>s.id===rem.subjectId)?.name}</span>}
                        {rem.studentId && <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md">دانش‌آموز: {data.students.find((s:any)=>s.id===rem.studentId)?.name}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteReminder(rem.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <ICONS.Trash className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Quick Stats */}
        <div className="bg-indigo-600 rounded-[3rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
          <div>
            <h4 className="text-xl font-black mb-2">بهره‌وری آموزشی</h4>
            <p className="text-indigo-100 text-xs font-medium leading-relaxed opacity-80">یادداشت‌های هوشمند بر اساس کلاس و درس تفکیک می‌شوند تا بیشترین کارایی را داشته باشند.</p>
          </div>
          <div className="mt-8">
            <div className="text-5xl font-black tracking-tighter mb-1">{allTodayReminders.filter(r=>!r.isCompleted).length}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">یادداشت فعال سیستمی</p>
          </div>
        </div>
      </div>

      {/* Contextual Reminders for Selected Class/Subject */}
      {selectedClass && contextReminders.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[2.5rem] animate-in slide-in-from-top-4 shadow-sm">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <ICONS.Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xl font-black text-amber-900 tracking-tight">یادداشت‌های مرتبط با انتخاب جاری</h4>
                <p className="text-[10px] font-bold text-amber-700 opacity-60">نمایش بر اساس کلاس، درس و دانش‌آموزان مرتبط</p>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contextReminders.map(rem => (
                <div key={rem.id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between group hover:border-amber-400 transition-all">
                   <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${rem.isCompleted ? 'bg-slate-300' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
                      <div>
                        <p className={`font-black text-sm ${rem.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{rem.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rem.subjectId && <span className="text-[7px] font-black bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-100">درس: {data.subjects.find((s:any)=>s.id===rem.subjectId)?.name}</span>}
                          {rem.studentId && <span className="text-[7px] font-black bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded border border-rose-100">برای: {data.students.find((s:any)=>s.id===rem.studentId)?.name}</span>}
                        </div>
                      </div>
                   </div>
                   <button onClick={() => toggleReminder(rem.id)} className="p-2 text-slate-300 hover:text-amber-600 transition-all opacity-0 group-hover:opacity-100">
                      <ICONS.Save className="w-4 h-4" />
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <StepCard 
          number="۰۱"
          title="سال تحصیلی" 
          items={teacherYears} 
          selectedId={selectedYear} 
          onSelect={(id: string) => {
            setSelectedYear(id);
            setSelectedSchool(null);
            setSelectedClass(null);
            setSelectedSubject(null);
          }}
          placeholder="انتخاب دوره آموزشی"
        />
        
        {selectedYear && (
          <StepCard 
            number="۰۲"
            title="محل تدریس" 
            items={yearSchools} 
            selectedId={selectedSchool} 
            onSelect={(id: string) => {
              setSelectedSchool(id);
              setSelectedClass(null);
              setSelectedSubject(null);
            }}
            placeholder="انتخاب نام مدرسه"
          />
        )}

        {selectedSchool && (
          <StepCard 
            number="۰۳"
            title="کلاس درس" 
            items={schoolClasses} 
            selectedId={selectedClass} 
            onSelect={(id: string) => {
              setSelectedClass(id);
              setSelectedSubject(null);
            }}
            placeholder="انتخاب پایه و کلاس"
          />
        )}

        {selectedClass && (
          <StepCard 
            number="۰۴"
            title="درس هدف" 
            items={classSubjects} 
            selectedId={selectedSubject} 
            onSelect={setSelectedSubject}
            placeholder="انتخاب عنوان درسی"
          />
        )}
      </div>

      {selectedSubject && (
        <div className="bg-slate-900 rounded-[2.5rem] p-12 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 group-hover:bg-blue-500/30 transition-all duration-700"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-white mb-4">مدیریت نمره و انضباط</h2>
            <p className="text-slate-400 max-w-md font-medium leading-relaxed">
              شما هم‌اکنون به پنل اختصاصی درس <span className="text-blue-400 font-bold underline underline-offset-8">{data.subjects.find((s:any)=>s.id===selectedSubject)?.name}</span> دسترسی دارید. قوانین نمره‌دهی و لیست حضور دانش‌آموزان آماده است.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto relative z-10">
            <button 
              onClick={onManageRules}
              className="bg-slate-800 text-white hover:bg-slate-700 px-8 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-3 border border-slate-700"
            >
              <ICONS.Edit className="w-5 h-5 text-slate-400" />
              قوانین ارزیابی
            </button>
            <button 
              onClick={onStartGrading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black transition shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 scale-105"
            >
              <ICONS.Plus className="w-6 h-6" />
              شروع نمره‌دهی
            </button>
          </div>
        </div>
      )}

      {/* Reminder Add Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/40">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-10 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-2xl tracking-tighter">ثبت یادداشت جدید</h3>
              <button onClick={() => setShowReminderModal(false)} className="bg-white p-3 rounded-2xl text-slate-400 border border-slate-100"><ICONS.Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            <div className="p-10 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">موضوع یادآوری</label>
                <input 
                  type="text" 
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
                  placeholder="مثلاً: پرسش شفاهی از فصل سوم"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">تاریخ اجرا</label>
                  <input 
                    type="date" 
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({...newReminder, date: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">محدوده یادآوری</label>
                  <select 
                    value={newReminder.targetType}
                    onChange={(e) => setNewReminder({...newReminder, targetType: e.target.value as any, targetClassId: '', targetSubjectId: '', targetStudentId: ''})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all shadow-sm"
                  >
                    <option value="global">عمومی (دبیر)</option>
                    <option value="class">کل کلاس</option>
                    <option value="subject">درس خاص در کلاس</option>
                    <option value="student">دانش‌آموز خاص</option>
                  </select>
                </div>
              </div>

              {newReminder.targetType !== 'global' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">انتخاب کلاس</label>
                  <select 
                    value={newReminder.targetClassId}
                    onChange={(e) => setNewReminder({...newReminder, targetClassId: e.target.value, targetSubjectId: '', targetStudentId: ''})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all shadow-sm"
                  >
                    <option value="">انتخاب کلاس...</option>
                    {data.classes.map((c:any) => <option key={c.id} value={c.id}>{c.name} ({data.schools.find((s:any)=>s.id===c.schoolId)?.name})</option>)}
                  </select>
                </div>
              )}

              {newReminder.targetType === 'subject' && newReminder.targetClassId && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">انتخاب درس</label>
                  <select 
                    value={newReminder.targetSubjectId}
                    onChange={(e) => setNewReminder({...newReminder, targetSubjectId: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all shadow-sm"
                  >
                    <option value="">انتخاب درس...</option>
                    {classSubjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {newReminder.targetType === 'student' && newReminder.targetClassId && (
                <>
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">انتخاب دانش‌آموز</label>
                    <select 
                      value={newReminder.targetStudentId}
                      onChange={(e) => setNewReminder({...newReminder, targetStudentId: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all shadow-sm"
                    >
                      <option value="">انتخاب دانش‌آموز...</option>
                      {classStudents.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">درس مرتبط (اختیاری)</label>
                    <select 
                      value={newReminder.targetSubjectId}
                      onChange={(e) => setNewReminder({...newReminder, targetSubjectId: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-900 font-bold outline-none transition-all shadow-sm"
                    >
                      <option value="">همه دروس / بدون درس خاص</option>
                      {classSubjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <button 
                onClick={handleAddReminder}
                disabled={!newReminder.title || (newReminder.targetType !== 'global' && !newReminder.targetClassId)}
                className="w-full bg-indigo-600 disabled:bg-slate-300 text-white py-5 rounded-[2rem] font-black tracking-tighter hover:bg-indigo-700 transition-all shadow-xl active:scale-95 mt-4"
              >
                ثبت یادداشت نهایی
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!selectedYear && allTodayReminders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-sm text-center">
           <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8">
              <ICONS.ChevronLeft className="w-10 h-10 text-slate-200 rotate-180" />
           </div>
           <h3 className="text-2xl font-black text-slate-800 mb-2">هنوز چیزی شروع نشده است!</h3>
           <p className="text-slate-400 font-medium max-w-xs">لطفاً یکی از سال‌های تحصیلی تعریف شده را انتخاب کنید تا فرآیند مدیریت آغاز شود.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
