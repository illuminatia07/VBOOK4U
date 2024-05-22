// Toggle navigation menu
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn.querySelector("i");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("open");

  const isOpen = navLinks.classList.contains("open");
  menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
});

navLinks.addEventListener("click", () => {
  navLinks.classList.remove("open");
  menuBtnIcon.setAttribute("class", "ri-menu-line");
});

// Initialize datepicker for check-in and check-out inputs
const checkInDate = document.getElementById("checkInDate");
const checkOutDate = document.getElementById("checkOutDate");

// Get today's date and current time
const today = new Date();
const currentHour = today.getHours();

// If current time is past 12 PM, set the minimum selectable date to tomorrow
if (currentHour >= 12) {
  today.setDate(today.getDate() + 1);
}

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1); // Set minimum checkout date to one day after today

// Set minimum selectable date for check-in
checkInDate.min = today.toISOString().split('T')[0];

// Set minimum selectable date for check-out (at least one day after check-in)
checkOutDate.min = tomorrow.toISOString().split('T')[0];

$(document).ready(function () {
  // Initialize check-in datepicker
  $("#checkInDate").datepicker({
    format: "yyyy-mm-dd", // Change the format to match the input field
    autoclose: true,
    todayHighlight: true,
    startDate: today, // Set the minimum selectable date to today
  });

  // Initialize check-out datepicker
  $("#checkOutDate").datepicker({
    format: "yyyy-mm-dd", // Change the format to match the input field
    autoclose: true,
    todayHighlight: true,
    startDate: tomorrow, // Set the minimum selectable date to tomorrow
  });

  // On change event for check-in datepicker
  $("#checkInDate").change(function () {
    var selectedDate = $(this).datepicker("getDate");
    if (selectedDate !== null) {
      // Increment selected date by one day
      selectedDate.setDate(selectedDate.getDate() + 1);
      // Set start date for check-out datepicker
      $("#checkOutDate").datepicker("setStartDate", selectedDate);
      // Set selected date as default for check-out datepicker
      $("#checkOutDate").datepicker("setDate", selectedDate);
    }
  });

  // Initialize Select2 for guest input
  $("#guest").select2({
    minimumResultsForSearch: Infinity, // Disable search box
  });
});

// Get and display current date
const currentDate = new Date();
const options = { day: "numeric", month: "short", year: "numeric" };
const formattedDate = currentDate.toLocaleDateString("en-US", options);
document.getElementById("currentDate").textContent = formattedDate;
