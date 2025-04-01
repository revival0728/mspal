import { setupSocket } from "@/host/socket.ts";
import { Router } from "@/type.d.ts";

function createJsonRes(body: unknown): Response {
  return Response.json(JSON.stringify(body), {
    status: 200,
  });
}

const auth: Router = async (host, req) => {
  const json = await req.json();
  if(!("authKey" in json) || !("clientId" in json)) {
    return createJsonRes({
      success: false,
      msg: "Missing body fields"
    });
  }
  const { authKey, clientId } = json;
  host.stdout(`client@${clientId} trying to authenticate`);
  if(host.existAuth(clientId)) {
    return createJsonRes({
      success: false,
      reGenId: null,
    })
  }
  if(!host.auth(authKey, clientId)) {
    return createJsonRes({
      success: false,
      msg: "Authentication Failed.",
    });
  }
  return createJsonRes({
    success: true,
  });
}

const connect: Router = async (host, req) => {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  if(clientId === null) {
    return new Response(null, { status: 403 });
  }
  if(!await host.checkAuth(clientId)) {
    return new Response(null, { status: 403 });
  }
  if(req.headers.get("upgrade") !== "websocket") {
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  setupSocket(host, socket, clientId);

  return response;
}

const hostRoutes = {
  "/connect": connect,
  "/auth": auth,
}

export default hostRoutes;
