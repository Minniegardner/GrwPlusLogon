# GTopia Login

Express login server for GTopia, deployable to a regular Node process, Vercel, or Netlify.

## Local development

```bash
npm install
npm run dev
```

The server runs on `http://localhost:3000` (or the `PORT` environment variable).

## Deployment

### Vercel

Import the repository into Vercel and deploy with the default settings. The included
`vercel.json` routes all requests to the Express entry point.

### Netlify

Import the repository into Netlify and deploy with the default settings. The included
`netlify.toml` and `netlify/functions/server.js` configure the Express app as a
serverless function.