document.addEventListener("DOMContentLoaded", function() {
  const checkInDate = document.getElementById("checkInDate");
  const checkOutDate = document.getElementById("checkOutDate");
  const totalPrice = document.getElementById("totalPrice");
  const propertyPrice = parseFloat(document.getElementById("propertyPrice").value); // Parse property price as a float

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
