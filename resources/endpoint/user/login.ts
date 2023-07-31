import { PrismaClient } from "@prisma/client";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { scryptSync } from "crypto";
import { generateToken } from "../../helpers/auth";
import { makeRes } from "../../helpers/make-res";

const prisma = new PrismaClient();
export const handler = async (
  event: APIGatewayEvent,
  _context
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body!);

    const { username, password } = body;

    const found = await prisma.user.findFirst({
      where: {
        username,
      },
    });

    if (!found) {
      return makeRes("POST", "NOT_FOUND", 404);
    }

    const hashed = scryptSync(password, found.salt, 32).toString("hex");

    if (hashed !== found.password) {
      return makeRes("POST", "UNAUTHORIZED", 401);
    }

    const payload = {
      token: generateToken(found.email, username, found.id),
      username: found.username,
      userId: found.id,
    };

    return makeRes("POST", payload, 200);
  } catch (e) {
    console.error(e);
    return makeRes("POST", "INTERNAL_ERROR", 500);
  }
};