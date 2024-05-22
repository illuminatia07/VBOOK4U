document.addEventListener('DOMContentLoaded', function() {
  const now = new Date();
  const currentHour = now.getHours();
  const today = new Date();
  const checkInDateElement = document.getElementById('check-in');
  const checkOutDateElement = document.getElementById('check-out');

  // Adjust minimum date based on the current time
  if (currentHour >= 12) {
    today.setDate(today.getDate() + 1);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Initialize date pickers
  $(checkInDateElement).datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true,
    todayHighlight: true,
    startDate: today
  }).on('changeDate', function (e) {
    const checkInDate = e.date;
    const nextDay = new Date(checkInDate);
    nextDay.setDate(nextDay.getDate() + 1);
    $(checkOutDateElement).datepicker('setStartDate', nextDay);
    updateTotalPrice();
  });

  $(checkOutDateElement).datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true,
    todayHighlight: true,
    startDate: tomorrow
  }).on('changeDate', function (e) {
    updateTotalPrice();
  });

  // Update total price initially
  updateTotalPrice();
});

// Function to calculate the number of days between two dates
function calculateNumberOfDays(checkIn, checkOut) {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const numberOfDays = Math.round(Math.abs((checkOutDate - checkInDate) / oneDay));

  return numberOfDays;
}

// Function to calculate the total price based on check-in and check-out dates
function calculateTotalPrice(checkIn, checkOut, price) {
  const numberOfDays = calculateNumberOfDays(checkIn, checkOut);
  const totalPrice = numberOfDays * price;

  return totalPrice;
}

// Function to update the total price
function updateTotalPrice() {
  const propertyPrice =  property ? property.price : 0 ;
  const checkIn = document.getElementById("check-in").value;
  const checkOut = document.getElementById("check-out").value;

  console.log('Property Price:', propertyPrice);
  console.log('Check-in:', checkIn);
  console.log('Check-out:', checkOut);

  if (checkIn && checkOut) {
    const totalPrice = calculateTotalPrice(checkIn, checkOut, propertyPrice);
    document.getElementById("total-price").textContent = totalPrice.toFixed(2);
  } else {
    document.getElementById("total-price").textContent = "0.00";
  }
}
