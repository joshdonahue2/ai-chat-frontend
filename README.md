# AI Memory Agent

This is the frontend for an AI chat application with long-term memory capabilities. The application provides a user-friendly interface for interacting with an AI assistant, and it is built to be easily deployed as a containerized service.

## Features

*   **User Authentication:** Secure sign-up and sign-in functionality using Supabase Auth.
*   **Real-time Chat Interface:** A clean and responsive chat interface for communicating with the AI assistant.
*   **AI Assistant Integration:** Seamlessly connects to a webhook endpoint for processing and responding to user messages.
*   **Long-term Memory:** The AI assistant can remember previous conversations, providing a more personalized experience.
*   **Containerized Deployment:** The application is fully containerized using Docker and Docker Compose for easy setup and deployment.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

To get the application up and running locally, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/ai-memory-agent.git
    cd ai-memory-agent
    ```

2.  **Create an environment file:**

    Create a `.env` file in the root of the project by copying the example file:

    ```bash
    cp .env.example .env
    ```

3.  **Configure the environment variables:**

    Open the `.env` file and replace the placeholder values with your actual credentials:

    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
    *   `WEBHOOK_URL`: The URL of your AI assistant's webhook.
    *   `PORT`: The port on which the frontend container will be accessible (e.g., `3000`).

4.  **Build and run the application:**

    Use Docker Compose to build and start the services in detached mode:

    ```bash
    docker-compose up --build -d
    ```

5.  **Access the application:**

    Once the container is running, you can access the application in your web browser at `http://localhost:<PORT>`, where `<PORT>` is the port you specified in your `.env` file.

## Environment Variables

The following environment variables are required for the application to run:

| Variable            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`      | The URL of your Supabase project.                          |
| `SUPABASE_ANON_KEY` | The anonymous (public) key for your Supabase project.      |
| `WEBHOOK_URL`       | The URL of the webhook for the AI assistant.               |
| `PORT`              | The port to expose on the host machine for the frontend.   |

## Build Process

The frontend application is built using `esbuild`, a fast JavaScript bundler. The build process is defined in the `build.sh` script, which is executed within the `Dockerfile`.

The script bundles all the JavaScript modules from the `html/src` directory into a single file, `html/public/js/bundle.js`. It also injects the necessary environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `WEBHOOK_URL`) into the frontend code, making them accessible at runtime.

## Project Structure

Here is an overview of the most important files and directories in this repository:

```
.
├── .env.example          # Example environment file
├── build.sh              # Script for building the frontend
├── compose.yml           # Docker Compose file for orchestrating the services
├── Dockerfile            # Dockerfile for building the frontend container
├── html/                 # Contains the frontend source code
│   ├── public/           # Publicly served files (HTML, CSS, JS bundle)
│   └── src/              # JavaScript source modules
│       ├── api.js        # Handles communication with external services
│       ├── app.js        # Main application logic
│       ├── auth.js       # Manages user authentication
│       ├── state.js      # Holds the application state
│       └── ui.js         # Handles DOM manipulation
└── nginx.conf            # Nginx configuration file
```

## Further Documentation

For more detailed information about specific aspects of this project, please refer to the following documents:

- **[`agent.md`](./agent.md)**: A comprehensive guide for developers and AI agents, including the development workflow and project structure.
- **[`tech_stack.md`](./tech_stack.md)**: A detailed list of the technologies, libraries, and frameworks used in this project.
- **[`api_reference.md`](./api_reference.md)**: The API reference for the AI webhook and Supabase interactions.
- **[`project_goals.md`](./project_goals.md)**: The high-level goals and objectives of the project.
