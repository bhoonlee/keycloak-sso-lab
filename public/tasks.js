import { signIn } from './auth.js';
import { collection } from './data.js';

const subject = await signIn();
if (subject) setupTasks(collection('tasks', subject));

function setupTasks(storage) {
  const form = document.querySelector('#task-form');
  const input = document.querySelector('#task');
  const list = document.querySelector('#tasks');
  const status = document.querySelector('#task-message');
  let tasks;

  try {
    tasks = storage.read();
  } catch {
    document.querySelector('#auth-status').textContent = '브라우저에 저장된 할 일을 읽을 수 없어요.';
    document.querySelector('#auth-status').hidden = false;
    return;
  }

  function render() {
    document.querySelector('#empty').hidden = tasks.length > 0;
    const completed = tasks.filter((task) => task.done).length;
    document.querySelector('#task-count').textContent = `${completed}/${tasks.length} 완료`;
    list.replaceChildren(...tasks.map((task) => {
      const item = document.createElement('li');
      const label = document.createElement('label');
      const check = document.createElement('input');
      const caption = document.createElement('span');
      check.type = 'checkbox';
      check.checked = task.done;
      caption.textContent = task.text;
      label.append(check, caption);
      check.addEventListener('change', () => {
        const next = tasks.map((entry) => entry.id === task.id ? { ...entry, done: check.checked } : entry);
        if (!save(next)) check.checked = task.done;
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'secondary';
      remove.textContent = '삭제';
      remove.setAttribute('aria-label', `${task.text} 삭제`);
      remove.addEventListener('click', () => save(tasks.filter((entry) => entry.id !== task.id)));
      item.append(label, remove);
      return item;
    }));
  }

  function save(next) {
    try {
      storage.write(next);
    } catch {
      status.textContent = '할 일을 저장하지 못했어요. 브라우저 저장 공간이나 권한을 확인하세요.';
      return false;
    }
    tasks = next;
    status.textContent = '';
    render();
    return true;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      status.textContent = '할 일을 입력하세요.';
      input.focus();
      return;
    }
    if (save([{ id: crypto.randomUUID(), text, done: false }, ...tasks])) form.reset();
    input.focus();
  });
  render();
  document.querySelector('#app').hidden = false;
}
