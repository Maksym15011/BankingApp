async function pay(amount, service) {
  alert(`Płatność ${amount} PLN za ${service}`);
}

async function pay(amount, service) {
  const senderId = localStorage.getItem("userId");

  const response = await fetch("http://localhost:5000/payment", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      senderId,

      amount,

      service,
    }),
  });

  const data = await response.json();

  alert(data.message);

  if (response.ok) {
    window.location.href = "dashboard.html";
  }
}
