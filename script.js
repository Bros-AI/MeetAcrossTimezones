document.addEventListener('DOMContentLoaded', function() {
    populateTimeZones();
    
    // Set tomorrow as the default date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const meetingDateInput = document.getElementById('meeting-date');
    if (meetingDateInput) {
        meetingDateInput.value = tomorrow.toISOString().slice(0, 10);
    }

    // Add initial participant if container is empty
    const participantsContainer = document.getElementById('participants-container');
    if (participantsContainer && participantsContainer.children.length === 0) {
        addParticipant(); 
    } else if (participantsContainer && participantsContainer.children.length > 0) {
        // Ensure first participant has correct ID for label
        const firstCheckbox = participantsContainer.querySelector('.night-checkbox');
        const firstLabel = participantsContainer.querySelector('.night-option label');
        if (firstCheckbox && firstLabel && !firstCheckbox.id) {
            firstCheckbox.id = 'night-option-0';
            firstLabel.setAttribute('for', 'night-option-0');
        }
    }
});

// Function to copy meeting details to clipboard
function copyMeetingDetails(slot, date, durationMinutes) {
    try {
        const startDate = new Date(slot.utcTime);
        const endTime = new Date(slot.utcTime + durationMinutes * 60 * 1000);
        
        let meetingInfo = `INTERNATIONAL MEETING DETAILS\n`;
        meetingInfo += `========================\n\n`;
        meetingInfo += `📆 Date: ${startDate.toDateString()}\n`;
        meetingInfo += `⏰ Time: ${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })} - `;
        meetingInfo += `${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })} UTC\n`;
        meetingInfo += `⏱️ Duration: ${durationMinutes} minutes\n\n`;
        meetingInfo += `LOCAL TIMES FOR PARTICIPANTS:\n`;
        meetingInfo += `========================\n\n`;
        
        slot.participantTimes.forEach(pt => {
            let timeIndicator = '🕙'; // Default/unknown
            if (pt.isStandard) timeIndicator = '✅'; // Green check for standard
            else if (pt.isExtended) timeIndicator = '⚠️'; // Yellow warning for extended
            else if (pt.isLateNight) timeIndicator = '🌙'; // Moon for late night
            
            meetingInfo += `${timeIndicator} ${pt.city}: ${pt.time}\n`;
        });
        
        navigator.clipboard.writeText(meetingInfo)
            .then(() => {
                showNotification('Meeting details copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                showNotification('Failed to copy meeting details. See console for error.', 'error');
            });
    } catch (error) {
        console.error('Error copying meeting details:', error);
        showNotification('Error preparing meeting details for copy. See console for error.', 'error');
    }
}

const timeZones = [
    { city: "London", zone: "Europe/London", label: "London (GMT/BST)" },
    { city: "New York", zone: "America/New_York", label: "New York (EST/EDT)" },
    { city: "Los Angeles", zone: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
    { city: "Tokyo", zone: "Asia/Tokyo", label: "Tokyo (JST)" },
    { city: "Sydney", zone: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { city: "Dubai", zone: "Asia/Dubai", label: "Dubai (GST)" },
    { city: "Singapore", zone: "Asia/Singapore", label: "Singapore (SGT)" },
    { city: "Paris", zone: "Europe/Paris", label: "Paris (CET/CEST)" },
    { city: "Berlin", zone: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { city: "Mumbai", zone: "Asia/Kolkata", label: "Mumbai (IST)" },
    { city: "Shanghai", zone: "Asia/Shanghai", label: "Shanghai (CST)" },
    { city: "Toronto", zone: "America/Toronto", label: "Toronto (EST/EDT)" },
    { city: "São Paulo", zone: "America/Sao_Paulo", label: "São Paulo (BRT/BRST)" },
    { city: "Moscow", zone: "Europe/Moscow", label: "Moscow (MSK)" },
    { city: "Istanbul", zone: "Europe/Istanbul", label: "Istanbul (TRT)" }
];

function populateTimeZones(selectElement) {
    const selects = selectElement ? [selectElement] : document.querySelectorAll('.participant-timezone');
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = ''; // Clear existing options
        
        // Add a default, non-selectable option
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Time Zone";
        defaultOption.disabled = true;
        defaultOption.selected = true; // Make it selected by default
        select.appendChild(defaultOption);

        timeZones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.zone;
            option.textContent = tz.label;
            select.appendChild(option);
        });
    });
}

function addParticipant() {
    const container = document.getElementById('participants-container');
    if (!container) return;

    const participantCount = container.children.length;
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant';
    
    const select = document.createElement('select');
    select.className = 'participant-timezone';
    populateTimeZones(select); // Populate just this new select
    
    const nightOptionDiv = document.createElement('div');
    nightOptionDiv.className = 'night-option';
    
    const nightCheckbox = document.createElement('input');
    nightCheckbox.type = 'checkbox';
    nightCheckbox.className = 'night-checkbox';
    nightCheckbox.id = `night-option-${participantCount}`;
    
    const nightLabel = document.createElement('label');
    nightLabel.setAttribute('for', `night-option-${participantCount}`);
    nightLabel.textContent = 'Late night OK';
    
    nightOptionDiv.appendChild(nightCheckbox);
    nightOptionDiv.appendChild(nightLabel);
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-participant';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', 'Remove participant');
    removeButton.onclick = () => removeParticipant(removeButton);
    
    participantDiv.appendChild(select);
    participantDiv.appendChild(nightOptionDiv);
    participantDiv.appendChild(removeButton);
    container.appendChild(participantDiv);
}

function removeParticipant(button) {
    const container = document.getElementById('participants-container');
    if (!container || !button || !button.parentElement) return;

    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        showNotification('At least one participant is required.', 'warning');
    }
}

function findMeetingTimes() {
    const dateInput = document.getElementById('meeting-date');
    const durationSelect = document.getElementById('meeting-duration');
    const allowExtendedCheckbox = document.getElementById('allow-extended');
    const resultContainer = document.getElementById('meeting-result');
    const suggestionsContainer = document.getElementById('meeting-suggestions');

    if (!dateInput || !durationSelect || !allowExtendedCheckbox || !resultContainer || !suggestionsContainer) {
        showNotification('Core HTML elements are missing. Cannot proceed.', 'error');
        return;
    }

    const date = dateInput.value;
    const durationMinutes = parseInt(durationSelect.value);
    const allowExtended = allowExtendedCheckbox.checked;
    
    const participants = [];
    const participantElements = document.querySelectorAll('.participant');
    
    let allTimezonesSelected = true;
    participantElements.forEach((el) => {
        const timezoneSelect = el.querySelector('.participant-timezone');
        const allowLateNight = el.querySelector('.night-checkbox').checked;
        
        if (!timezoneSelect || !timezoneSelect.value) {
            allTimezonesSelected = false;
            return;
        }
        const tzData = timeZones.find(tz => tz.zone === timezoneSelect.value);
        if (!tzData) {
             allTimezonesSelected = false; // Should not happen if populated correctly
             return;
        }

        participants.push({
            timezone: timezoneSelect.value,
            city: tzData.city,
            allowLateNight: allowLateNight
        });
    });

    if (!date) {
        showNotification('Please select a meeting date.', 'warning');
        return;
    }
    if (participants.length === 0) {
        showNotification('Please add at least one participant.', 'warning');
        return;
    }
    if (!allTimezonesSelected) {
        showNotification('Please select a time zone for all participants.', 'warning');
        return;
    }


    const timeSlots = generateTimeSlots(date, durationMinutes, participants, allowExtended);
    displayMeetingResults(timeSlots, date, durationMinutes, participants);
}

function generateTimeSlots(dateStr, durationMinutes, participants, allowExtended) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDayUtc = Date.UTC(year, month - 1, day);
    const timeSlots = [];
    const slotInterval = 30 * 60 * 1000; // 30-minute intervals

    for (let i = 0; i < 48; i++) { // 24 hours in 30-min slots
        const slotUtcTime = startOfDayUtc + i * slotInterval;
        const slot = { utcTime: slotUtcTime, score: 0, participantTimes: [] };
        let allParticipantsAvailable = true;

        for (const participant of participants) {
            const localDateTimeFormat = new Intl.DateTimeFormat('en-US', {
                timeZone: participant.timezone,
                hour: 'numeric', minute: 'numeric', hour12: false
            });
            const localTimeParts = localDateTimeFormat.formatToParts(slotUtcTime);
            let hour = 0, minute = 0;
            localTimeParts.forEach(part => {
                if (part.type === 'hour') hour = parseInt(part.value === '24' ? '0' : part.value); // Handle 24 as 00 for midnight
                if (part.type === 'minute') minute = parseInt(part.value);
            });

            const startMinutes = hour * 60 + minute;
            const endMinutes = startMinutes + durationMinutes; // Assumes meeting doesn't cross midnight for this check simplicity

            const isStandard = startMinutes >= 9 * 60 && endMinutes <= 17 * 60; // 9 AM - 5 PM
            const isExtendedCandidate = startMinutes >= 7 * 60 && endMinutes <= 20 * 60; // 7 AM - 8 PM
            const isExtended = allowExtended && isExtendedCandidate && !isStandard;
            
            // Late night: 8 PM to 7 AM (next day)
            const isLateNight = participant.allowLateNight && 
                              ((startMinutes >= 20 * 60 && startMinutes < 24 * 60) || // 8 PM to midnight
                               (startMinutes >= 0 && endMinutes <= 7 * 60));      // Midnight to 7 AM
            
            const isAvailable = isStandard || isExtended || isLateNight;
            if (!isAvailable) {
                allParticipantsAvailable = false;
                break; 
            }

            if (isStandard) slot.score += 3;
            else if (isExtended) slot.score += 2;
            else if (isLateNight) slot.score += 1;

            const formattedLocalDate = new Date(slotUtcTime).toLocaleString('en-US', {
                timeZone: participant.timezone,
                hour: 'numeric', minute: 'numeric', hour12: true
            });
            slot.participantTimes.push({
                city: participant.city, time: formattedLocalDate,
                isStandard, isExtended, isLateNight
            });
        }

        if (allParticipantsAvailable) {
            timeSlots.push(slot);
        }
    }
    timeSlots.sort((a, b) => b.score - a.score || a.utcTime - b.utcTime);
    return timeSlots.slice(0, 5); // Return top 5 suggestions
}


function displayMeetingResults(timeSlots, date, durationMinutes, participants) {
    const resultContainer = document.getElementById('meeting-result');
    const suggestionsContainer = document.getElementById('meeting-suggestions');
    if (!resultContainer || !suggestionsContainer) return;

    resultContainer.style.display = 'block';
    suggestionsContainer.innerHTML = '';

    if (timeSlots.length === 0) {
        suggestionsContainer.innerHTML = `
            <div class="suggestion" style="background-color: var(--warning-light); border-left: 4px solid var(--warning-dark);">
                <h4 style="color: var(--warning-dark);">No Ideal Times Found</h4>
                <p>No suitable meeting times found with the current criteria. Try the following:</p>
                <ul>
                    <li>Select "Allow extended hours".</li>
                    <li>Allow "Late night OK" for more participants.</li>
                    <li>Choose a different date or a shorter meeting duration.</li>
                </ul>
            </div>`;
        return;
    }

    timeSlots.forEach((slot, index) => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion';
        
        const utcDate = new Date(slot.utcTime);
        const utcFormatted = utcDate.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'UTC'
        });
        
        let suggestionHTML = `<h4>Option ${index + 1} (${utcFormatted} UTC)</h4><div class="time-grid">`;
        slot.participantTimes.forEach(pt => {
            let timeClass = '';
            let label = '';
            if (pt.isStandard) { timeClass = 'standard-hours'; label = ' (standard)'; }
            else if (pt.isExtended) { timeClass = 'extended-hours'; label = ' (extended)'; }
            else if (pt.isLateNight) { timeClass = 'night-hours'; label = ' (late night)'; }
            
            suggestionHTML += `<div class="time-slot ${timeClass}">${pt.city}: ${pt.time}${label}</div>`;
        });
        suggestionHTML += '</div>';
        suggestionDiv.innerHTML = suggestionHTML;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '1rem';
        
        const createEventBtn = document.createElement('button');
        createEventBtn.className = 'create-event-btn';
        createEventBtn.textContent = 'Add to Google Calendar';
        createEventBtn.onclick = (e) => {
            e.preventDefault();
            createGoogleCalendarEvent(slot, date, durationMinutes, participants);
        };
        
        const copyLinkBtn = document.createElement('button');
        copyLinkBtn.className = 'create-event-btn';
        copyLinkBtn.style.background = 'var(--success)';
        copyLinkBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>Copy Meeting Info`;
        copyLinkBtn.onclick = (e) => {
            e.preventDefault();
            copyMeetingDetails(slot, date, durationMinutes);
        };
        
        buttonContainer.appendChild(createEventBtn);
        buttonContainer.appendChild(copyLinkBtn);
        suggestionDiv.appendChild(buttonContainer);
        suggestionsContainer.appendChild(suggestionDiv);
    });

    if (timeSlots.length > 0) {
        suggestionsContainer.innerHTML += `
            <div class="legend">
                <div style="display: flex; align-items: center; margin-bottom: 0.3rem;"><span style="display:inline-block; width:12px; height:12px; background:var(--standard-hours-bg); border:1px solid #ccc; margin-right:8px;"></span> Standard hours (9 AM - 5 PM)</div>
                <div style="display: flex; align-items: center; margin-bottom: 0.3rem;"><span style="display:inline-block; width:12px; height:12px; background:var(--extended-hours-bg); border:1px solid #ccc; margin-right:8px;"></span> Extended hours (7 AM - 8 PM)</div>
                <div style="display: flex; align-items: center;"><span style="display:inline-block; width:12px; height:12px; background:var(--night-mode-bg); border:1px solid #ccc; margin-right:8px;"></span> Late night hours (if allowed)</div>
            </div>
        `;
    }
}

function createGoogleCalendarEvent(slot, date, durationMinutes, participants) {
    try {
        const startDate = new Date(slot.utcTime);
        const endDate = new Date(slot.utcTime + durationMinutes * 60 * 1000);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date calculation for calendar event.');
        }
        
        const formatDateForGCal = (dt) => dt.toISOString().replace(/-|:|\.\d+/g, '');
        
        const startTimeStr = formatDateForGCal(startDate);
        const endTimeStr = formatDateForGCal(endDate);
        
        const formattedDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const formattedTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        const title = `International Meeting - ${formattedDate} at ${formattedTime} UTC`;
        
        let description = '*INTERNATIONAL MEETING DETAILS*\n\n';
        description += `📅 Date: ${startDate.toDateString()}\n`;
        description += `⏱️ Duration: ${durationMinutes} minutes\n\n`;
        description += '*LOCAL TIMES FOR PARTICIPANTS:*\n\n';
        slot.participantTimes.forEach(pt => {
            let timeIndicator = pt.isStandard ? '✅' : (pt.isExtended ? '⚠️' : (pt.isLateNight ? '🌙' : '🕙'));
            description += `${timeIndicator} ${pt.city}: ${pt.time}\n`;
        });
        description += '\n\n------------------\nScheduled with Global Time Zone Scheduler';
        
        const params = new URLSearchParams({
            action: 'TEMPLATE', text: title,
            dates: `${startTimeStr}/${endTimeStr}`,
            details: description, ctz: 'UTC'
        });
        const googleCalendarUrl = `https://calendar.google.com/calendar/event?${params.toString()}`;
        
        const calWindow = window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');
        if (!calWindow || calWindow.closed || typeof calWindow.closed === 'undefined') {
            showNotification('Calendar event link ready. Please allow pop-ups or click again if it didn\'t open.', 'info');
            // Fallback for browsers that block window.open without direct user interaction immediately prior
            // This could involve showing the link to the user to click manually.
        } else {
            showNotification('Opening Google Calendar...', 'success');
        }
    } catch (error) {
        console.error('Calendar creation error:', error);
        showNotification(`Error creating calendar event: ${error.message}`, 'error');
    }
}
        
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = ''; // Clear previous classes
    notification.classList.add('show');

    if (type === 'success') notification.style.backgroundColor = 'var(--success)';
    else if (type === 'error') notification.style.backgroundColor = 'var(--error)';
    else if (type === 'warning') notification.style.backgroundColor = 'var(--warning)';
    else notification.style.backgroundColor = 'var(--primary)';
    
    setTimeout(() => {
        notification.classList.remove('show');
        // Optional: remove element after transition
        // setTimeout(() => {
        //     if (notification.parentNode && !notification.classList.contains('show')) {
        //         notification.parentNode.removeChild(notification);
        //     }
        // }, 300); // Match CSS transition duration
    }, 5000);
}