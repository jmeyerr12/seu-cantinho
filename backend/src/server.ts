import "dotenv/config"; // garante que as variáveis do .env sejam carregadas
import app from "./app.js";

// porta vinda do .env
const port = Number(process.env.PORT) || 5000;

// inicia o servidor e mostra no console
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
