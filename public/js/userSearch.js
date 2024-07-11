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

  // Form submission for apply filters
  document
    .getElementById("applyFiltersForm")
    .addEventListener("submit", function (event) {
      event.preventDefault(); // Prevent the form from submitting normally

      // Get the form data
      const formData = new FormData(this);

      // Add price range to form data
      const priceRange = document.getElementById('priceRange');
      const minPrice = 500; // Assuming 500 is the minimum price
      const maxPrice = priceRange.value;
      formData.set('priceRange', `${minPrice}-${maxPrice}`);

      // Convert form data to URLSearchParams
      const params = new URLSearchParams(formData);

      // Add search, checkIn, and checkOut parameters if they exist
      const searchInput = document.getElementById('search');
      if (searchInput && searchInput.value) {
        params.set('search', searchInput.value);
      }
      if (checkInDateElement.value) {
        params.set('checkIn', checkInDateElement.value);
      }
      if (checkOutDateElement.value) {
        params.set('checkOut', checkOutDateElement.value);
      }

      // Redirect to the applyFilters route with the form data as query params
      window.location.href = `/applyFilters?${params.toString()}`;
    });

  // Add event listener to all elements with the class "view-info"
  document.querySelectorAll(".view-info").forEach((button) => {
    button.addEventListener("click", function () {
      const propertyElement = this.closest(".property");
      const propertyName =
        propertyElement.querySelector(".property-heading").textContent;
      const description = propertyElement.querySelector(
        ".property-detail:nth-child(2) span"
      ).textContent;
      const address = propertyElement.querySelector(
        ".property-detail:nth-child(3) span"
      ).textContent;
      const price = propertyElement.querySelector(
        ".property-detail:nth-child(4) span"
      ).textContent;
      const images = Array.from(
        propertyElement.querySelectorAll(".property-images img")
      ).map((img) => img.src);
      const propertyId = this.getAttribute("data-id"); // Get property ID

      // Create a property object to pass to localStorage
      const property = {
        propertyName,
        description,
        address,
        price,
        images,
      };

      // Store the property data in localStorage
      localStorage.setItem("selectedProperty", JSON.stringify(property));

      // Get check-in and check-out dates
      const checkIn = document.getElementById("checkInDate").value;
      const checkOut = document.getElementById("checkOutDate").value;

      if (!checkIn || !checkOut) {
        alert("Please select check-in and check-out dates.");
        return;
      }

      // Redirect to the property details page with dates
      window.location.href = `/propertyDetails?propertyName=${encodeURIComponent(
        propertyName
      )}&checkIn=${checkIn}&checkOut=${checkOut}&propertyId=${encodeURIComponent(
        propertyId
      )}`;
    });
  });

  // Add an event listener to the price range input
  const priceRange = document.getElementById("priceRange");
  const minPriceLabel = document.getElementById("minPriceLabel");
  const maxPriceLabel = document.getElementById("maxPriceLabel");

  priceRange.addEventListener("input", function () {
    // Update the min and max price labels based on the input value
    minPriceLabel.textContent = this.min;
    maxPriceLabel.textContent = this.value;
  });

  // Set initial values for price range labels
  minPriceLabel.textContent = priceRange.min;
  maxPriceLabel.textContent = priceRange.value;
});