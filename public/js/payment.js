document.addEventListener("DOMContentLoaded", function () {
  const totalPriceElement = document.querySelector("#OriginalTotalPrice");
  const discountedPriceElement = document.querySelector("#DiscountedTotalPrice");
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  const couponCodeInput = document.getElementById("couponCode");
  const originalPrice = parseFloat(totalPriceElement.textContent.replace("₹", ""));
  let discountPrice = originalPrice; // Initialize discountPrice to originalPrice

  applyCouponBtn.addEventListener("click", function () {
    if (applyCouponBtn.textContent === "Clear Coupon") {
      discountedPriceElement.textContent = `₹${originalPrice.toFixed(2)}`;
      couponCodeInput.value = "";
      applyCouponBtn.textContent = "Apply Coupon";
      displayFlashMessage("success", "Coupon cleared successfully.");
    } else {
      const couponCode = couponCodeInput.value;
      const paymentMethodElement = document.querySelector('input[name="paymentMethod"]:checked');
      const propertyName = document.querySelector('input[name="propertyName"]').value; // Ensure this input exists in your form
      const propertyId = document.querySelector('input[name="propertyId"]').value; // Ensure this input exists in your form

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
          propertyName: propertyName, // Send the property name
          propertyId: propertyId, // Send the property ID
          paymentMethod: paymentMethod,
          totalPrice: originalPrice
        }),
        
      })
      .then((response) => response.json())
      .then((data) => {
      console.log("coupon data : ",data)
        if (data.success) {
          discountedPriceElement.textContent = `₹${data.newPrice}`;
          applyCouponBtn.textContent = "Clear Coupon";
          discountPrice = data.newPrice; // Update discountPrice here
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
      totalPrice: parseFloat(discountPrice) > 0 ? parseFloat(discountPrice) * 100 : parseFloat(formData.get('totalPrice')) * 100,
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
    console.log("Data : ", data);
    fetch("/createOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        console.log("DATA paymentJS: ", data);
        const options = {
          key: 'rzp_test_KMrm8VgRyKa92K',
          amount: data.amount, // Amount in paise
          currency: 'INR',
          order_id: data.orderId, // The order ID generated from your server
          handler: function (response) {
            window.location.href = "/paymentSuccess";
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

        // Handle payment failure
        rzp.on('payment.failed', function (response) {
          window.location.href = "/paymentFailed";
        });

        rzp.open();
      } else {
        console.error("Error creating order :", data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  });
});
