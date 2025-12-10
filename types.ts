export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum Status {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  serialNumber: number; // New field
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string; // ISO string
  createdAt: number;
  subtasks: SubTask[];
  tags: string[];
  images: string[]; // New field for Base64 images
  progressNotes: string; // New field for progress updates
}

export interface AIResponse {
  description: string;
  priority: Priority;
  subtasks: string[];
  tags: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}