# `@shoprag/genius`

**The Genius System** is a powerful, flexible AI-driven conversational system designed to facilitate the creation and deployment of specialized AI assistants, or "Geniuses." While it comes with two default Geniuses—`bitgenius` and `poetic-bitgenius`—the true strength of this system lies in its ability to support *any type* of Genius you can imagine. Whether you're building an assistant for blockchain, poetry, or any other domain, `@shoprag/genius` provides the infrastructure to bring your vision to life.

This system is built with developers in mind, offering a robust set of features, including support for multiple AI providers, customizable prompt data, and a fully configurable environment. We welcome contributions to expand the ecosystem with new Geniuses and enhancements—PRs are always welcome!

## Features

- **Multiple AI Providers**: Seamlessly switch between AI providers like OpenAI and Ollama, with support for more via custom implementations.
- **Customizable Geniuses**: Define your own Genius with custom system prompts and context prefixes using JSON configuration files.
- **User Authentication**: Secure user registration and login with email verification, powered by Sendgrid.
- **Conversational Management**: Create, manage, and delete conversations with ease.
- **Streaming Support**: Real-time streaming of AI responses for a dynamic user experience.
- **Configurable Logging**: Tailor logging levels to your needs, from debug to critical.
- **Database Flexibility**: Use SQLite by default or configure for MySQL or other databases via Knex.
- **Rate Limiting**: Protect your server with built-in rate limiting.
- **Input Sanitization**: Automatic sanitization of inputs to prevent XSS attacks.

## Installation

To get started, install `@shoprag/genius` globally using npm or yarn:

```bash
npm install -g @shoprag/genius
```

or

```bash
yarn global add @shoprag/genius
```

## Configuration

`@shoprag/genius` can be configured using command-line flags, environment variables, or a combination of both. Command-line flags take precedence over environment variables.

### Essential Configuration Options

- **`--port <port>`**: The port on which the server will listen (default: `3000`).
- **`--ai-provider <provider>`**: The AI provider to use (`openai` or `ollama`).
- **`--openai-api-key <key>`**: API key for OpenAI (required if using OpenAI).
- **`--openai-base-url <url>`**: Base URL for OpenAI API (default: `https://api.openai.com/v1`).
- **`--openai-model <model>`**: OpenAI model to use (default: `gpt-4o`).
- **`--ollama-base-url <url>`**: Base URL for Ollama API (default: `http://localhost:11434`).
- **`--ollama-model <model>`**: Ollama model to use (default: `llama2`).
- **`--universe-url <url>`**: URL of the Universe API.
- **`--universe-bearer <token>`**: Bearer token for Universe API authentication.
- **`--jwt-secret <secret>`**: Secret key for JWT authentication.
- **`--sendgrid-api-key <key>`**: API key for Sendgrid email services.
- **`--sendgrid-from-email <email>`**: Verified sender email for Sendgrid (e.g., `noreply@yourdomain.com`).
- **`--genius <genius>`**: The Genius preset to use (`bitgenius`, `poetic-bitgenius`, or `custom`).
- **`--custom-genius-json <path>`**: Path to a custom Genius JSON file (required if `--genius=custom`).

### Database Configuration

- **`--db-type <type>`**: Database type (`sqlite` or `mysql`, default: `sqlite`).
- **`--db-file <file>`**: Path to SQLite database file (default: `./db.sqlite`).
- **`--db-host <host>`**: Database host (for MySQL).
- **`--db-user <user>`**: Database user (for MySQL).
- **`--db-password <password>`**: Database password (for MySQL).
- **`--db-name <name>`**: Database name (for MySQL).

### Logging and Miscellaneous

- **`--log-level <level>`**: Logging level (`debug`, `info`, `critical`, default: `info`).

### Setup Wizard

If essential configurations (like API keys or the JWT secret) are missing, a setup wizard will guide you through providing the necessary details. The wizard will create a `.env` file in the current working directory with your inputs.

#### Example `.env` File
```env
PORT=3000
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
JWT_SECRET=your-secret-key
```

## Usage

### Starting the Server

To start the Genius server, run:

```bash
genius
```

If you haven’t configured the system yet, the setup wizard will prompt you for the required information.

### Registering a User

To register a new user, send a POST request to `/register` with the user’s email and password:

```bash
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d '{"email": "user@example.com", "password": "strongpassword"}'
```

The user will receive a verification email with a code that must be used to verify their email.

### Verifying Email

To verify the email, send a POST request to `/verify` with the email and verification code:

```bash
curl -X POST http://localhost:3000/verify -H "Content-Type: application/json" -d '{"email": "user@example.com", "code": "ABC123"}'
```

### Logging In

Once verified, log in by sending a POST request to `/login`:

```bash
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{"email": "user@example.com", "password": "strongpassword"}'
```

You will receive a JWT token in the response, which must be included in the `Authorization` header for authenticated requests (e.g., `Authorization: Bearer <token>`).

### Creating a Conversation

To create a new conversation, send a POST request to `/convo` with the conversation title:

```bash
curl -X POST http://localhost:3000/convo -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"title": "My First Convo"}'
```

### Sending a Message

To send a message in a conversation, send a POST request to `/send/<convo_id>`:

```bash
curl -X POST http://localhost:3000/send/1 -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"message": "Hello, Genius!", "stream": true}'
```

Set `"stream": true` to receive real-time streaming responses via Server-Sent Events (SSE).

### Deleting a Conversation

To delete a conversation, send a DELETE request to `/convo/<convo_id>`:

```bash
curl -X DELETE http://localhost:3000/convo/1 -H "Authorization: Bearer <token>"
```

To delete all conversations, use `/convo/all`:

```bash
curl -X DELETE http://localhost:3000/convo/all -H "Authorization: Bearer <token>"
```

## API Documentation

Below is a comprehensive list of all available API endpoints, including their parameters and expected responses.

### `POST /register`
- **Description**: Registers a new user.
- **Parameters**:
  - `email` (string, required): User’s email.
  - `password` (string, required): User’s password.
- **Response**:
  - `200`: `{ "message": "User registered, please check your email for verification code" }`
  - `400`: `{ "message": "Error message" }`

### `POST /verify`
- **Description**: Verifies a user’s email.
- **Parameters**:
  - `email` (string, required): User’s email.
  - `code` (string, required): Verification code from email.
- **Response**:
  - `200`: `{ "message": "Email verified successfully" }`
  - `400`: `{ "message": "Invalid or expired code" }`

### `POST /resend-verification`
- **Description**: Resends the verification code to the user’s email.
- **Parameters**:
  - `email` (string, required): User’s email.
- **Response**:
  - `200`: `{ "message": "Verification code resent" }`
  - `400`: `{ "message": "Error message" }`

### `POST /login`
- **Description**: Logs in a user and returns a JWT token.
- **Parameters**:
  - `email` (string, required): User’s email.
  - `password` (string, required): User’s password.
- **Response**:
  - `200`: `{ "message": "Logged in successfully", "token": "jwt_token" }`
  - `400`: `{ "message": "Invalid credentials" }`

### `POST /convo`
- **Description**: Creates a new conversation.
- **Parameters**:
  - `title` (string, required): Conversation title.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  - `200`: `{ "message": "Conversation created successfully", "id": "convo_id" }`
  - `401`: `{ "message": "Token required" }`

### `GET /convos`
- **Description**: Retrieves all conversations for the authenticated user.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  - `200`: Array of conversation objects (e.g., `[{ "id": "1", "title": "My First Convo" }]`)
  - `401`: `{ "message": "Token required" }`

### `GET /convo/:id`
- **Description**: Retrieves messages for a specific conversation.
- **Parameters**:
  - `id` (string, required): Conversation ID.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  - `200`: Array of message objects (e.g., `[{ "sender": "user", "content": "Hello" }, { "sender": "genius", "content": "Hi there!" }]`)
  - `404`: `{ "message": "Conversation not found" }`

### `POST /send/:id`
- **Description**: Sends a message in a conversation and receives a response from the Genius.
- **Parameters**:
  - `message` (string, required): User’s message.
  - `subject` (string, optional): Subject for context.
  - `exclusive` (boolean, optional): Use exclusive context (default: `false`).
  - `fast` (boolean, optional): Use a faster but less accurate model (default: `false`).
  - `responseLength` (number, optional): Desired response length in characters.
  - `stream` (boolean, optional): Enable streaming response (default: `false`).
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  - `200`: `{ "response": "Genius response" }` (non-streaming) or SSE events (streaming).
  - `404`: `{ "message": "Conversation not found" }`

### `DELETE /convo/:id`
- **Description**: Deletes a conversation or all conversations if `id` is `"all"`.
- **Parameters**:
  - `id` (string, required): Conversation ID or `"all"`.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response**:
  - `200`: `{ "message": "Conversation deleted successfully" }`
  - `404`: `{ "message": "Conversation not found" }`

## Contributing

We welcome contributions to `@shoprag/genius`! Whether you’re adding a new Genius, improving existing features, or fixing bugs, your input is valuable.

### How to Contribute

1. **Fork the Repository**: Start by forking the project on GitHub.
2. **Create a Branch**: Create a new branch for your feature or bugfix (e.g., `feature/new-genius`).
3. **Make Changes**: Implement your changes, ensuring they align with the project’s coding standards.
4. **Test**: Thoroughly test your changes to ensure they work as expected.
5. **Submit a Pull Request**: Open a PR with a clear description of your changes and why they’re needed.

### Adding a New Genius

To add a new Genius:
- Create a JSON file with the following structure:
  ```json
  {
    "systemPrompt": "You are a helpful assistant specialized in [domain].",
    "contextPrefix": "Providing context for [domain]: "
  }
  ```
- Specify the path to this file using `--custom-genius-json` when starting the server.
- Submit a PR with your new Genius file and any related code changes.

We can’t wait to see what amazing Geniuses you’ll bring to the world!

## License

This project is licensed under the MIT License.
