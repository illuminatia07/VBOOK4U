document.addEventListener("DOMContentLoaded", function () {
  const totalPriceElement = document.querySelector(".total-price");
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  const couponCodeInput = document.getElementById("couponCode");
  const originalPrice = parseFloat(totalPriceElement.textContent.replace("₹", ""));
  let discount = 0;

  applyCouponBtn.addEventListener("click", function () {
    if (applyCouponBtn.textContent === "Clear Coupon") {
      totalPriceElement.textContent = `₹${originalPrice.toFixed(2)}`;
      couponCodeInput.value = "";
      applyCouponBtn.textContent = "Apply Coupon";
      displayFlashMessage("success", "Coupon cleared successfully.");
    } else {
      const couponCode = couponCodeInput.value;
      const paymentMethodElement = document.querySelector('input[name="paymentMethod"]:checked');
      const propertyName = document.querySelector('input[name="propertyName"]').value;
  
      if (!couponCode) {
        displayFlashMessage("error", "Please enter a coupon code.");
        return;
      }
  
      if (!paymentMethodElement) {
        displayFlashMessage("error", "Please select a payment method.");
        return;
      }
  
      const paymentMethod = paymentMethodElement.value;
  
      fetch("/apply-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponCode: couponCode,
          propertyName: propertyName,
          paymentMethod: paymentMethod,
          totalPrice: originalPrice || totalPrice
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            discount = originalPrice - data.newPrice;
            totalPriceElement.textContent = `₹${data.newPrice.toFixed(2)}`;
            applyCouponBtn.textContent = "Clear Coupon";
            displayFlashMessage("success", data.message);
          } else {
            displayFlashMessage("error", data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          displayFlashMessage("error", "An error occurred while applying the coupon.");
        });
    }
  });  

  function displayFlashMessage(type, message) {
    const flashMessageElement = document.getElementById("couponMessage");
    flashMessageElement.textContent = message;
    flashMessageElement.className = type === "success" ? "success-message" : "error-message";
  
    // Clear existing messages
    document.querySelectorAll(".flash-message").forEach(element => element.remove());
  
    const couponGroup = document.querySelector(".coupon-group");
    const newMessageElement = document.createElement("div");
    newMessageElement.className = `flash-message ${type}`;
    newMessageElement.textContent = message;
    couponGroup.insertAdjacentElement("beforebegin", newMessageElement);
  }

  // Form validation
  const form = document.getElementById("paymentForm");
  const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="checkbox"]');
  const errorMessages = form.querySelectorAll(".error-message");

  form.addEventListener("submit", async (event) => {
    let hasErrors = false;
    inputs.forEach((input, index) => {
      if (!input.checkValidity()) {
        errorMessages[index].style.display = "block";
        hasErrors = true;
      } else {
        errorMessages[index].style.display = "none";
      }
    });

    const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethod) {
      const paymentMethodError = document.createElement("p");
      paymentMethodError.classList.add("error-message");
      paymentMethodError.textContent = "Please select a payment method.";
      document.querySelector(".payment-options").appendChild(paymentMethodError);
      hasErrors = true;
    }

    if (hasErrors) {
      event.preventDefault();
      return;
    }
  });

  // Real-time validation
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (!input.checkValidity()) {
        errorMessages[index].style.display = "block";
      } else {
        errorMessages[index].style.display = "none";
      }
    });
  });

  // Toggle visibility of payment buttons based on selected method
  const paymentMethodOptions = document.querySelectorAll('input[name="paymentMethod"]');
  const bookNowBtn = document.getElementById("bookNowBtn");
  const payOnlineBtn = document.getElementById("payOnlineBtn");

  paymentMethodOptions.forEach((option) => {
    option.addEventListener("change", function () {
      if (option.value === "Online") {
        bookNowBtn.style.display = "none";
        payOnlineBtn.style.display = "block";
      } else if (option.value === "PayAtProperty") {
        payOnlineBtn.style.display = "none";
        bookNowBtn.style.display = "block";
      }
    });
  });

  // Handle online payment
  payOnlineBtn.addEventListener("click", function () {
    const form = document.getElementById("paymentForm");
    const formData = new FormData(form);
    const propertyId = document.querySelector('input[name="propertyId"]').value;

    const data = {
      totalPrice: formData.get('totalPrice'),
      propertyId: propertyId,
      checkIn: formData.get('checkInDate'),
      checkOut: formData.get('checkOutDate'),
      user: formData.get('userSession'),
      payMethod: formData.get('paymentMethod'),
      name: formData.get('name'),
      email: formData.get('email'),
      phoneNumber: formData.get('phoneNumber'),
      couponName: formData.get('couponCode') || null,
      dateInitiated: new Date()
    };

    fetch("/createOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const options = {
            key: 'rzp_test_KMrm8VgRyKa92K',
            amount: data.amount, // Amount in paise
            currency: 'INR',
            order_id: data.orderId, // The order ID generated from your server
            handler: function (response) {
              window.location.href = "/yourBooking";
            },
            prefill: {
              name: data.name,
              email: data.email,
              contact: data.phoneNumber
            },
            notes: {
              address: 'Test address'
            }
          };
          const rzp = new Razorpay(options);
          rzp.open();
        } else {
          console.error("Error creating order:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
});