// src/app/api/auth/logout/route.js
export async function POST(request) {
  try {
    return Response.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Set-Cookie": `authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC;`,
        },
      }
    );
  } catch (error) {
    console.error("Erro no logout:", error);
    return Response.json({ error: "Erro ao fazer logout" }, { status: 500 });
  }
}
