
import React, { useState, useEffect, useCallback } from 'react';
import { loadData, saveData } from './storage';
import { 
  Teacher, AcademicYear, School, ClassRoom, Subject
} from './types';
import { ICONS } from './constants';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ManagementView from './components/ManagementView';
import GradingView from './components/GradingView';
import SubjectSettingsView from './components/SubjectSettingsView';
import AccountView from './components/AccountView';

const App: React.FC = () => {
  const [data, setData] = useState<any>(loadData());
  const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Navigation State
  const [activeView, setActiveView] = useState<'dashboard' | 'management' | 'grading' | 'settings' | 'account'>('dashboard');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Smart Auto-Selection Logic
  useEffect(() => {
    if (currentUser) {
      if (!selectedYear && data.academicYears.length > 0) {
        const teacherYears = data.academicYears.filter((y: any) => y.teacherId === currentUser.id);
        if (teacherYears.length > 0) {
          const latestYear = teacherYears[teacherYears.length - 1];
          setSelectedYear(latestYear.id);
        }
      }
      
      if (selectedYear && !selectedSchool) {
        const yearSchools = data.schools.filter((s: any) => s.yearId === selectedYear);
        if (yearSchools.length > 0) {
          setSelectedSchool(yearSchools[yearSchools.length - 1].id);
        }
      }

      if (selectedSchool && !selectedClass) {
        const schoolClasses = data.classes.filter((c: any) => c.schoolId === selectedSchool);
        if (schoolClasses.length > 0) {
          setSelectedClass(schoolClasses[schoolClasses.length - 1].id);
        }
      }
    }
  }, [currentUser, data.academicYears, data.schools, data.classes, selectedYear, selectedSchool]);

  const showNotify = useCallback((msg: string, type: 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAuth = (username: string, password: string, isRegister: boolean) => {
    setAuthError(null);
    const existing = data.teachers.find((t: Teacher) => t.username === username);

    if (isRegister) {
      if (existing) {
        setAuthError('این نام کاربری قبلاً ثبت شده است.');
        return;
      }
      const newUser: Teacher = { 
        id: Date.now().toString(), 
        username, 
        password,
        avatarColor: `hsl(${Math.random() * 360}, 70%, 50%)`
      };
      setData((prev: any) => ({
        ...prev,
        teachers: [...prev.teachers, newUser]
      }));
      setCurrentUser(newUser);
      showNotify(`حساب کاربری با موفقیت ساخته شد.`);
    } else {
      if (!existing || existing.password !== password) {
        setAuthError('نام کاربری یا رمز عبور اشتباه است.');
        return;
      }
      setCurrentUser(existing);
      showNotify(`خوش‌آمدید ${existing.fullName || username}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('dashboard');
    setSelectedYear(null);
    setSelectedSchool(null);
    setSelectedClass(null);
    setSelectedSubject(null);
    showNotify('از سیستم خارج شدید.');
  };

  const updateData = (key: string, newValue: any) => {
    setData((prev: any) => ({ ...prev, [key]: newValue }));
  };

  if (!currentUser) {
    return <LoginView onLogin={handleAuth} error={authError} />;
  }

  const currentYear = data.academicYears.find((y: any) => y.id === selectedYear);
  const currentSchool = data.schools.find((s: any) => s.id === selectedSchool);
  const currentClass = data.classes.find((c: any) => c.id === selectedClass);
  const currentSubject = data.subjects.find((s: any) => s.id === selectedSubject);

  const NavItem = ({ view, label, icon: Icon }: { view: any, label: string, icon: any }) => (
    <button 
      onClick={() => {
        setActiveView(view);
      }}
      className={`flex items-center gap-4 w-full px-5 py-4 rounded-[1.8rem] transition-all duration-500 group ${
        activeView === view 
        ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300 scale-[1.03]' 
        : 'text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-xl'
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform duration-500 ${activeView === view ? 'text-indigo-400 scale-125' : 'text-slate-400 group-hover:scale-110'}`} />
      <span className="font-black text-sm tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans overflow-x-hidden text-slate-900">
      <aside className="w-80 bg-white border-l border-slate-100 flex flex-col fixed inset-y-0 right-0 z-50 shadow-2xl">
        <div className="p-10 flex-grow">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-indigo-100">
               <ICONS.Layout className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-2xl tracking-tighter leading-none">مدیریت دبیر</h1>
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-1 opacity-60">پنل هوشمند ارزیابی</p>
            </div>
          </div>

          <div className="space-y-3">
            <NavItem view="dashboard" label="میز کار هوشمند" icon={ICONS.ChevronLeft} />
            <NavItem view="management" label="ساختار و منابع" icon={ICONS.User} />
            
            {selectedSubject && (
              <div className="mt-12 space-y-3 pt-8 border-t border-slate-50">
                <p className="px-5 mb-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">عملیات تخصصی</p>
                <NavItem view="grading" label="ارزیابی جامع" icon={ICONS.Plus} />
                <NavItem view="settings" label="پیکربندی دروس" icon={ICONS.Settings} />
              </div>
            )}
          </div>
        </div>

        <div className="p-8 mt-auto">
           <div className="bg-slate-50 border border-slate-100 rounded-[2.8rem] p-6 shadow-sm">
              <div 
                className="flex items-center gap-4 mb-6 cursor-pointer group"
                onClick={() => setActiveView('account')}
              >
                 <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg transition-transform group-hover:scale-110">
                    {currentUser?.username?.charAt(0).toUpperCase() || '?'}
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 leading-none mb-1">تنظیمات پروفایل</p>
                    <p className="font-black text-slate-800 text-base truncate tracking-tight">{currentUser?.fullName || currentUser?.username || 'کاربر'}</p>
                 </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-4 rounded-2xl bg-white border border-rose-100 text-rose-600 font-black text-xs hover:bg-rose-600 hover:text-white transition-all duration-500 shadow-sm"
              >
                خروج از پنل مدیریت
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-grow mr-80 p-12 md:p-20 overflow-y-auto bg-slate-50/30">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                 <button 
                   onClick={() => setActiveView('dashboard')}
                   className="w-16 h-16 bg-white rounded-3xl text-slate-400 hover:text-indigo-600 hover:shadow-2xl transition-all flex items-center justify-center border border-slate-100 shadow-sm group"
                   title="بازگشت به داشبورد"
                 >
                    <ICONS.ArrowRight className="w-7 h-7 transition-transform group-hover:translate-x-1" />
                 </button>
                 <div>
                   <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                    {activeView === 'dashboard' && 'داشبورد شما'}
                    {activeView === 'management' && 'سازماندهی منابع'}
                    {activeView === 'grading' && 'ارزیابی و نمره'}
                    {activeView === 'settings' && 'تنظیمات نمرات'}
                    {activeView === 'account' && 'حساب کاربری'}
                  </h2>
                   <p className="text-slate-400 font-bold text-sm tracking-tight opacity-70">
                    {activeView === 'dashboard' && 'نمای کلی از سال تحصیلی و مدارس شما'}
                    {activeView === 'management' && 'تعریف مدرسه، کلاس، درس و دانش‌آموز'}
                    {activeView === 'grading' && `ثبت نمره برای درس ${currentSubject?.name || '---'}`}
                    {activeView === 'settings' && 'شخصی‌سازی ضرایب و درصد نمره‌دهی'}
                    {activeView === 'account' && 'مدیریت امنیت و مشخصات دبیر'}
                   </p>
                 </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {currentYear && <span className="bg-slate-900 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">{currentYear.name}</span>}
                {currentSchool && <span className="bg-white text-slate-500 border border-slate-100 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">{currentSchool.name}</span>}
                {currentClass && <span className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">{currentClass.name}</span>}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl px-12 py-8 rounded-[3.5rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] flex items-center gap-6">
               <div className="w-14 h-14 rounded-3xl bg-slate-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <ICONS.Bell className="w-7 h-7" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">امروز - تقویم سامانه</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">{new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
               </div>
            </div>
          </header>

          <section className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
            {activeView === 'dashboard' && (
              <DashboardView 
                data={data}
                currentUser={currentUser}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedSchool={selectedSchool}
                setSelectedSchool={setSelectedSchool}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                onStartGrading={() => setActiveView('grading')}
                onManageRules={() => setActiveView('settings')}
              />
            )}

            {activeView === 'management' && (
              <ManagementView 
                data={data}
                currentUser={currentUser}
                updateData={updateData}
                selectedYear={selectedYear}
                selectedSchool={selectedSchool}
                selectedClass={selectedClass}
                setSelectedYear={setSelectedYear}
                setSelectedSchool={setSelectedSchool}
                setSelectedClass={setSelectedClass}
                notify={showNotify}
              />
            )}

            {activeView === 'grading' && selectedSubject && (
              <GradingView 
                data={data}
                updateData={updateData}
                subject={currentSubject}
                classRoom={currentClass}
                notify={showNotify}
              />
            )}

            {activeView === 'settings' && selectedSubject && (
              <SubjectSettingsView 
                subject={currentSubject}
                updateData={updateData}
                data={data}
                notify={showNotify}
              />
            )}

            {activeView === 'account' && (
              <AccountView 
                currentUser={currentUser}
                updateData={updateData}
                data={data}
                notify={showNotify}
              />
            )}
          </section>
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-12 left-12 z-[100] px-10 py-6 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border flex items-center gap-5 animate-in slide-in-from-left-20 duration-500 backdrop-blur-3xl ${
          toast.type === 'error' ? 'bg-rose-600/90 text-white border-rose-500' : 'bg-slate-900/95 text-white border-slate-800'
        }`}>
           <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ICONS.Bell className="w-5 h-5" />
           </div>
           <span className="font-black text-base tracking-tight">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
