export function validateSubjectsArray(subjects: any): boolean {
  if (!Array.isArray(subjects)) {
    return false;
  }
  
  return subjects.every(subject => typeof subject === 'string' && subject.trim().length > 0);
}

export function removeDuplicateSubjects(existingSubjects: string[], newSubjects: string[]): string[] {
  const existingSet = new Set(existingSubjects);
  const uniqueNewSubjects = newSubjects.filter(subject => !existingSet.has(subject));
  return [...existingSubjects, ...uniqueNewSubjects];
}