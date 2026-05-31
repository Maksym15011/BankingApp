async function loadHistory() {
  const userId = localStorage.getItem("userId");

  const response = await fetch(`http://localhost:5000/transactions/${userId}`);

  const transactions = await response.json();

  const tbody = document.getElementById("historyBody");

  tbody.innerHTML = "";

  transactions.forEach((t) => {
    const isOutgoing = t.SenderId == userId;

    tbody.innerHTML += `

            <tr>

                <td>${t.Id}</td>

                <td>${t.SenderId}</td>

                <td>${t.ReceiverId}</td>

                <td class="${
                  isOutgoing ? "amount-negative" : "amount-positive"
                }">

                    ${isOutgoing ? "-" : "+"}

                    ${t.Amount} PLN

                </td>

            </tr>

        `;
  });
}

loadHistory();
