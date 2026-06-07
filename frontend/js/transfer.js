const cardInput = document.getElementById("cardNumber");

if (cardInput) {
  cardInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "").substring(0, 16);

    value = value.match(/.{1,4}/g)?.join(" ") || "";

    e.target.value = value;
  });
}

async function makeTransfer() {
  const senderId = localStorage.getItem("userId");

  const cardNumber = document.getElementById("cardNumber").value.trim();

  const amount = Number(document.getElementById("amount").value);

  const note = document.getElementById("note").value.trim();

  const digitsOnly = cardNumber.replace(/\s/g, "");

  if (digitsOnly.length !== 16) {
    alert("Numer karty musi zawierać 16 cyfr");

    return;
  }

  if (amount <= 0 || isNaN(amount)) {
    alert("Kwota musi być większa od 0");

    return;
  }

  try {
    const response = await fetch("http://localhost:5000/transfer", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        senderId,
        cardNumber,
        amount,
        note,
      }),
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error(error);

    alert("Błąd połączenia z serwerem");
  }
}
