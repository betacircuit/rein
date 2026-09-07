import {
  buildLocalDataExport,
  stringifyLocalDataExport,
} from "@/lib/data-operations/local-account";

export async function GET() {
  const bundle = await buildLocalDataExport();
  if (!bundle) return Response.json({ message: "로그인이 필요해요." }, { status: 401 });
  return new Response(stringifyLocalDataExport(bundle), {
    headers: {
      "content-disposition": 'attachment; filename="rein-export.json"',
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
