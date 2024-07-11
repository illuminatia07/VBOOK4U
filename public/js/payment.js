document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("paymentForm");
  const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="checkbox"]');
  const errorMessages = form.querySelectorAll(".error-message");
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  const couponCodeInput = document.getElementById("couponCode");
  const paymentMethodInputs = form.querySelectorAll('input[name="paymentMethod"]');
  const discountElement = document.getElementById("discount");
  const couponErrorElement = document.getElementById("couponError");
  const totalPriceElement = document.getElementById("TotalPrice");
  const discountedPriceElement = document.getElementById("DiscountedTotalPrice");
  const discountedPriceSection = document.getElementById("DiscountedPriceSection");

  // Real-time validation on input change
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (errorMessages[index]) {
        if (!input.checkValidity()) {
          errorMessages[index].textContent = input.validationMessage;
          errorMessages[index].style.display = "block";
        } else {
          errorMessages[index].textContent = "";
          errorMessages[index].style.display = "none";
        }
      }
    });
  });

  // Apply/Clear Coupon button click handler
  applyCouponBtn.addEventListener("click", () => {
    const selectedPaymentMethod = Array.from(paymentMethodInputs).find(input => input.checked);

    if (!selectedPaymentMethod) {
      couponErrorElement.textContent = "Please select a payment method.";
      couponErrorElement.style.display = "block";
      return;
    }

    if (applyCouponBtn.textContent === "Apply Coupon") {
      applyCoupon(selectedPaymentMethod.value);
    } else {
      clearCoupon();
    }
  });

  // Apply Coupon function
  function applyCoupon(paymentMethod) {
    const couponCode = couponCodeInput.value.trim();
    const totalPrice = parseFloat(totalPriceElement.textContent.replace("₹", ""));
  
    const formData = new FormData(form);
  
    fetch("/applyCoupon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        couponCode,
        paymentMethod,
        totalPrice,
        propertyName: formData.get("propertyName"),
        name: form.name.value,
        email: form.email.value,
        phoneNumber: form.phoneNumber.value,
        userSession: form.userSession.value,
        propertyId: form.propertyId.value,
        checkInDate: form.checkInDate.value,
        checkOutDate: form.checkOutDate.value,
        user: form.user.value
      }),
    })
      .then(response => response.json())
      .then(data => {
        console.log("Data :", data);
        if (data.success) {
          // Update UI with discounted price and discount details
          if (discountedPriceElement) {
            discountedPriceElement.textContent = `₹${data.finalPrice}`;
            discountedPriceSection.style.display = "block";
          }
          if (discountElement) {
            discountElement.textContent = `Discount: ₹${data.discount} successfully applied`;
            discountElement.style.display = "block";
          }
          applyCouponBtn.textContent = "Clear Coupon";
          couponErrorElement.textContent = "";
          couponErrorElement.style.display = "none";
        } else {
          // Handle coupon application failure
          couponErrorElement.textContent = data.message;
          couponErrorElement.style.display = "block";
        }
      })
      .catch(error => {
        console.error("Error applying coupon:", error);
        couponErrorElement.textContent = "An error occurred while applying the coupon.";
        couponErrorElement.style.display = "block";
      });
  }

  // Clear Coupon function
  function clearCoupon() {
    if (discountElement) {
      discountElement.textContent = "";
      discountElement.style.display = "none";
    }
    couponCodeInput.value = "";
    if (discountedPriceElement) {
      discountedPriceElement.style.display = "none";
    }
    applyCouponBtn.textContent = "Apply Coupon";
    couponErrorElement.textContent = "";
    couponErrorElement.style.display = "none";
  }

  // Form submission handler
  form.addEventListener("submit", function (event) {
    event.preventDefault();
  
    let isValid = true;
  
    // Validate inputs before submission
    inputs.forEach((input, index) => {
      if (errorMessages[index]) {
        if (!input.checkValidity()) {
          errorMessages[index].textContent = input.validationMessage;
          errorMessages[index].style.display = "block";
          isValid = false;
        } else {
          errorMessages[index].textContent = "";
          errorMessages[index].style.display = "none";
        }
      }
    });
  
    if (isValid) {
      handlePayment();
    }
  });
  
  // Function to handle payment
  // Function to handle payment
function handlePayment() {
  const formData = new FormData(form);
  const paymentMethod = formData.get('paymentMethod');
  const totalPrice = document.querySelector("#TotalPrice").textContent.replace("₹", "");

  const data = {
    couponCode: formData.get("couponCode"),
    propertyName: formData.get("propertyName"),
    propertyId: formData.get("propertyId"),
    checkInDate: formData.get("checkInDate"),
    checkOutDate: formData.get("checkOutDate"),
    totalPrice: totalPrice,
    name: formData.get("name"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber"),
    paymentMethod: paymentMethod,
    user: formData.get("user")
  };

  fetch("/handlePayment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    theme: {
      color: '#F21345'
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        if (paymentMethod === 'Online') {
          initiateRazorpayPayment(data);
        } else if (paymentMethod === 'PayAtProperty') {
          window.location.href = "/paymentSuccessPAP?bookingId=" + data.bookingId; // Ensure bookingId is passed correctly
        } else {
          window.location.href = "/paymentSuccess?status=success&bookingId=" + data.bookingId;
        }
      } else {
        window.location.href = "/paymentSuccess?status=failed&bookingId=" + data.bookingId;
      }
    })
    .catch((error) => {
      console.error("Error processing payment:", error);
      window.location.href = "/paymentSuccess?status=failed";
    });
}

  // Function to initiate Razorpay payment
  function initiateRazorpayPayment(data) {
    const options = {
      key: "rzp_test_KMrm8VgRyKa92K", // Replace with your Razorpay key id
      amount: data.amount,
      currency: "INR",
      name: data.name,
      description: "Booking Payment",
      order_id: data.orderId,
      handler: function (response) {
        // Handle the payment success
        fetch("/verifyPayment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          theme: {
            color: '#F21345'
          },
          body: JSON.stringify({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            bookingId: data.bookingId // Include bookingId here
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              window.location.href = "/paymentSuccess?status=success&bookingId=" + data.bookingId;
            } else {
              window.location.href = "/paymentSuccess?status=failed&bookingId=" + data.bookingId;
            }
          })
          .catch((error) => {
            console.error("Error verifying payment:", error);
            window.location.href = "/paymentSuccess?status=failed&bookingId=" + data.bookingId;
          });
      },
      prefill: {
        name: data.name,
        email: data.email,
        contact: data.phoneNumber,
      },
      notes: {
        address: "Booking Payment",
      },
      theme: {
        color: "#F37254",
      },
    };
    
    const razorpayInstance = new Razorpay(options);
    razorpayInstance.on("payment.failed", function (response) {
      window.location.href = "/paymentSuccess?status=failed&bookingId=" + data.bookingId;
    });
    razorpayInstance.open();
  }
});
