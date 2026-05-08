// Generic modal: shared scrim + centred dialog with title, body and close button.
// Title and body are replaced on each call to openModal().

let modalEl = null;

function ensure() {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.className = 'modal-scrim';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.innerHTML = `
    <div class="modal" role="document">
      <header class="modal-head">
        <h2 class="modal-title"></h2>
        <button type="button" class="modal-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div class="modal-body"></div>
    </div>
  `;
  modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
  modalEl.querySelector('.modal-close').addEventListener('click', closeModal);
  document.body.appendChild(modalEl);
  return modalEl;
}

function onEsc(e) { if (e.key === 'Escape') closeModal(); }

export function openModal(title, htmlBody) {
  const el = ensure();
  el.querySelector('.modal-title').textContent = title;
  el.querySelector('.modal-body').innerHTML = htmlBody;
  el.classList.add('is-open');
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', onEsc);
}

export function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', onEsc);
}
