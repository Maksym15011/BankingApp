function logout() {
  const confirmed = confirm("Czy na pewno chcesz się wylogować?");

  if (!confirmed) {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("userId");

  window.location.href = "login.html";
}
