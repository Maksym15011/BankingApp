async function loadHistory() {
  const userId = localStorage.getItem("userId");

  const response = await fetch(`http://localhost:5000/transactions/${userId}`);

  const transactions = await response.json();

  const tbody = document.getElementById("historyBody");

  tbody.innerHTML = "";

  transactions.forEach((t) => {
    const isOutgoing = t.SenderId == userId;

    const date = new Date(t.TransactionDate).toLocaleDateString("pl-PL");

    tbody.innerHTML += `

<tr>

  <td>${t.Id}</td>

  <td>
    ${t.SenderId == userId ? "Ty" : t.SenderName}
  </td>

  <td>
    ${
      t.Description && t.Description !== "Przelew"
        ? t.Description
        : t.ReceiverId == userId
          ? "Ty"
          : t.ReceiverName
    }
  </td>

  <td class="${isOutgoing ? "amount-negative" : "amount-positive"}">

    ${isOutgoing ? "-" : "+"}

    ${t.Amount} PLN

  </td>

  <td>${date}</td>

  <td>

    <button
      class="pdf-btn"
      onclick="downloadPdf(${t.Id})">

      📄 PDF

    </button>

  </td>

</tr>

`;
  });
}

loadHistory();

function downloadPdf(transactionId) {
  window.open(
    `http://localhost:5000/transaction-pdf/${transactionId}`,
    "_blank",
  );
}
