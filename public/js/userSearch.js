document.getElementById('applyFiltersForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    // Get the form data
    const formData = new FormData(this);

    // Convert form data to URLSearchParams
    const params = new URLSearchParams(formData);

    // Redirect to the applyFilters route with the form data as query params
    window.location.href = `/applyFilters?${params.toString()}`;
});

// Add an event listener to all elements with the class "view-info"
document.querySelectorAll('.view-info').forEach(button => {
    button.addEventListener('click', function() {
        const propertyElement = this.closest('.property');
        const propertyName = propertyElement.querySelector('.property-heading').textContent;
        const description = propertyElement.querySelector('.property-detail:nth-child(2) span').textContent;
        const address = propertyElement.querySelector('.property-detail:nth-child(3) span').textContent;
        const price = propertyElement.querySelector('.property-detail:nth-child(4) span').textContent;
        const images = Array.from(propertyElement.querySelectorAll('.property-images img')).map(img => img.src);

        // Create a property object to pass to localStorage
        const property = {
            propertyName,
            description,
            address,
            price,
            images
        };

        // Store the property data in localStorage
        localStorage.setItem('selectedProperty', JSON.stringify(property));

        // Redirect to the view property details page
        window.location.href = `/propertyDetails?propertyName=${encodeURIComponent(propertyName)}`;
    });
});

// Add an event listener to the price range input
document.getElementById('priceRange').addEventListener('input', function() {
    const minPriceLabel = document.getElementById('minPriceLabel');
    const maxPriceLabel = document.getElementById('maxPriceLabel');

    // Update the min and max price labels based on the input value
    minPriceLabel.textContent = this.min;
    maxPriceLabel.textContent = this.value;
});
