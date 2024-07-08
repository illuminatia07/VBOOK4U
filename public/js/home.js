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
document.addEventListener("DOMContentLoaded", function () {
  const now = new Date();
  const currentHour = now.getHours();
  const today = new Date();
  const checkInDateElement = document.getElementById("checkInDate");
  const checkOutDateElement = document.getElementById("checkOutDate");

  // Adjust minimum date based on the current time
  if (currentHour >= 12) {
    today.setDate(today.getDate() + 1);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Initialize date pickers
  $(checkInDateElement)
    .datepicker({
      format: "yyyy-mm-dd",
      startDate: today,
      autoclose: true,
    })
    .on("changeDate", function (e) {
      const checkInDate = new Date(e.date);
      const nextDay = new Date(checkInDate);
      nextDay.setDate(checkInDate.getDate() + 1);
      $(checkOutDateElement).datepicker("setStartDate", nextDay);
    });

  $(checkOutDateElement).datepicker({
    format: "yyyy-mm-dd",
    startDate: tomorrow,
    autoclose: true,
  });

  // Initialize select2 for guest select
  $("#guest").select2();

  
});
