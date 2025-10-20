document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape user-provided strings for insertion into HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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
  // mark card with activity name for later DOM updates
  activityCard.setAttribute('data-activity', name);

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML safely
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsHtml =
          participants.length > 0
            ? `<ul class="participants-list">${participants
                .map(
                  (p) =>
                    `<li class="participant-item"><span class="participant-email">${escapeHtml(
                      p
                    )}</span> <button class="participant-remove" data-email="${escapeHtml(
                      p
                    )}" data-activity="${escapeHtml(name)}" title="Remove participant">\u2716</button></li>`
                )
                .join("")}</ul>`
            : `<p class="participants-empty">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
            <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <h5>Participants <span class="participants-count">${participants.length}</span></h5>
            ${participantsHtml}
          </div>
        `;

          activitiesList.appendChild(activityCard);

          // Attach click handlers for remove buttons (delegation not used here since we just created the elements)
          const removeButtons = activityCard.querySelectorAll('.participant-remove');
          removeButtons.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
              const email = btn.getAttribute('data-email');
              const activityEncoded = encodeURIComponent(btn.getAttribute('data-activity'));

              try {
                const resp = await fetch(`/activities/${activityEncoded}/unregister?email=${encodeURIComponent(
                  email
                )}`, { method: 'POST' });
                const json = await resp.json();
                if (resp.ok) {
                  // Remove the participant element from DOM
                  const li = btn.closest('.participant-item');
                  if (li) li.remove();

                  // Update participants count badge
                  const countBadge = activityCard.querySelector('.participants-count');
                  if (countBadge) {
                    const current = parseInt(countBadge.textContent || '0', 10);
                    countBadge.textContent = Math.max(0, current - 1);
                  }
                } else {
                  console.error('Failed to unregister:', json);
                  alert(json.detail || 'Failed to remove participant');
                }
              } catch (err) {
                console.error('Error unregistering participant:', err);
                alert('Error removing participant. See console for details.');
              }
            });
          });

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
        // Update the UI so the newly signed-up participant appears without a full refresh
        try {
          const cards = document.querySelectorAll('.activity-card');
          let targetCard = null;
          cards.forEach((c) => {
            if (c.getAttribute('data-activity') === activity) targetCard = c;
          });

          if (targetCard) {
            // Find or create the participants list
            let list = targetCard.querySelector('.participants-list');
            const empty = targetCard.querySelector('.participants-empty');
            if (empty) {
              // replace the empty message with a list
              const newList = document.createElement('ul');
              newList.className = 'participants-list';
              list = newList;
              empty.replaceWith(newList);
            }

            if (list) {
              // create new list item
              const li = document.createElement('li');
              li.className = 'participant-item';

              const span = document.createElement('span');
              span.className = 'participant-email';
              span.textContent = email;

              const btn = document.createElement('button');
              btn.className = 'participant-remove';
              btn.setAttribute('data-email', email);
              btn.setAttribute('data-activity', activity);
              btn.title = 'Remove participant';
              btn.textContent = '\u2716';

              // attach removal handler
              btn.addEventListener('click', async () => {
                try {
                  const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
                    email
                  )}`, { method: 'POST' });
                  const json = await resp.json();
                  if (resp.ok) {
                    li.remove();
                    const countBadge = targetCard.querySelector('.participants-count');
                    if (countBadge) {
                      const current = parseInt(countBadge.textContent || '0', 10);
                      countBadge.textContent = Math.max(0, current - 1);
                    }
                    const avail = targetCard.querySelector('.availability');
                    if (avail) {
                      // increment spots left
                      const match = avail.textContent.match(/(\d+) spots left/);
                      if (match) {
                        const current = parseInt(match[1], 10);
                        avail.innerHTML = `<strong>Availability:</strong> ${current + 1} spots left`;
                      }
                    }
                  } else {
                    alert(json.detail || 'Failed to remove participant');
                  }
                } catch (err) {
                  console.error('Error unregistering participant:', err);
                  alert('Error removing participant. See console for details.');
                }
              });

              li.appendChild(span);
              li.appendChild(btn);
              list.appendChild(li);

              // update count and availability
              const countBadge = targetCard.querySelector('.participants-count');
              if (countBadge) {
                const current = parseInt(countBadge.textContent || '0', 10);
                countBadge.textContent = current + 1;
              }
              const avail = targetCard.querySelector('.availability');
              if (avail) {
                const match = avail.textContent.match(/(\d+) spots left/);
                if (match) {
                  const current = parseInt(match[1], 10);
                  avail.innerHTML = `<strong>Availability:</strong> ${Math.max(0, current - 1)} spots left`;
                }
              }
            }
          }
        } catch (err) {
          console.error('Error updating UI after signup:', err);
        }
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
