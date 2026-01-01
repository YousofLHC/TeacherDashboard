
const STORAGE_KEY = 'teacher_management_data';

export const loadData = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {
    teachers: [],
    academicYears: [],
    schools: [],
    classes: [],
    subjects: [],
    students: [],
    gradeEntries: [],
    attendanceRecords: [],
    disciplineRecords: []
  };
  return JSON.parse(saved);
};

export const saveData = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
