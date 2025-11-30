# Seu Cantinho – Sistema de Reservas de Espaços

Este projeto é composto por três partes principais:

- Backend (Node.js/Express)
- Frontend (Next.js)
- Infraestrutura (PostgreSQL e MinIO para armazenamento de imagens)

Toda a aplicação pode ser executada de forma integrada usando Docker Compose.

---

## 1. Execução Completa com Docker Compose

### Subir tudo

No diretório raiz do projeto:

```bash
docker compose up -d
````

Serviços iniciados:

* `seu-cantinho-api` (backend)
* `seu-cantinho-interface` (frontend)
* `seu_cantinho_db` (PostgreSQL)
* `seu-cantinho-minio` (armazenamento S3)
* `seu-cantinho-minio-setup` (criação de bucket e usuário)

### Acessos

| Serviço       | URL                                            |
| ------------- | ---------------------------------------------- |
| Frontend      | [http://localhost:3001](http://localhost:3001) |
| Backend       | [http://localhost:5000](http://localhost:5000) |
| MinIO Console | [http://localhost:9001](http://localhost:9001) |

---

## 2. Estrutura do Docker Compose

O ambiente utiliza:

```yaml
networks:
  seu-cantinho-network:
    driver: bridge

volumes:
  postgres_data:
  minio_data:
```

Serviços existentes:

* Backend (porta 5000)
* Frontend (porta 3001)
* PostgreSQL (porta 5431 → 5432 interno)
* MinIO (portas 9000 e 9001)
* Setup automático do bucket e do usuário S3

---

## 3. Variáveis de Ambiente

### Backend (`.env.example`)

```ini
PORT=5000
JWT_KEY="EuQueroFracassarDuasVezesHoje"

PGHOST=db
PGPORT=5432
PGUSER=seucantinho
PGPASSWORD=seucantinho
PGDATABASE=seucantinho

S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=appkey
S3_SECRET_ACCESS_KEY=appsecret
S3_PHOTO_BUCKET=photos
```

Para rodar fora do Docker Compose:

```
S3_ENDPOINT=http://127.0.0.1:9000
```

### Frontend (`.env.local`)

```ini
BACKEND_URL=http://localhost:5000
```

---

## 4. Executar Backend e Frontend Separados (Sem Docker)

### Backend

No diretório `backend`:

```bash
pnpm install
pnpm start
```

### Frontend

No diretório `frontend`:

```bash
pnpm install
pnpm dev
```

Ou produção:

```bash
pnpm build
pnpm start
```

### Observação

Para o backend funcionar fora do Docker, é necessário ter o PostgreSQL e o MinIO rodando localmente.

---

## 5. Criando um Usuário Administrador

A criação de administradores não é exposta pela API. O fluxo recomendado é:

1. Registrar um usuário normalmente pelo frontend.
2. Acessar o container do PostgreSQL:

```bash
docker exec -it seu_cantinho_db psql -U seucantinho -d seucantinho
```

3. Atualizar o papel do usuário:

```sql
UPDATE users SET role = 'admin' WHERE email = 'email_do_usuario';
```

### Permissões de administrador

Um usuário administrador pode:

* criar filiais
* aprovar pagamentos
* criar espaços
* enviar fotos para os espaços
* editar informações dos espaços e filiais

---

## 6. Banco de Dados

O PostgreSQL executa automaticamente o arquivo:

```
./database/init.sql
```

O volume persistente utilizado:

```
postgres_data
```

---

## 7. Armazenamento de Imagens (MinIO)

O MinIO está disponível em:

* [http://localhost:9000](http://localhost:9000) (API S3)
* [http://localhost:9001](http://localhost:9001) (console administrativo)

O serviço `minio-setup` cria automaticamente:

* o bucket `photos`
* o usuário S3 `appkey/appsecret`
* permissões de acesso `readwrite`

As imagens enviadas pelo backend são armazenadas nesse bucket.

---

## 8. Estrutura de Pastas

```
.
├── backend
│   ├── src
│   ├── prisma
│   ├── Containerfile
│   └── .env.example
├── frontend
│   ├── app
│   ├── public
│   ├── Containerfile
│   └── .env.local
├── database
│   └── init.sql
├── docker-compose.yml
└── README.md
```

---

## 9. Comandos Úteis

### Parar os serviços

```bash
docker compose down
```

### Reconstruir imagens

```bash
docker compose build
```

### Ver logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
docker compose logs -f minio
```
