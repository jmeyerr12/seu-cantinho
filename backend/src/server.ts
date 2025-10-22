import "dotenv/config"; // garante que as variáveis do .env sejam carregadas
import app from "./app.js"; // importa o app principal (Express, por exemplo)

// porta vinda do .env (ou 3000 por padrão)
const port = Number(process.env.PORT) || 5000;

// inicia o servidor e mostra no console
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
