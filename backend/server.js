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
    const { senderId, receiverId, amount } = req.body;

    const sender = await sql.query`
  SELECT *
  FROM Users
  WHERE Id = ${senderId}
`;

    const receiver = await sql.query`
      SELECT * FROM Users
      WHERE Id = ${receiverId}
    `;

    if (sender.recordset.length === 0) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    if (receiver.recordset.length === 0) {
      return res.status(404).json({
        message: "Receiver not found",
      });
    }

    if (sender.recordset[0].Balance < amount) {
      return res.status(400).json({
        message: "Insufficient funds",
      });
    }

    await sql.query`
      UPDATE Users
      SET Balance = Balance - ${amount}
      WHERE Id = ${senderId}
    `;

    await sql.query`
      UPDATE Users
      SET Balance = Balance + ${amount}
      WHERE Id = ${receiverId}
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
    ${receiverId},
    ${amount},
    'Przelew'
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
    const { senderId, amount, service } = req.body;

    const sender = await sql.query`

  SELECT *
  FROM Users
  WHERE Id = ${senderId}

`;

    if (sender.recordset[0].Balance < amount) {
      return res.status(400).json({
        message: "Insufficient funds",
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

        SELECT *
        FROM Transactions
        WHERE Id =
        ${transactionId}

      `;

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const transaction = result.recordset[0];

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transaction-${transactionId}.pdf`,
    );

    doc.pipe(res);

    doc.fontSize(20).text("Potwierdzenie Transakcji");

    doc.moveDown();

    doc.fontSize(12).text(`ID: ${transaction.Id}`);

    doc.text(`Sender: ${transaction.SenderId}`);

    doc.text(`Receiver: ${transaction.ReceiverId}`);

    doc.text(`Amount: ${transaction.Amount} PLN`);

    doc.end();
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
});
