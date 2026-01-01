
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface GradingRule {
  id: string;
  name: string;
  maxGrade: number;
  coefficient: number;
  percentage: number;
  isNegative: boolean;
}

export interface Teacher {
  id: string;
  username: string;
  password?: string;
  fullName?: string;
  email?: string;
  avatarColor?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  teacherId: string;
}

export interface School {
  id: string;
  name: string;
  yearId: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  schoolId: string;
}

export interface Subject {
  id: string;
  name: string;
  classId: string;
  rules: GradingRule[];
}

export interface Student {
  id: string;
  name: string;
  classId: string;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  subjectId: string;
  ruleId: string;
  date: string;
  value: number;
  maxAtTime: number;
  coefAtTime: number;
  percentAtTime: number;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  status: AttendanceStatus;
}
