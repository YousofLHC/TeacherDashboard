
import React from 'react';
import { Teacher, AcademicYear, School, ClassRoom, Subject } from '../types';
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
}

const DashboardView: React.FC<Props> = ({
  data, currentUser,
  selectedYear, setSelectedYear,
  selectedSchool, setSelectedSchool,
  selectedClass, setSelectedClass,
  selectedSubject, setSelectedSubject,
  onStartGrading,
  onManageRules
}) => {
  const teacherYears = data.academicYears.filter((y: AcademicYear) => y.teacherId === currentUser.id);
  const yearSchools = data.schools.filter((s: School) => s.yearId === selectedYear);
  const schoolClasses = data.classes.filter((c: ClassRoom) => c.schoolId === selectedSchool);
  const classSubjects = data.subjects.filter((s: Subject) => s.classId === selectedClass);

  const StepCard = ({ number, title, items, selectedId, onSelect, placeholder, icon: Icon }: any) => (
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
      
      {!selectedYear && (
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
