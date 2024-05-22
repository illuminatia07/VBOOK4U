// JavaScript code to calculate the total price based on the check-in and check-out dates
const checkInDate = document.getElementById("checkInDate");
const checkOutDate = document.getElementById("checkOutDate");
const totalPrice = document.getElementById("totalPrice");

checkInDate.addEventListener("change", calculateTotalPrice);
checkOutDate.addEventListener("change", calculateTotalPrice);

function calculateTotalPrice() {
  const checkIn = new Date(checkInDate.value);
  const checkOut = new Date(checkOutDate.value);
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  const numNights = timeDiff / (1000 * 60 * 60 * 24);

  if (!isNaN(numNights) && numNights >= 0) {
    const propertyPrice = document.getElementById("propertyPrice").value;
    const totalCost = numNights * propertyPrice;
    totalPrice.value = totalCost.toFixed(2);
  } else {
    totalPrice.value = "0.00";
  }
}

// Initial calculation in case dates are already populated
calculateTotalPrice();

// Function to get current date in YYYY-MM-DD format
function getCurrentDate() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); // January is 0!
  const yyyy = today.getFullYear();
  return yyyy + "-" + mm + "-" + dd;
}
document.addEventListener("DOMContentLoaded", function() {
    const checkInDate = document.getElementById("checkInDate");
    const checkOutDate = document.getElementById("checkOutDate");
    const totalPrice = document.getElementById("totalPrice");
    const propertyPrice = document.getElementById("propertyPrice").value;
  
    function calculateTotalPrice() {
      const checkIn = new Date(checkInDate.value);
      const checkOut = new Date(checkOutDate.value);
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const numNights = timeDiff / (1000 * 60 * 60 * 24);
  
      if (!isNaN(numNights) && numNights >= 0) {
        const totalCost = numNights * propertyPrice;
        totalPrice.value = totalCost.toFixed(2);
      } else {
        totalPrice.value = "0.00";
      }
    }
  
    checkInDate.addEventListener("change", calculateTotalPrice);
    checkOutDate.addEventListener("change", calculateTotalPrice);
  
    // Initial calculation in case dates are already populated
    calculateTotalPrice();
  });
  
  // Add this script in your payment.ejs file or in a separate JavaScript file

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('paymentForm');
  const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="checkbox"]');
  const errorMessages = form.querySelectorAll('.error-message');

  form.addEventListener('submit', (event) => {
    let hasErrors = false;
    inputs.forEach((input, index) => {
      if (!input.checkValidity()) {
        errorMessages[index].style.display = 'block';
        hasErrors = true;
      } else {
        errorMessages[index].style.display = 'none';
      }
    });

    if (hasErrors) {
      event.preventDefault();
    }
  });

  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      if (!input.checkValidity()) {
        errorMessages[index].style.display = 'block';
      } else {
        errorMessages[index].style.display = 'none';
      }
    });
  });
});
