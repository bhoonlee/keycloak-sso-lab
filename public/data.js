export function collection(name, subject) {
  const key = `sso-lab:${name}:${subject}`;
  return {
    read() {
      const stored = localStorage.getItem(key);
      return stored === null ? [] : JSON.parse(stored);
    },
    write(items) {
      localStorage.setItem(key, JSON.stringify(items));
    },
  };
}
