import { signIn } from './auth.js';
import { collection } from './data.js';
import { decryptNote, encryptNote } from './crypto.js';

const subject = await signIn();
if (subject) setupNotes(collection('encrypted-notes', subject));

function setupNotes(storage) {
  const form = document.querySelector('#note-form');
  const noteInput = document.querySelector('#note');
  const passphrase = document.querySelector('#passphrase');
  const saveButton = form.querySelector('button');
  const list = document.querySelector('#notes');
  const template = document.querySelector('#note-template');
  const status = document.querySelector('#note-message');
  const app = document.querySelector('#app');
  const formatDate = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'medium' });
  let notes;

  try {
    notes = storage.read();
  } catch {
    document.querySelector('#auth-status').textContent = '브라우저에 저장된 암호화 메모를 읽을 수 없어요.';
    document.querySelector('#auth-status').hidden = false;
    return;
  }

  function persist(next) {
    storage.write(next);
    notes = next;
    render();
  }

  function renderNote(note) {
    const fragment = template.content.cloneNode(true);
    const details = fragment.querySelector('details');
    const time = fragment.querySelector('time');
    time.dateTime = note.createdAt;
    time.textContent = formatDate.format(new Date(note.createdAt));
    fragment.querySelector('.ciphertext').textContent = note.ciphertext;
    const decryptForm = fragment.querySelector('.decrypt-form');
    const passwordInput = decryptForm.querySelector('input');
    const decryptButton = decryptForm.querySelector('button');
    const result = fragment.querySelector('.result');
    const plaintext = fragment.querySelector('.plaintext');
    const deleteButton = fragment.querySelector('.delete');
    const deleteForm = fragment.querySelector('.delete-form');
    const deletePassword = deleteForm.querySelector('input');
    const confirmDelete = deleteForm.querySelector('button[type="submit"]');
    const deleteResult = deleteForm.querySelector('.delete-result');
    let openCycle = 0;
    let deleteCycle = 0;

    function clear() {
      plaintext.hidden = true;
      plaintext.textContent = '';
      result.textContent = '';
    }

    function dismissDelete() {
      deleteCycle += 1;
      deleteForm.reset();
      deleteResult.textContent = '';
      deleteForm.hidden = true;
      deleteButton.hidden = false;
    }

    details.addEventListener('toggle', () => {
      if (details.open) return;
      openCycle += 1;
      decryptForm.reset();
      clear();
      dismissDelete();
    });

    decryptForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clear();
      decryptButton.disabled = true;
      const cycle = openCycle;
      const password = passwordInput.value;
      decryptForm.reset();
      try {
        const text = await decryptNote(note, password);
        if (details.open && cycle === openCycle) {
          plaintext.textContent = text;
          plaintext.hidden = false;
          result.textContent = '복호화에 성공했어요.';
        }
      } catch {
        if (details.open && cycle === openCycle) result.textContent = '복호화에 실패했어요. 메모 암호 또는 암호문을 확인하세요.';
      } finally {
        decryptButton.disabled = false;
      }
    });

    deleteButton.addEventListener('click', () => {
      deleteButton.hidden = true;
      deleteForm.hidden = false;
      deletePassword.focus();
    });

    deleteForm.querySelector('.cancel-delete').addEventListener('click', () => {
      dismissDelete();
      deleteButton.focus();
    });

    deleteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (confirmDelete.disabled || deleteForm.hidden) return;
      const password = deletePassword.value;
      const cycle = deleteCycle;
      const stillOpen = () => cycle === deleteCycle && details.isConnected && details.open && !app.hidden;
      deleteForm.reset();
      deleteResult.textContent = '';
      confirmDelete.disabled = true;

      try {
        await decryptNote(note, password);
      } catch {
        if (stillOpen()) {
          deleteResult.textContent = '암호를 확인할 수 없어 메모를 삭제하지 않았어요.';
          deletePassword.focus();
        }
        return;
      } finally {
        confirmDelete.disabled = false;
      }

      if (!stillOpen()) return;

      try {
        persist(storage.read().filter((entry) => entry.id !== note.id));
        list.querySelector('summary')?.focus();
        status.textContent = '메모를 삭제했어요.';
      } catch {
        deleteResult.textContent = '메모를 삭제하지 못했어요.';
        deletePassword.focus();
      }
    });
    return fragment;
  }

  function render() {
    document.querySelector('#empty').hidden = notes.length > 0;
    list.replaceChildren(...notes.map(renderNote));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = noteInput.value;
    if (!text.trim()) {
      status.textContent = '메모 내용을 입력하세요.';
      noteInput.focus();
      return;
    }
    saveButton.disabled = true;
    status.textContent = '메모를 암호화하고 있어요.';
    try {
      const encrypted = await encryptNote(text, passphrase.value);
      const note = { ...encrypted, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      persist([note, ...notes]);
      form.reset();
      status.textContent = '암호화한 메모를 저장했어요.';
    } catch {
      status.textContent = '메모를 암호화하거나 저장하지 못했어요. 브라우저 설정을 확인하세요.';
    } finally {
      saveButton.disabled = false;
    }
  });

  render();
  app.hidden = false;
}
