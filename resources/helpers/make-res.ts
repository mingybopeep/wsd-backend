export const makeRes = (
  method: "GET" | "POST",
  body: any,
  statusCode: number
) => ({
  headers: {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": `"OPTIONS", "${method}"`,
  },
  statusCode: statusCode,
  body: JSON.stringify(body),
});
