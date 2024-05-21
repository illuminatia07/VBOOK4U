// Function to calculate the total price based on check-in and check-out dates
function calculateTotalPrice(checkIn, checkOut, price) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const timeDiff = checkOutDate - checkInDate;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return daysDiff * price;
}

// Function to update the total price
function updateTotalPrice() {
  const propertyPrice = parseFloat("<%= propertyItem.price %>"); // Parse property price as a float
  const checkIn = document.getElementById("check-in").value;
  const checkOut = document.getElementById("check-out").value;

  // Calculate the total price
  const totalPrice = calculateTotalPrice(checkIn, checkOut, propertyPrice);

  // Update the total price displayed on the page
  document.getElementById("total-price").textContent = totalPrice.toFixed(2); // Show price with two decimal places
}

// Add event listeners for the datepicker inputs
$(document).ready(function () {
  // Initialize the datepickers
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  $("#check-in").datepicker({
    format: "yyyy-mm-dd",
    autoclose: true,
    todayHighlight: true,
    startDate: today,
  });

  $("#check-out").datepicker({
    format: "yyyy-mm-dd",
    autoclose: true,
    todayHighlight: true,
    startDate: today,
  });

  // On change event for check-in datepicker
  $("#check-in").change(function () {
    var selectedDate = new Date($(this).val());
    $("#check-out").datepicker("setStartDate", selectedDate);
    updateTotalPrice();
  });

  // On change event for check-out datepicker
  $("#check-out").change(updateTotalPrice);
});

// Add event listener for the continue to book button
document.querySelectorAll(".continue-to-book").forEach((button) => {
  button.addEventListener("click", function () {
    const propertyName = "<%= propertyItem.propertyName %>";
    const propertyPrice = parseFloat("<%= propertyItem.price %>");
    const checkIn = document.getElementById("check-in").value;
    const checkOut = document.getElementById("check-out").value;

    const totalPrice = calculateTotalPrice(checkIn, checkOut, propertyPrice);

    window.location.href = `/payment?propertyName=${encodeURIComponent(
      propertyName
    )}&
      propertyPrice=${encodeURIComponent(
        totalPrice.toFixed(2)
      )}&checkInDate=${encodeURIComponent(
      checkIn
    )}&checkOutDate=${encodeURIComponent(checkOut)}`;
  });
});
