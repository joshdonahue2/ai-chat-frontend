# AI Chat Agent Documentation

This document provides an overview of the AI Chat Agent project, its structure, and how to get started with development in a standard Linux environment.

## Project Overview

This project is a web-based AI chat application. The frontend is built with HTML, CSS, and JavaScript, and it interacts with an AI backend (the specifics of which are not detailed in this document).

## Repository Structure

The repository is organized as follows:

- **`ai-chat-frontend/`**: This directory contains all the files related to the frontend application.
  - **`html/`**: The source code for the frontend application resides here.
    - **`public/`**: Contains the static assets like `index.html`, CSS, and images.
    - **`src/`**: Contains the JavaScript source code.
    - **`package.json`**: Defines the Node.js dependencies and scripts for the frontend project.
  - **`Dockerfile`**: Defines the Docker image for building and deploying the frontend application.
  - **`compose.yml`**: Docker Compose file for running the application.
  - **`nginx.conf`**, **`default.conf`**: Nginx configuration for serving the frontend.
- **`README.md`**: The main README file for the project.
- **`agent.md`**: This file, providing detailed documentation about the project.

## Getting Started

To get started with this project, you'll need to have Node.js and npm installed on your Linux machine.

1.  **Navigate to the frontend's source directory:**
    ```bash
    cd ai-chat-frontend/html
    ```

2.  **Install the dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

This will start a development server. You can typically view the application by opening a web browser and navigating to `http://localhost:8080` or a similar address, depending on the project's configuration.

## Building for Production

To create a production-ready build of the application, you can run:

```bash
npm run build
```

This will generate a `dist` folder (or similar) with the optimized and minified assets for deployment.

## Deployment with Docker

For a more robust deployment, you can use the provided Docker configuration.

1.  **Build the Docker image:**
    ```bash
    docker build -t ai-chat-frontend .
    ```

2.  **Run the application using Docker Compose:**
    ```bash
    docker-compose up -d
    ```

This will start the application in a detached container, and it will be served by Nginx as defined in the configuration files.

## Information for LLM Assistants

This section contains information specifically for Large Language Model assistants to help them understand and work on this project efficiently.

- **Main Source Code**: The primary frontend source code is located in the `ai-chat-frontend/html/src/` directory.
- **Dependencies**: Frontend dependencies are managed in `ai-chat-frontend/html/package.json`. To install them, navigate to `ai-chat-frontend/html` and run `npm install`.
- **Development Server**: To run the development server, navigate to `ai-chat-frontend/html` and run `npm run dev`.
- **API Communication**: The logic for communicating with the AI backend is in `ai-chat-frontend/html/src/api.js`.
- **Project Goals**: The high-level goals of the project are documented in `project_goals.md`.
- **Tech Stack**: The technologies used in this project are listed in `tech_stack.md`.
- **API Reference**: The API reference for the backend is in `api_reference.md`.
