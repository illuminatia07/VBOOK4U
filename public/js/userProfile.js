
        // Client-side validation
        function validateForm() {
            const fullname = document.getElementById('fullname').value.trim();
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            const age = document.getElementById('age').value.trim();
            const gender = document.getElementById('gender').value;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const retypePassword = document.getElementById('retypePassword').value;

            let errorMessages = [];

            if (!fullname) {
                errorMessages.push('Full name is required.');
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

            if (currentPassword.length === 0) {
                errorMessages.push('Current password is required.');
            } else {
                // Check if the current password matches the user's password in the database
                // Replace the following code with your server-side logic to check the password
                const userPassword = "<%= user.password %>"; // Replace with the user's password from the database
                if (!bcrypt.compareSync(currentPassword, userPassword)) {
                    errorMessages.push('Incorrect current password.');
                }
            }

            if (newPassword.length > 0 || retypePassword.length > 0) {
                if (newPassword !== retypePassword) {
                    errorMessages.push('New password and retype password do not match.');
                } else {
                    // Hash the new password using bcrypt
                    const hashedPassword = bcrypt.hashSync(newPassword, 10);
                    // Store the hashed password in your database
                    // Replace the following code with your server-side logic to update the password
                    console.log('New hashed password:', hashedPassword);
                }
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
   