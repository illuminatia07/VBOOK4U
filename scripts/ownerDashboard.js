document.getElementById("profileLink").addEventListener("click", function () {
  displaySection("profileSection");
});

document.getElementById("dashboardLink").addEventListener("click", function () {
  displaySection("dashboardSection");
});

document.getElementById("bookingsLink").addEventListener("click", function () {
  displaySection("bookingsSection");
});

document.getElementById("addPropertyLink").addEventListener("click", function () {
  displaySection("addPropertySection");
});

document.getElementById("deleteLink").addEventListener("click", function () {
  displaySection("deleteSection");
});

document.getElementById("couponsLink").addEventListener("click", function () {
  displaySection("couponsSection");
});

document.getElementById("changePasswordButton").addEventListener("click", function () {
  toggleChangePasswordSection(true);
});

document.getElementById("cancelChangePassword").addEventListener("click", function () {
  toggleChangePasswordSection(false);
});

function toggleChangePasswordSection(show) {
  const profileInfo = document.querySelector(".profile-info");
  const changePasswordSection = document.getElementById("changePasswordSection");

  if (show) {
    profileInfo.style.display = "none";
    changePasswordSection.style.display = "block";
  } else {
    profileInfo.style.display = "block";
    changePasswordSection.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/owner/dashboard/properties");
    if (response.ok) {
      const properties = await response.json();
      const editPropertyDropdown = document.getElementById("editPropertyDropdown");
      if (!editPropertyDropdown) {
        console.error("editPropertyDropdown element not found");
        return;
      }
      // Clear previous options
      editPropertyDropdown.innerHTML = "";
      // Add an option for each property
      properties.forEach((property) => {
        const option = document.createElement("option");
        option.value = property._id; // Set the value to the property ID
        option.textContent = property.propertyName; // Set the display text to the property name
        editPropertyDropdown.appendChild(option);
      });
    } else {
      console.error("Failed to fetch properties:", response.status);
    }
  } catch (error) {
    console.error("Error fetching properties:", error);
  }
});

// JavaScript code to handle property selection
document.getElementById("editPropertyDropdown").addEventListener("change", async function () {
  const selectedPropertyId = this.value; // Get the selected property ID from the dropdown
  try {
    const response = await fetch(`/owner/dashboard/property/${selectedPropertyId}`);
    if (response.ok) {
      const property = await response.json();
      // Populate the edit form with the selected property details
      document.getElementById("editPropertyName").value = property.propertyName || "";
      document.getElementById("editCategoryName").value = property.categoryName || "";
      document.getElementById("editDescription").value = property.description || "";
      document.getElementById("editAddress").value = property.address || "";
      document.getElementById("editPrice").value = property.price || "";
      // Set the room facilities checkboxes based on the property details
      property.roomFacilities.forEach((facility) => {
        const facilityCheckbox = document.getElementById(facility.toLowerCase().replace(/\s+/g, ""));
        if (facilityCheckbox) {
          facilityCheckbox.checked = true;
        }
      });
      // Show the edit form
      displaySection("editPropertySection");
    } else {
      console.error("Failed to fetch property details:", response.status);
    }
  } catch (error) {
    console.error("Error fetching property details:", error);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("images");
  const previewContainer = document.getElementById("image-preview");
  const fileCountSpan = document.getElementById("file-count");

  function updateFileCountNextToButton() {
    const selectedFilesCount = previewContainer.children.length;
    const plural = selectedFilesCount !== 1 ? "s" : ""; // For pluralization
    const countText = selectedFilesCount > 0 ? `${selectedFilesCount} image${plural}` : "No image selected";
    fileCountSpan.textContent = countText;
  }

  if (imageInput && previewContainer && fileCountSpan) {
    imageInput.addEventListener("change", previewImages);

    function previewImages(event) {
      const files = event.target.files;

      if (files) {
        previewContainer.innerHTML = "";

        Array.from(files).forEach((file) => {
          const reader = new FileReader();

          reader.onload = () => {
            const img = document.createElement("img");
            img.src = reader.result;

            const closeButton = document.createElement("button");
            closeButton.textContent = "x";
            closeButton.addEventListener("click", (e) => {
              e.preventDefault();
              const imageContainer = e.target.parentNode;
              previewContainer.removeChild(imageContainer);
              updateFileCountNextToButton();
              if (previewContainer.children.length === 0) {
                imageInput.value = "";
              }
            });

            const imageContainer = document.createElement("div");
            imageContainer.appendChild(img);
            imageContainer.appendChild(closeButton);
            previewContainer.appendChild(imageContainer);
            updateFileCountNextToButton();
          };

          reader.readAsDataURL(file);
        });
      }
    }

    updateFileCountNextToButton();
  }
});

function displaySection(sectionId) {
  const sections = document.querySelectorAll(".main-content > div");
  sections.forEach((section) => {
    section.style.display = "none";
  });
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = "block";
  } else {
    console.error(`Section with id ${sectionId} not found`);
  }
}

// Add event listener for list/unlist buttons
document.addEventListener("click", async function (event) {
  if (event.target.classList.contains("list-btn") || event.target.classList.contains("unlist-btn")) {
    const propertyId = event.target.dataset.propertyId;
    const isListButton = event.target.classList.contains("list-btn");

    try {
      const response = await fetch(`/owner/dashboard/updateAvailability/${propertyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isListButton }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Reload the page or update UI as needed
          window.location.reload(); // Example: Reload the page
        } else {
          console.error("Failed to update availability:", data.error);
        }
      } else {
        console.error("Failed to update availability:", response.status);
      }
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  }
});
document.addEventListener("click", async function (event) {
  if (event.target.classList.contains("edit-property-btn")) {
    const propertyId = event.target.dataset.propertyId;
    try {
      const response = await fetch(`/owner/dashboard/property/${propertyId}`);
      if (response.ok) {
        const property = await response.json();
        // Populate the edit form with the selected property details
        document.getElementById("editPropertyName").value = property.propertyName || "";
        document.getElementById("editCategoryName").value = property.categoryName || "";
        document.getElementById("editDescription").value = property.description || "";
        document.getElementById("editAddress").value = property.address || "";
        document.getElementById("editPrice").value = property.price || "";
        // Set the room facilities checkboxes based on the property details
        property.roomFacilities.forEach((facility) => {
          const facilityCheckbox = document.getElementById(facility.toLowerCase().replace(/\s+/g, ""));
          if (facilityCheckbox) {
            facilityCheckbox.checked = true;
          }
        });
        // Show the edit form
        displaySection("editPropertySection");
        // Hide the delete section
        document.getElementById("deleteSection").style.display = "none";
      } else {
        console.error("Failed to fetch property details:", response.status);
      }
    } catch (error) {
      console.error("Error fetching property details:", error);
    }
  }
});


