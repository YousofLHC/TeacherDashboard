
const STORAGE_KEY = 'teacher_management_data';

const INITIAL_DATA = {
  teachers: [
    {
      id: 'teacher-1',
      username: 'admin',
      password: 'admin123',
      fullName: 'دبیر نمونه',
      avatarColor: 'hsl(220, 70%, 50%)'
    }
  ],
  academicYears: [
    { id: 'year-1', name: '۱۴۰۴-۱۴۰۵', teacherId: 'teacher-1' }
  ],
  schools: [
    { id: 'school-1', name: 'برکت', yearId: 'year-1' }
  ],
  classes: [
    { id: 'class-1', name: 'هفتم', schoolId: 'school-1' }
  ],
  subjects: [
    { 
      id: 'subject-1', 
      name: 'زبان', 
      classId: 'class-1', 
      rules: [
        {
          id: 'rule-exam',
          name: 'امتحان کلاسی',
          maxGrade: 20,
          coefficient: 1,
          percentage: 60,
          isNegative: false
        },
        {
          id: 'rule-discipline',
          name: 'انضباط',
          maxGrade: 2,
          coefficient: 0.5,
          percentage: 20,
          isNegative: false
        },
        {
          id: 'rule-hw',
          name: 'تکالیف',
          maxGrade: 5,
          coefficient: 0.5,
          percentage: 20,
          isNegative: false
        }
      ] 
    }
  ],
  students: [
    { id: 'student-1', name: 'اکبر اصغر', classId: 'class-1' },
    { id: 'student-2', name: 'صغری کبری', classId: 'class-1' }
  ],
  gradeEntries: [],
  attendanceRecords: [],
  disciplineRecords: []
};

export const loadData = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    // اگر داده‌ای وجود نداشت، داده‌های پیش‌فرض را برگردان و ذخیره کن
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  return JSON.parse(saved);
};

export const saveData = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
