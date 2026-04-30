export interface TestCase {
  text: string;
  shouldMatch: boolean;
  description?: string;
}

export interface Task {
  id: string | number;
  title: string;
  description: string;
  testCases: TestCase[];
  hints: string[];
  solution: string;
  explanation?: string;
  flags?: string;
}

export interface Course {
  course: {
    title: string;
    description?: string;
    author?: string;
  };
  tasks: Task[];
}
