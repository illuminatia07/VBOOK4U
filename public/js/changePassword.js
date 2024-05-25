function validateForm() {
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    let errorMessages = [];

    

    if (!newPassword) {
        errorMessages.push('New password is required.');
    } else if (newPassword.length < 8) {
        errorMessages.push('Password must be at least 8 characters long.');
    } else if (!/(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[0-9]).{8,}/.test(newPassword)) {
        errorMessages.push('Password must include at least one uppercase letter, one symbol, and one number.');
    }

    if (newPassword !== confirmPassword) {
        errorMessages.push('New password and confirm password do not match.');
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
