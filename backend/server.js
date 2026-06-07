const PDFDocument = require("pdfkit");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sql = require("mssql");

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,

  options: {
    trustServerCertificate: true,
    trustedConnection: true,
  },

  authentication: {
    type: "default",
  },
};

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await sql.query`
      SELECT * FROM Users
      WHERE Email = ${email}
    `;

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        message: "Nieprawidłowy email lub hasło",
      });
    }

    const isValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isValid) {
      return res.status(401).json({
        message: "Nieprawidłowy email lub hasło",
      });
    }

    const token = jwt.sign(
      {
        id: user.Id,
        email: user.Email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      token,
      id: user.Id,
      fullName: user.FullName,
      balance: user.Balance,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await sql.query`
      SELECT * FROM Users
      WHERE Email = ${email}
    `;

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const bcrypt = require("bcrypt");

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await sql.query`

      INSERT INTO Users
      (
        FullName,
        Email,
        PasswordHash,
        Balance
      )
      OUTPUT INSERTED.Id
      VALUES
      (
        ${fullName},
        ${email},
        ${hashedPassword},
        1000
      )

    `;

    const userId = result.recordset[0].Id;

    const cardNumber = `5274 ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`;

    const expiryDate = "12/30";

    const cvv = String(Math.floor(Math.random() * 900 + 100));

    await sql.query`

      INSERT INTO Cards
      (
        UserId,
        CardNumber,
        ExpiryDate,
        CVV
      )
      VALUES
      (
        ${userId},
        ${cardNumber},
        ${expiryDate},
        ${cvv}
      )

    `;

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/balance/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await sql.query`
      SELECT Balance
      FROM Users
      WHERE Id = ${userId}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/user/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await sql.query`
            SELECT
                Id,
                FullName,
                Email,
                Balance
            FROM Users
            WHERE Id = ${id}
        `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/transfer", async (req, res) => {
  try {
    const { senderId, cardNumber, amount, note } = req.body;

    const cleanCardNumber = cardNumber.trim();

    if (!cleanCardNumber) {
      return res.status(400).json({
        message: "Podaj numer karty odbiorcy",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Kwota musi być większa od 0",
      });
    }

    const sender = await sql.query`

        SELECT *
        FROM Users
        WHERE Id = ${senderId}

      `;

    if (sender.recordset.length === 0) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    const receiverCard = await sql.query`

        SELECT *
        FROM Cards
        WHERE CardNumber =
        ${cleanCardNumber}

      `;

    if (receiverCard.recordset.length === 0) {
      return res.status(404).json({
        message: "Karta odbiorcy nie istnieje",
      });
    }

    const receiverId = receiverCard.recordset[0].UserId;

    if (Number(receiverId) === Number(senderId)) {
      return res.status(400).json({
        message: "Nie możesz wykonać przelewu na własną kartę",
      });
    }

    const receiver = await sql.query`

        SELECT *
        FROM Users
        WHERE Id =
        ${receiverId}

      `;

    if (sender.recordset[0].Balance < amount) {
      return res.status(400).json({
        message: "Nie masz wystarczających środków do wykonania tej operacji",
      });
    }

    await sql.query`

      UPDATE Users

      SET Balance =
      Balance - ${amount}

      WHERE Id =
      ${senderId}

    `;

    await sql.query`

      UPDATE Users

      SET Balance =
      Balance + ${amount}

      WHERE Id =
      ${receiverId}

    `;

    await sql.query`

      INSERT INTO Transactions
      (
        SenderId,
        ReceiverId,
        Amount,
        Description,
        Note
      )
      VALUES
      (
        ${senderId},
        ${receiverId},
        ${amount},
        'Przelew',
        ${note || ""}
      )

    `;

    res.json({
      message: "Transfer successful",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/transactions/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await sql.query`

      SELECT

        T.Id,
        T.Amount,
        T.TransactionDate,
        T.Description,
        T.Note,

        T.SenderId,
        T.ReceiverId,

        Sender.FullName AS SenderName,
        Receiver.FullName AS ReceiverName

      FROM Transactions T

      INNER JOIN Users Sender
      ON T.SenderId = Sender.Id

      INNER JOIN Users Receiver
      ON T.ReceiverId = Receiver.Id

      WHERE

        T.SenderId = ${id}

        OR

        T.ReceiverId = ${id}

      ORDER BY

        T.TransactionDate DESC

    `;

    res.json(result.recordset);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

async function connectDB() {
  try {
    await sql.connect({
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,

      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });

    console.log("Connected to SQL Server");
  } catch (err) {
    console.error("Database error:", err);
  }
}

app.get("/", (req, res) => {
  res.send("Banking API is running");
});

app.get("/users", async (req, res) => {
  try {
    const result = await sql.query`
            SELECT * FROM Users
        `;

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

connectDB();

app.listen(process.env.PORT, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});

app.get("/card/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await sql.query`

      SELECT *
      FROM Cards
      WHERE UserId = ${userId}

    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Card not found",
      });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/payment", async (req, res) => {
  try {
    const { senderId, amount, service, cvv } = req.body;

    const sender = await sql.query`

  SELECT *
  FROM Users
  WHERE Id = ${senderId}

`;
    const card = await sql.query`

  SELECT *
  FROM Cards
  WHERE UserId = ${senderId}

`;

    if (card.recordset.length === 0) {
      return res.status(404).json({
        message: "Card not found",
      });
    }

    if (card.recordset[0].CVV !== cvv) {
      return res.status(400).json({
        message: "Nieprawidłowy CVV",
      });
    }

    if (sender.recordset[0].Balance < amount) {
      return res.status(400).json({
        message: "Nie masz wystarczających środków do wykonania tej operacji",
      });
    }

    await sql.query`

      UPDATE Users
      SET Balance =
      Balance - ${amount}
      WHERE Id =
      ${senderId}

    `;

    await sql.query`

  INSERT INTO Transactions
  (
    SenderId,
    ReceiverId,
    Amount,
    Description
  )
  VALUES
  (
    ${senderId},
    10,
    ${amount},
    ${service}
  )

`;

    res.json({
      message: "Payment successful",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/transaction-pdf/:id", async (req, res) => {
  try {
    const transactionId = req.params.id;

    const result = await sql.query`

SELECT

  T.Id,
  T.Amount,
  T.TransactionDate,
  T.Description,
  T.Note,

  Sender.FullName AS SenderName,
  Receiver.FullName AS ReceiverName

FROM Transactions T

INNER JOIN Users Sender
ON T.SenderId = Sender.Id

INNER JOIN Users Receiver
ON T.ReceiverId = Receiver.Id

WHERE T.Id = ${transactionId}

`;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const transaction = result.recordset[0];

    const doc = new PDFDocument({
      margin: 50,
    });

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transaction-${transactionId}.pdf`,
    );

    doc.pipe(res);

    doc.fontSize(26).fillColor("#003366").text("NOVA BANK", {
      align: "center",
    });

    doc.moveDown(0.5);

    doc.fontSize(18).fillColor("black").text("Potwierdzenie Transakcji", {
      align: "center",
    });

    doc.moveDown(2);

    doc.rect(50, 150, 500, 250).stroke();

    const date = new Date(transaction.TransactionDate).toLocaleDateString(
      "pl-PL",
    );

    doc.fontSize(12).text(`Numer transakcji: ${transaction.Id}`, 70, 180);

    doc.text(`Data: ${date}`);

    doc.moveDown();

    doc.text(`Nadawca: ${transaction.SenderName}`);

    doc.moveDown();

    if (transaction.Description && transaction.Description !== "Przelew") {
      doc.text(`Usługa: ${transaction.Description}`);
    } else {
      doc.text(`Odbiorca: ${transaction.ReceiverName}`);
    }

    doc.moveDown();

    doc.text(`Kwota: ${transaction.Amount} PLN`);

    if (transaction.Note) {
      doc.moveDown();

      doc.text(`Tytuł: ${transaction.Note}`);
    }

    doc.moveDown(2);

    doc.fillColor("green").fontSize(14).text("Status: Zrealizowano");

    doc.moveDown(3);

    doc
      .fillColor("gray")
      .fontSize(10)
      .text("Dokument wygenerowany automatycznie przez NOVA BANK.", {
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});
