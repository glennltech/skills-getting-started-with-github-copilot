// Fetch activities, render cards with participants, populate select, and handle signup.

const apiBase = '/activities';

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null) return;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function createParticipantItem(email, activityName) {
  const badge = el('span', { class: 'participant-badge' }, email);

  const del = el('button', { class: 'participant-delete', title: 'Unregister participant', type: 'button', dataset: { email } }, '✖');

  const li = el('li', {}, badge, del);

  // handle delete click
  del.addEventListener('click', async (e) => {
    e.preventDefault();
    // optimistic UI: remove item after successful response
    try {
      await unregisterParticipant(activityName, email);
      li.remove();
      // If list becomes empty, show placeholder
      const ul = document.querySelector(`[data-activity-name="${CSS.escape(activityName)}"] .participants-list`);
      if (ul && ul.children.length === 0) {
        ul.appendChild(el('li', {}, el('span', { class: 'participant-badge' }, 'No participants yet')));
      }
      setMessage(`Unregistered ${email} from ${activityName}`, 'success');
    } catch (err) {
      setMessage(err.message || 'Failed to unregister participant', 'error');
    }
  });

  return li;
}

function createActivityCard(name, info) {
  const card = el('div', { class: 'activity-card', dataset: { activityName: name } },
    el('h4', { class: 'activity-title' }, name),
    el('p', { class: 'activity-desc' }, info.description),
    el('p', { class: 'activity-schedule' }, el('strong', {}, 'Schedule: '), ` ${info.schedule}`),
    el('p', { class: 'activity-capacity' }, el('strong', {}, 'Max participants: '), ` ${info.max_participants}`)
  );

  const participantsSection = el('div', { class: 'participants-section' },
    el('h5', {}, 'Participants'),
    el('ul', { class: 'participants-list' }, 
      // populate participant items
      ...(info.participants && info.participants.length
        ? info.participants.map(email => createParticipantItem(email, name))
        : [el('li', {}, el('span', { class: 'participant-badge' }, 'No participants yet'))])
    )
  );

  card.appendChild(participantsSection);
  return card;
}

function setMessage(text, type = 'info') {
  const msg = document.getElementById('message');
  msg.className = `message ${type}`;
  msg.textContent = text;
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 4000);
}

async function loadActivities() {
  try {
    const res = await fetch(apiBase);
    if (!res.ok) throw new Error('Failed to load activities');
    const data = await res.json();

    const list = document.getElementById('activities-list');
    list.innerHTML = ''; // remove any template/placeholder

    const select = document.getElementById('activity');
    // clear existing options except the placeholder
    select.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

    Object.entries(data).forEach(([name, info]) => {
      list.appendChild(createActivityCard(name, info));
      const opt = el('option', { value: name }, name);
      select.appendChild(opt);
    });
  } catch (err) {
    setMessage(err.message || 'Error loading activities', 'error');
  }
}

function appendParticipantToCard(activityName, email) {
  const selector = `[data-activity-name="${CSS.escape(activityName)}"]`;
  const card = document.querySelector(selector);
  if (!card) return;
  const ul = card.querySelector('.participants-list');
  // If first item is 'No participants yet', remove it
  if (ul.children.length === 1 && ul.children[0].textContent.trim() === 'No participants yet') {
    ul.innerHTML = '';
  }
  ul.appendChild(createParticipantItem(email, activityName));
}

async function unregisterParticipant(activityName, email) {
  const url = `${apiBase}/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || 'Failed to unregister');
  }
  return res.json();
}

async function handleSignup(e) {
  e.preventDefault();
  const emailInput = document.getElementById('email');
  const activitySelect = document.getElementById('activity');
  const email = emailInput.value.trim();
  const activity = activitySelect.value;

  if (!email || !activity) {
    setMessage('Please provide an email and select an activity.', 'error');
    return;
  }

  try {
    const url = `${apiBase}/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Signup failed');
    }
    const body = await res.json();
    setMessage(body.message || 'Signed up successfully', 'success');
    // Refresh activities from server to ensure UI matches backend
    await loadActivities();
    // restore selection to the activity user just signed up for
    const activitySelect = document.getElementById('activity');
    if (activitySelect) activitySelect.value = activity;
    // clear email input
    emailInput.value = '';
  } catch (err) {
    setMessage(err.message || 'Error during signup', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadActivities();
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
});
