# @threadline/server

Threadline Review Server - Processes expert reviews.

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3000
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Docker

```bash
docker build -t threadline-server .
docker run -p 3000:3000 threadline-server
```

## API

POST `/api/threadline-check`

See technical plan for API details.

