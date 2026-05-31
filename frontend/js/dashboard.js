async function loadUser() {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    window.location.href = "login.html";

    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/user/${userId}`);

    const user = await response.json();

    document.getElementById("userName").textContent = user.FullName;

    document.getElementById("balance").textContent = user.Balance;
  } catch (error) {
    console.error(error);
  }
}

function logout() {
  localStorage.clear();

  window.location.href = "login.html";
}

async function loadRecentTransactions() {
  const userId = localStorage.getItem("userId");

  const response = await fetch(`http://localhost:5000/transactions/${userId}`);

  const transactions = await response.json();

  const container = document.getElementById("recentTransactions");

  container.innerHTML = "";

  transactions.slice(0, 3).forEach((t) => {
    const isOutgoing = t.SenderId == userId;

    container.innerHTML += `

                <div class="transaction-item">

                    ${isOutgoing ? "💸 Wysłano" : "💰 Otrzymano"}

                    <strong>

                        ${isOutgoing ? "-" : "+"}

                        ${t.Amount} PLN

                    </strong>

                </div>

            `;
  });
}

loadUser();
loadRecentTransactions();
