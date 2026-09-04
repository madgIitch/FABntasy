import { createServer } from 'node:http';
const port = Number(process.env.PORT || 3000);
createServer((_req, res) => { res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); res.end('<!doctype html><title>FABntasy</title><main><h1>FABntasy</h1><p>Foundation shell ready.</p></main>'); }).listen(port, () => console.log(`FABntasy web shell listening on ${port}`));
