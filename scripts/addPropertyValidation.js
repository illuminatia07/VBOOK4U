document.addEventListener('DOMContentLoaded', () => {
  const addPropertyForm = document.getElementById('add-property-form');

  // Add blur event listeners for input fields
  const propertyNameInput = document.getElementById('propertyName');
  propertyNameInput.addEventListener('blur', () => {
      validateInput(propertyNameInput, isValidPropertyName, 'Invalid property name');
  });

  const categoryNameInput = document.getElementById('categoryName');
  categoryNameInput.addEventListener('blur', () => {
      validateInput(categoryNameInput, isValidCategoryName, 'Please select a category');
  });

  const descriptionInput = document.getElementById('description');
  descriptionInput.addEventListener('blur', () => {
      validateInput(descriptionInput, isValidDescription, 'Please enter a description');
  });

  const addressInput = document.getElementById('address');
  addressInput.addEventListener('blur', () => {
      validateInput(addressInput, isValidAddress, 'Please enter a valid address');
  });

  // Room Facilities validation
  const roomFacilitiesInputs = document.querySelectorAll('input[name="roomFacilities"]');
  roomFacilitiesInputs.forEach(input => {
      input.addEventListener('blur', () => {
          validateRoomFacilities(roomFacilitiesInputs);
      });
  });

  addPropertyForm.addEventListener('submit', (event) => {
      // Validate each field
      const isPropertyNameValid = validateInput(propertyNameInput, isValidPropertyName, 'Invalid property name');
      const isCategoryNameValid = validateInput(categoryNameInput, isValidCategoryName, 'Please select a category');
      const isDescriptionValid = validateInput(descriptionInput, isValidDescription, 'Please enter a description');
      const isAddressValid = validateInput(addressInput, isValidAddress, 'Please enter a valid address');
      const isRoomFacilitiesValid = validateRoomFacilities(roomFacilitiesInputs);

      if (!isPropertyNameValid || !isCategoryNameValid || !isDescriptionValid || !isAddressValid || !isRoomFacilitiesValid) {
          event.preventDefault(); // Prevent form submission
          return;
      }
  });

  function validateInput(inputElement, validationFunction, errorMessage) {
      const inputValue = inputElement.value.trim();
      const errorElement = inputElement.nextElementSibling;

      if (!validationFunction(inputValue)) {
          errorElement.textContent = errorMessage;
          return false;
      } else {
          errorElement.textContent = '';
          return true;
      }
  }

  function validateRoomFacilities(roomFacilitiesInputs) {
      const checkedFacilities = Array.from(roomFacilitiesInputs).some(input => input.checked);
      const errorElement = document.getElementById('roomFacilitiesError');
      
      if (!checkedFacilities) {
          errorElement.textContent = 'Please select at least one room facility';
          return false;
      } else {
          errorElement.textContent = '';
          return true;
      }
  }

  function isValidPropertyName(name) {
      const regex = /^[A-Za-z0-9\s,]+$/; // Allow letters, digits, and spaces
      return regex.test(name);
  }

  function isValidCategoryName(name) {
      return name.trim().length > 0;
  }

  function isValidDescription(description) {
      return description.trim().length > 0;
  }

  function isValidAddress(address) {
      const regex = /^[A-Za-z0-9#./,\s]+$/;
      return regex.test(address);
  }
});
