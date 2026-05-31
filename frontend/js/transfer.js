async function makeTransfer() {
  const senderId = localStorage.getItem("userId");

  const receiverId = document.getElementById("receiverId").value;

  const amount = document.getElementById("amount").value;

  try {
    const response = await fetch("http://localhost:5000/transfer", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        senderId,
        receiverId,
        amount,
      }),
    });

    const data = await response.json();

    alert(data.message);

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);
  }
}
