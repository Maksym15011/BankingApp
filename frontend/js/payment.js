let selectedAmount = 0;
let selectedService = "";

function openModal(amount, service) {
  selectedAmount = amount;
  selectedService = service;

  document.getElementById("serviceName").textContent = service;

  document.getElementById("serviceAmount").textContent = amount + " PLN";

  document.getElementById("paymentModal").style.display = "flex";

  loadCard();
}

function closeModal() {
  document.getElementById("paymentModal").style.display = "none";
}

async function loadCard() {
  const userId = localStorage.getItem("userId");

  const response = await fetch(`http://localhost:5000/card/${userId}`);

  const card = await response.json();

  document.getElementById("cardNumber").value = card.CardNumber;

  document.getElementById("expiryDate").value = card.ExpiryDate;
}

async function confirmPayment() {
  const cvv = document.getElementById("cvv").value;

  if (cvv.length !== 3) {
    alert("Podaj poprawny CVV");

    return;
  }

  await pay(selectedAmount, selectedService);
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
    closeModal();

    window.location.href = "dashboard.html";
  }
}

function changeBank() {
  const bank = document.getElementById("bankSelect").value;

  const cardNumber = document.getElementById("cardNumber");

  const expiryDate = document.getElementById("expiryDate");

  if (bank === "NOVA BANK") {
    loadCard();

    cardNumber.readOnly = true;

    expiryDate.readOnly = true;
  } else {
    cardNumber.value = "";

    expiryDate.value = "";

    cardNumber.readOnly = false;

    expiryDate.readOnly = false;
  }
}
