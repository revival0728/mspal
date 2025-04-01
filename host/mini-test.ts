type Router = (req: Request) => Promise<Response> | Response;
type Routes = {
  [route: string]: Router
};

function createJsonRes(body: unknown): Response {
  return Response.json(JSON.stringify(body), {
    status: 200,
  });
}

const auth: Router = async (req) => {
  console.log("auth");
  const json = await req.json();
  if(!("authKey" in json)) {
    return createJsonRes({
      success: false,
      msg: "Missing body fields"
    });
  }
  return createJsonRes({
    authKey: json.authKey,
    success: true,
  });
}

function server(routes: Routes) {
  console.log("Running server...");
  Deno.serve({
    port: 3000,
  },
  async (req): Promise<Response> => {
    const url = new URL(req.url);
    if(!(url.pathname in routes)) {
      return new Response(null, {
        status: 404
      })
    }
    return await routes[url.pathname](req);
  });
}

const hostRoutes = {
  "/auth": auth,
}

if(import.meta.main) {
  server(hostRoutes)
}
