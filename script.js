// script.js

document.addEventListener('DOMContentLoaded', function() {
    populateTimeZones(); // Call it for the initial participant already in HTML
    
    const meetingDateInput = document.getElementById('meeting-date');
    if (meetingDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        meetingDateInput.value = tomorrow.toISOString().slice(0, 10);
    }

    // Ensure the initial participant (if hardcoded in HTML) has its timezone dropdown populated
    // and the night option label is correctly linked.
    const initialParticipant = document.querySelector('.participant');
    if (initialParticipant) {
        const initialTimezoneSelect = initialParticipant.querySelector('.participant-timezone');
        if (initialTimezoneSelect && initialTimezoneSelect.options.length <= 1) { // Check if not already populated
            populateTimeZones(initialTimezoneSelect);
        }
        const initialNightCheckbox = initialParticipant.querySelector('.night-checkbox');
        const initialNightLabel = initialParticipant.querySelector('.night-option label');
        if (initialNightCheckbox && initialNightLabel && !initialNightCheckbox.id) {
            initialNightCheckbox.id = 'night-option-0'; // Assuming it's the first
            initialNightLabel.setAttribute('for', 'night-option-0');
        }
    }
});

// Function to copy meeting details to clipboard
function copyMeetingDetails(slot, dateStr, durationMinutes) {
    try {
        // --- Begin Robustness Checks ---
        if (!slot || typeof slot !== 'object') {
            throw new Error('Invalid slot data provided for copying.');
        }
        if (typeof slot.utcTime !== 'number' || isNaN(slot.utcTime)) {
            throw new Error('Invalid or missing UTC time in slot data.');
        }
        if (!Array.isArray(slot.participantTimes)) {
            throw new Error('Missing or invalid participantTimes array in slot data.');
        }
        if (typeof durationMinutes !== 'number' || isNaN(durationMinutes) || durationMinutes <= 0) {
            throw new Error('Invalid or missing meeting duration.');
        }
        // --- End Robustness Checks ---

        const startDate = new Date(slot.utcTime);
        const endTime = new Date(slot.utcTime + durationMinutes * 60 * 1000);

        if (isNaN(startDate.getTime()) || isNaN(endTime.getTime())) {
            throw new Error('Date calculation resulted in an invalid date.');
        }
        
        let meetingInfo = `INTERNATIONAL MEETING DETAILS\n`;
        meetingInfo += `========================\n\n`;
        meetingInfo += `📆 Date: ${startDate.toDateString()}\n`; // Original selected dateStr might be useful if UTC spans midnight
        
        const startTimeUTC = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        const endTimeUTC = endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        meetingInfo += `⏰ Time: ${startTimeUTC} - ${endTimeUTC} UTC\n`;
        meetingInfo += `⏱️ Duration: ${durationMinutes} minutes\n\n`;
        
        meetingInfo += `LOCAL TIMES FOR PARTICIPANTS:\n`;
        meetingInfo += `========================\n\n`;
        
        slot.participantTimes.forEach((pt, index) => {
            if (!pt || typeof pt !== 'object' || !pt.city || !pt.time) {
                console.warn(`Skipping participant ${index + 1} due to missing data:`, pt);
                meetingInfo += `❓ Participant ${index + 1} (data error)\n`;
                return; // Skip this participant if data is incomplete
            }

            let timeIndicator = '🕙'; // Default/unknown
            if (pt.isStandard) timeIndicator = '✅';
            else if (pt.isExtended) timeIndicator = '⚠️';
            else if (pt.isLateNight) timeIndicator = '🌙';
            
            meetingInfo += `${timeIndicator} ${pt.city}: ${pt.time}\n`;
        });
        
        if (!navigator.clipboard) {
            showNotification('Clipboard API not available in this browser or context.', 'error');
            console.error('Clipboard API (navigator.clipboard) is not available.');
            // Optionally, provide a fallback like showing the text in a textarea for manual copy
            return;
        }

        navigator.clipboard.writeText(meetingInfo)
            .then(() => {
                showNotification('Meeting details copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Could not copy text to clipboard: ', err);
                showNotification(`Failed to copy. ${err.message}. See console.`, 'error');
                // Fallback for users:
                prompt("Could not auto-copy. Please copy manually:", meetingInfo);
            });

    } catch (error) {
        console.error('Error in copyMeetingDetails function:', error);
        showNotification(`Error preparing details for copy: ${error.message}`, 'error');
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
    const targetSelects = selectElement ? [selectElement] : document.querySelectorAll('.participant-timezone');
    targetSelects.forEach(select => {
        if (!select) return;
        
        const currentValue = select.value; // Preserve selected value if already set
        select.innerHTML = ''; // Clear existing options
        
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Time Zone";
        defaultOption.disabled = true;
        if (!currentValue) defaultOption.selected = true; // Select if no value was previously set
        select.appendChild(defaultOption);

        timeZones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.zone;
            option.textContent = tz.label;
            if (tz.zone === currentValue) option.selected = true;
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
    // populateTimeZones(select) will be called, and it will add the default "Select Time Zone"
    
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
    populateTimeZones(select); // Populate the newly added select
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
    
    if (!dateInput || !durationSelect || !allowExtendedCheckbox) {
        showNotification('Core HTML elements for form inputs are missing. Cannot proceed.', 'error');
        return;
    }

    const dateStr = dateInput.value;
    const durationMinutes = parseInt(durationSelect.value);
    const allowExtended = allowExtendedCheckbox.checked;
    
    const participants = [];
    const participantElements = document.querySelectorAll('.participant');
    
    let allTimezonesSelected = true;
    participantElements.forEach((el, index) => {
        const timezoneSelect = el.querySelector('.participant-timezone');
        const allowLateNight = el.querySelector('.night-checkbox').checked;
        
        if (!timezoneSelect || !timezoneSelect.value) {
            allTimezonesSelected = false;
            showNotification(`Please select a time zone for participant ${index + 1}.`, 'warning');
            return; // Exit forEach loop for this iteration
        }
        const tzData = timeZones.find(tz => tz.zone === timezoneSelect.value);
        if (!tzData) { // Should ideally not happen if dropdown is populated correctly
             allTimezonesSelected = false;
             console.error(`Invalid timezone value selected for participant ${index + 1}: ${timezoneSelect.value}`);
             showNotification(`Invalid time zone for participant ${index + 1}.`, 'error');
             return;
        }

        participants.push({
            timezone: timezoneSelect.value,
            city: tzData.city,
            allowLateNight: allowLateNight
        });
    });

    if (!allTimezonesSelected) return; // Stop if any timezone is not selected

    if (!dateStr) {
        showNotification('Please select a meeting date.', 'warning');
        return;
    }
    if (participants.length === 0 && participantElements.length > 0) {
        // This case means all participants were invalid, handled above.
        // If participantElements.length is 0, it means no participant divs exist.
        showNotification('Please add at least one participant.', 'warning');
        return;
    }
     if (participantElements.length === 0) {
        showNotification('Please add at least one participant using the "Add Participant" button.', 'warning');
        return;
    }


    const timeSlots = generateTimeSlots(dateStr, durationMinutes, participants, allowExtended);
    displayMeetingResults(timeSlots, dateStr, durationMinutes, participants);
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
            
            let hour = 0, minute = 0;
            try {
                const localTimeParts = localDateTimeFormat.formatToParts(slotUtcTime);
                localTimeParts.forEach(part => {
                    if (part.type === 'hour') hour = parseInt(part.value === '24' ? '0' : part.value);
                    if (part.type === 'minute') minute = parseInt(part.value);
                });
            } catch (e) {
                console.error(`Error formatting date for timezone ${participant.timezone}: `, e);
                allParticipantsAvailable = false; // Consider this slot invalid if a timezone fails
                break;
            }


            const startMinutesLocal = hour * 60 + minute;
            // For checking end time, consider meeting crossing midnight locally.
            // A simple approach for now: assume meeting completes within the same local "day segment" for categorization.
            // A more robust check would involve full date objects for start and end in local time.
            const endMinutesLocal = startMinutesLocal + durationMinutes;

            const isStandard = startMinutesLocal >= 9 * 60 && endMinutesLocal <= 17 * 60; // 9 AM - 5 PM
            const isExtendedCandidate = startMinutesLocal >= 7 * 60 && endMinutesLocal <= 20 * 60; // 7 AM - 8 PM
            const isExtended = allowExtended && isExtendedCandidate && !isStandard;
            
            // Late night: 8 PM (20:00) to 7 AM (07:00) next day
            const isLateNight = participant.allowLateNight && 
                              ((startMinutesLocal >= 20 * 60 && startMinutesLocal < 24 * 60) || // 8 PM to before midnight
                               (startMinutesLocal >= 0 && endMinutesLocal <= 7 * 60 && endMinutesLocal > 0)); // Midnight to 7 AM
            
            const isAvailable = isStandard || isExtended || isLateNight;
            if (!isAvailable) {
                allParticipantsAvailable = false;
                break; 
            }

            if (isStandard) slot.score += 3;
            else if (isExtended) slot.score += 2;
            else if (isLateNight) slot.score += 1;
            else slot.score += 0; // Should not happen if isAvailable is true

            const formattedLocalDate = new Date(slotUtcTime).toLocaleString('en-US', {
                timeZone: participant.timezone,
                hour: 'numeric', minute: 'numeric', hour12: true
            });
            slot.participantTimes.push({
                city: participant.city, time: formattedLocalDate,
                isStandard, isExtended, isLateNight
            });
        }

        if (allParticipantsAvailable && slot.participantTimes.length === participants.length) {
            timeSlots.push(slot);
        }
    }
    timeSlots.sort((a, b) => b.score - a.score || a.utcTime - b.utcTime);
    return timeSlots.slice(0, 5);
}


function displayMeetingResults(timeSlots, dateStr, durationMinutes, participants) {
    const resultContainer = document.getElementById('meeting-result');
    const suggestionsContainer = document.getElementById('meeting-suggestions');
    if (!resultContainer || !suggestionsContainer) {
        console.error("Result or suggestions container not found in DOM.");
        return;
    }

    resultContainer.style.display = 'block';
    suggestionsContainer.innerHTML = ''; // Clear previous results

    if (timeSlots.length === 0) {
        suggestionsContainer.innerHTML = `
            <div class="suggestion" style="background-color: var(--warning-light); border-left: 4px solid var(--warning-dark); padding: 1rem;">
                <h4 style="color: var(--warning-dark); margin-top:0;">No Ideal Times Found</h4>
                <p>No suitable meeting times found with the current criteria. Try the following:</p>
                <ul style="margin-left: 1.5rem; margin-bottom: 0;">
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
        
        let suggestionHTML = `<h4 style="margin-top:0;">Option ${index + 1} (${utcFormatted} UTC)</h4><div class="time-grid">`;
        slot.participantTimes.forEach(pt => {
            let timeClass = '';
            let label = '';
            if (pt.isStandard) { timeClass = 'standard-hours'; label = ' (standard)'; }
            else if (pt.isExtended) { timeClass = 'extended-hours'; label = ' (extended)'; }
            else if (pt.isLateNight) { timeClass = 'night-hours'; label = ' (late night)'; }
            else { timeClass = 'default-hours'; label = ' (other)';} // Fallback
            
            suggestionHTML += `<div class="time-slot ${timeClass}">${pt.city || 'N/A'}: ${pt.time || 'N/A'}${label}</div>`;
        });
        suggestionHTML += '</div>';
        suggestionDiv.innerHTML = suggestionHTML;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap'; // Allow buttons to wrap on small screens
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '1rem';
        
        const createEventBtn = document.createElement('button');
        createEventBtn.className = 'create-event-btn';
        // createEventBtn.textContent = 'Add to Google Calendar'; // Text is set by ::before
        createEventBtn.onclick = (e) => {
            e.preventDefault();
            createGoogleCalendarEvent(slot, dateStr, durationMinutes, participants);
        };
        
        const copyLinkBtn = document.createElement('button');
        copyLinkBtn.className = 'create-event-btn'; // Re-use class for similar styling
        copyLinkBtn.style.background = 'var(--success)'; // Custom color for copy
        copyLinkBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;" aria-hidden="true">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>Copy Meeting Info`;
        copyLinkBtn.setAttribute('aria-label', 'Copy meeting information for Option ' + (index + 1));
        copyLinkBtn.onclick = (e) => {
            e.preventDefault();
            copyMeetingDetails(slot, dateStr, durationMinutes);
        };
        
        buttonContainer.appendChild(createEventBtn);
        buttonContainer.appendChild(copyLinkBtn);
        suggestionDiv.appendChild(buttonContainer);
        suggestionsContainer.appendChild(suggestionDiv);
    });

    if (timeSlots.length > 0) {
        suggestionsContainer.insertAdjacentHTML('beforeend', `
            <div class="legend">
                <div style="display: flex; align-items: center; margin-bottom: 0.3rem;"><span style="display:inline-block; width:12px; height:12px; background:var(--standard-hours-bg); border:1px solid #ccc; margin-right:8px;"></span> Standard hours (9 AM - 5 PM)</div>
                <div style="display: flex; align-items: center; margin-bottom: 0.3rem;"><span style="display:inline-block; width:12px; height:12px; background:var(--extended-hours-bg); border:1px solid #ccc; margin-right:8px;"></span> Extended hours (7 AM - 8 PM)</div>
                <div style="display: flex; align-items: center;"><span style="display:inline-block; width:12px; height:12px; background:var(--night-mode-bg); border:1px solid #ccc; margin-right:8px;"></span> Late night hours (if allowed)</div>
            </div>
        `);
    }
}

function createGoogleCalendarEvent(slot, dateStr, durationMinutes, participants) {
    try {
        if (!slot || typeof slot.utcTime !== 'number' || isNaN(slot.utcTime)) {
            throw new Error('Invalid slot data for calendar event.');
        }
        if (typeof durationMinutes !== 'number' || isNaN(durationMinutes) || durationMinutes <= 0) {
            throw new Error('Invalid meeting duration for calendar event.');
        }

        const startDate = new Date(slot.utcTime);
        const endDate = new Date(slot.utcTime + durationMinutes * 60 * 1000);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date calculation for calendar event.');
        }
        
        const formatDateForGCal = (dt) => dt.toISOString().replace(/-|:|\.\d+/g, '');
        
        const startTimeStr = formatDateForGCal(startDate);
        const endTimeStr = formatDateForGCal(endDate);
        
        const formattedDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        const formattedTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        const title = `International Meeting - ${formattedDate} at ${formattedTime} UTC`;
        
        let description = '*INTERNATIONAL MEETING DETAILS*\n\n';
        description += `📅 Original Selected Date: ${new Date(dateStr + 'T00:00:00Z').toDateString()} (UTC for reference)\n`; // Show original selected date
        description += `UTC Start: ${startDate.toUTCString()}\n`;
        description += `⏱️ Duration: ${durationMinutes} minutes\n\n`;
        description += '*LOCAL TIMES FOR PARTICIPANTS:*\n\n';

        if (Array.isArray(slot.participantTimes)) {
            slot.participantTimes.forEach(pt => {
                if (!pt || !pt.city || !pt.time) return;
                let timeIndicator = pt.isStandard ? '✅' : (pt.isExtended ? '⚠️' : (pt.isLateNight ? '🌙' : '🕙'));
                description += `${timeIndicator} ${pt.city}: ${pt.time}\n`;
            });
        }
        description += '\n\n------------------\nScheduled with MeetAcrossTimezones';
        
        const params = new URLSearchParams({
            action: 'TEMPLATE', text: title,
            dates: `${startTimeStr}/${endTimeStr}`,
            details: description, ctz: 'UTC' // ctz: 'UTC' is important
        });
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`; // render is often more reliable
        
        const calWindow = window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');
        if (!calWindow || calWindow.closed || typeof calWindow.closed === 'undefined') {
            showNotification('Calendar link ready. Please allow pop-ups.', 'info');
            // As a fallback, you could offer the URL to the user if window.open fails.
            // e.g., by creating a temporary link on the page or logging it clearly.
            console.warn("Pop-up for Google Calendar might have been blocked. URL:", googleCalendarUrl);
        } else {
            showNotification('Opening Google Calendar...', 'success');
        }
    } catch (error) {
        console.error('Error creating Google Calendar event link:', error);
        showNotification(`Calendar event error: ${error.message}`, 'error');
    }
}
        
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        // Apply initial styles for transition if it's newly created
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = ''; // Clear previous type classes if any
    
    // Determine background color based on type
    let bgColor = 'var(--primary)'; // Default to info
    if (type === 'success') bgColor = 'var(--success)';
    else if (type === 'error') bgColor = 'var(--error)';
    else if (type === 'warning') bgColor = 'var(--warning)';
    notification.style.backgroundColor = bgColor;
    
    // Trigger reflow to ensure transition applies on new elements
    // or when changing styles for display
    void notification.offsetWidth; 

    // Add 'show' class to trigger transition
    notification.classList.add('show'); 
    
    // Clear any existing timeouts to prevent multiple fades
    if (notification.dataset.timeoutId) {
        clearTimeout(parseInt(notification.dataset.timeoutId));
    }

    const timeoutId = setTimeout(() => {
        notification.classList.remove('show');
        // Optional: remove element after transition if you prefer,
        // but keeping it can be more efficient if shown frequently.
        // setTimeout(() => {
        //     if (notification.parentNode && !notification.classList.contains('show')) {
        //         // notification.parentNode.removeChild(notification);
        //     }
        // }, 300); // Match CSS transition duration
    }, 5000);
    notification.dataset.timeoutId = timeoutId.toString();
}
