const FIELD_SEPARATOR = ';';

/**
 * Parses one student per line. A line can be either a bare name or
 * `Nombre; Descripción`. Only the first semicolon separates the fields, so
 * descriptions may contain semicolons.
 */
export function parseStudents(input) {
  return String(input ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(FIELD_SEPARATOR);

      if (separatorIndex === -1) {
        return { name: line, description: '' };
      }

      return {
        name: line.slice(0, separatorIndex).trim(),
        description: line.slice(separatorIndex + FIELD_SEPARATOR.length).trim(),
      };
    })
    .filter((student) => student.name || student.description);
}

export function countDescriptions(students) {
  return students.filter((student) => student.description).length;
}
