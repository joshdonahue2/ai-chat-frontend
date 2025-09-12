# API Reference

This document provides a reference for the APIs used by the AI Chat Agent frontend. The application communicates with two main services: a **Supabase Backend** for user authentication and data, and an **AI Webhook** for processing chat messages.

---

## AI Webhook

The AI webhook is the core of the chat functionality. The frontend sends user messages to this endpoint and receives AI-generated responses.

### `POST {WEBHOOK_URL}`

This endpoint is used to send a message to the AI and receive a response. The `WEBHOOK_URL` is configured via environment variables.

**Request Body:**

The request body is a JSON object containing the current message, user ID, conversation ID, and the recent conversation history.

```json
{
  "message": "Hello, what's the weather like today?",
  "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "conversation_id": "conv-98765",
  "conversation_history": [
    {
      "role": "user",
      "content": "Hi there!"
    },
    {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  ]
}
```

**Response Body:**

The response body is a JSON object containing the AI's response.

```json
{
  "response": "I'm not equipped to check the weather, but I can help you with other things!"
}
```

---

## Supabase API

The application uses Supabase for user authentication and storing user profiles. The Supabase URL and anonymous key are configured via environment variables.

### User Profile

#### Fetch User Profile

- **Method**: `GET`
- **Table**: `profiles`
- **Query**: `select('full_name').eq('id', userId).single()`

This query retrieves the `full_name` of the user whose `id` matches the current user's ID.

**Example Response Body:**

```json
{
  "full_name": "Jane Doe"
}
```

### Authentication

User authentication (sign-up, sign-in, sign-out) is handled using the `@supabase/supabase-js` library, which interacts with the Supabase authentication endpoints. Refer to the [official Supabase documentation](https://supabase.com/docs/reference/javascript/auth-signup) for detailed information on these functions.
