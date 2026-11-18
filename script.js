
catch (error) {
  loading.remove();

  addMessage(
    "Error: " + error.message,
    "bot"
  );

  history.pop();
  console.error(error);
} finally {
  send.disabled = false;
  input.focus();
}