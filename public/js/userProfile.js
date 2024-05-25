function validateForm() {
    const fullname = document.getElementById('fullname').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const age = document.getElementById('age').value.trim();
    const gender = document.getElementById('gender').value;
    let errorMessages = [];

    if (!/^[a-zA-Z\s]+$/.test(fullname)) {
        errorMessages.push('Full name should only contain alphabets and spaces.');
    }

    if (!/^[\d]{10}$/.test(phoneNumber)) {
        errorMessages.push('Phone number must be 10 digits.');
    }

    if (!age || isNaN(age) || age <= 0) {
        errorMessages.push('Please enter a valid age.');
    }

    if (!gender) {
        errorMessages.push('Please select a gender.');
    }

    const errorDiv = document.getElementById('errorMessages');
    errorDiv.innerHTML = '';

    if (errorMessages.length > 0) {
        errorMessages.forEach(message => {
            const p = document.createElement('p');
            p.className = 'flash-message error';
            p.textContent = message;
            errorDiv.appendChild(p);
        });
        return false; // Prevent form submission
    }

    return true; // Allow form submission
}