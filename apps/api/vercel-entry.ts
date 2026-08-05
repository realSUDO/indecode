import http from "node:http";
import { app as expressApplication } from "./src/server";
import { initSocket } from "./src/socket";

// Create HTTP server and initialize Socket.IO
const server = http.createServer(expressApplication);
initSocket(server);

// Export the server for Vercel (Vercel's Node.js runtime takes over listening)
export default server;
