// JavaScript for userHome.ejs

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

checkInDate.addEventListener("change", function () {
  checkOutDate.min = checkInDate.value;
});
$(document).ready(function () {
  // Get today's date
  var today = new Date();

  // Initialize check-in datepicker
  $("#check-in").datepicker({
    format: "yyyy-mm-dd", // Change the format to match the input field
    autoclose: true,
    todayHighlight: true,
    startDate: today, // Set the minimum selectable date to today
  });

  // Initialize check-out datepicker
  $("#check-out").datepicker({
    format: "yyyy-mm-dd", // Change the format to match the input field
    autoclose: true,
    todayHighlight: true,
    startDate: today, // Set the minimum selectable date to today
  });

  // On change event for check-in datepicker
  $("#check-in").change(function () {
    var selectedDate = $(this).datepicker("getDate");
    if (selectedDate !== null) {
      // Increment selected date by one day
      selectedDate.setDate(selectedDate.getDate() + 1);
      // Set start date for check-out datepicker
      $("#check-out").datepicker("setStartDate", selectedDate);
      // Set selected date as default for check-out datepicker
      $("#check-out").datepicker("setDate", selectedDate);
    }
  });

  // Initialize Select2 for guest input
  $("#guest").select2({
    minimumResultsForSearch: Infinity, // Disable search box
  });
});

// Initialize Select2 for guest input
$("#guest").select2({
  minimumResultsForSearch: Infinity, // Disable search box
});

// Initialize Select2 for guest input
$("#guest").select2({
  minimumResultsForSearch: Infinity, // Disable search box
});

// Get and display current date
const currentDate = new Date();
const options = { day: "numeric", month: "short", year: "numeric" };
const formattedDate = currentDate.toLocaleDateString("en-US", options);
document.getElementById("currentDate").textContent = formattedDate;
