
import React, { useState } from 'react';
import { Teacher, AcademicYear, School, ClassRoom, Subject, Student } from '../types';
import { ICONS, DEFAULT_RULES } from '../constants';

interface Props {
  data: any;
  currentUser: Teacher;
  updateData: (key: string, value: any) => void;
  selectedYear: string | null;
  selectedSchool: string | null;
  selectedClass: string | null;
  setSelectedYear: (id: string | null) => void;
  setSelectedSchool: (id: string | null) => void;
  setSelectedClass: (id: string | null) => void;
  notify: (msg: string, type?: 'info' | 'error') => void;
}

const ManagementView: React.FC<Props> = ({ 
  data, currentUser, updateData, 
  selectedYear, selectedSchool, selectedClass,
  setSelectedYear, setSelectedSchool, setSelectedClass,
  notify
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const years = data.academicYears.filter((y: any) => y.teacherId === currentUser.id);
  const schools = data.schools.filter((s: any) => s.yearId === selectedYear);
  const classes = data.classes.filter((c: any) => c.schoolId === selectedSchool);
  const students = data.students.filter((st: any) => st.classId === selectedClass);
  const subjects = data.subjects.filter((sub: any) => sub.classId === selectedClass);

  const deleteYear = (id: string) => {
    if(!confirm('با حذف سال تحصیلی، تمامی زیرمجموعه‌ها حذف می‌شوند. تایید؟')) return;
    updateData('academicYears', data.academicYears.filter((y: any) => y.id !== id));
    if (selectedYear === id) setSelectedYear(null);
    notify('سال تحصیلی حذف شد.');
  };

  const deleteSchool = (id: string) => {
    if(!confirm('مدرسه حذف شود؟')) return;
    updateData('schools', data.schools.filter((s: any) => s.id !== id));
    if (selectedSchool === id) setSelectedSchool(null);
    notify('مدرسه حذف شد.');
  };

  const deleteClass = (id: string) => {
    if(!confirm('کلاس حذف شود؟')) return;
    updateData('classes', data.classes.filter((c: any) => c.id !== id));
    if (selectedClass === id) setSelectedClass(null);
    notify('کلاس حذف شد.');
  };

  const deleteStudent = (id: string) => {
    updateData('students', data.students.filter((st: any) => st.id !== id));
    notify('دانش‌آموز حذف شد.');
  };

  const deleteSubject = (id: string) => {
    updateData('subjects', data.subjects.filter((sub: any) => sub.id !== id));
    notify('درس حذف شد.');
  };

  const CRUDSection = ({ title, items, dataKey, onAdd, onDelete, placeholder, colorClass, active, onSelect }: any) => {
    const [inputValue, setInputValue] = useState(dataKey === 'academicYears' ? '۱۴۰۴-۱۴۰۵' : '');

    const handleAdd = () => {
      if (inputValue.trim()) {
        onAdd(inputValue.trim());
        setInputValue(dataKey === 'academicYears' ? '۱۴۰۴-۱۴۰۵' : '');
        notify('با موفقیت اضافه شد.');
      }
    };

    return (
      <div className={`flex flex-col h-[500px] bg-white rounded-[2.5rem] shadow-xl transition-all duration-500 border border-slate-100 overflow-hidden ${active ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-lg">{title}</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{items.length} مورد ثبت شده</p>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${colorClass}`}>
             <ICONS.Layout className="w-5 h-5" />
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-2 no-scrollbar">
          {items.map((item: any) => {
            const isSelected = (dataKey === 'academicYears' && selectedYear === item.id) ||
                               (dataKey === 'schools' && selectedSchool === item.id) ||
                               (dataKey === 'classes' && selectedClass === item.id);
            
            return (
              <div 
                key={item.id} 
                onClick={() => onSelect && onSelect(item.id)}
                className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border-2 cursor-pointer ${
                  isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-50 hover:border-indigo-100'
                }`}
              >
                {editingId === item.id ? (
                  <input 
                    autoFocus
                    className="flex-grow bg-white p-2 rounded-lg text-sm font-black outline-none text-slate-900 border border-indigo-200"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                        updateData(dataKey, data[dataKey].map((i: any) => i.id === item.id ? { ...i, name: tempName } : i));
                        setEditingId(null);
                        notify('تغییرات ذخیره شد.');
                      }
                      if(e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <>
                    <span className={`font-black text-xs ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{item.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setTempName(item.name); }} 
                        className="p-2 text-slate-300 hover:text-indigo-600 transition-all"
                      >
                        <ICONS.Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                        className="p-2 text-slate-300 hover:text-rose-600 transition-all"
                      >
                        <ICONS.Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 bg-slate-50 border-t">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="flex-grow px-5 py-3 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-2xl text-xs font-black outline-none transition-all shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button 
              onClick={handleAdd}
              className="p-3.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-90 transition-all"
            >
              <ICONS.Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <CRUDSection title="۱. سال تحصیلی" dataKey="academicYears" active={true} placeholder="مثلاً: ۱۴۰۴-۱۴۰۵" colorClass="bg-slate-900" items={years} onSelect={setSelectedYear} onAdd={(name: string) => updateData('academicYears', [...data.academicYears, { id: Date.now().toString(), name, teacherId: currentUser.id }])} onDelete={deleteYear} />
        <CRUDSection title="۲. مدرسه" dataKey="schools" active={!!selectedYear} placeholder="نام مدرسه..." colorClass="bg-indigo-600" items={schools} onSelect={setSelectedSchool} onAdd={(name: string) => updateData('schools', [...data.schools, { id: Date.now().toString(), name, yearId: selectedYear }])} onDelete={deleteSchool} />
        <CRUDSection title="۳. کلاس" dataKey="classes" active={!!selectedSchool} placeholder="نام کلاس..." colorClass="bg-amber-500" items={classes} onSelect={setSelectedClass} onAdd={(name: string) => updateData('classes', [...data.classes, { id: Date.now().toString(), name, schoolId: selectedSchool }])} onDelete={deleteClass} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CRUDSection title="۴. دانش‌آموزان" dataKey="students" active={!!selectedClass} placeholder="نام کامل..." colorClass="bg-rose-600" items={students} onAdd={(name: string) => updateData('students', [...data.students, { id: Date.now().toString(), name, classId: selectedClass }])} onDelete={deleteStudent} />
        <CRUDSection title="۵. دروس" dataKey="subjects" active={!!selectedClass} placeholder="نام درس..." colorClass="bg-emerald-600" items={subjects} onAdd={(name: string) => updateData('subjects', [...data.subjects, { id: Date.now().toString(), name, classId: selectedClass, rules: [...DEFAULT_RULES] }])} onDelete={deleteSubject} />
      </div>
    </div>
  );
};

export default ManagementView;
