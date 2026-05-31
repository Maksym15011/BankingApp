async function login() {
  const email = document.getElementById("email").value;

  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    localStorage.setItem("token", data.token);

    localStorage.setItem("fullName", data.fullName);

    localStorage.setItem("balance", data.balance);

    localStorage.setItem("userId", data.id);

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);

    alert("Błąd połączenia z serwerem");
  }
}

async function register() {
  const fullName = document.getElementById("fullName").value;

  const email = document.getElementById("email").value;

  const password = document.getElementById("password").value;

  if (!fullName || !email || !password) {
    alert("Wypełnij wszystkie pola");

    return;
  }

  const response = await fetch("http://localhost:5000/register", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      fullName,
      email,
      password,
    }),
  });

  const data = await response.json();

  alert(data.message);

  window.location.href = "login.html";
}
