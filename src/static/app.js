document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

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

function createParticipantItem(email) {
  const badge = el('span', { class: 'participant-badge' }, email);
  return el('li', {}, badge);
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
        ? info.participants.map(createParticipantItem)
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
  ul.appendChild(createParticipantItem(email));
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
    appendParticipantToCard(activity, email);
    // optionally clear email field
    emailInput.value = '';
  } catch (err) {
    setMessage(err.message || 'Error during signup', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadActivities();
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
});
