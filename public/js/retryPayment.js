document.addEventListener("DOMContentLoaded", function () {
    const retryPaymentForm = document.getElementById("retryPaymentForm");
  
    retryPaymentForm.addEventListener("submit", function (event) {
      event.preventDefault();
  
      const formData = new FormData(retryPaymentForm);
      const bookingId = formData.get("bookingId");
  
      fetch("/retryPayment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId: bookingId }),
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
            rzp.open();
          } else {
            console.error("Error retrying payment:", data.error);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    });
  });
