import { PrismaClient } from "@prisma/client";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { makeRes } from "resources/helpers/make-res";
import { generateToken, validateToken } from "../../helpers/auth";

const prisma = new PrismaClient();

export const handler = async (
  event: APIGatewayEvent,
  _context
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsed } = validateToken(event.headers.Authorization!);
    if (!parsed) {
      return makeRes("POST", "NOT_AUTHORIZED", 403);
    }

    const { username } = parsed;

    const found = await prisma.user.findFirst({
      where: {
        username,
      },
    });

    if (!found) {
      return makeRes("POST", "NOT_FOUND", 404);
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
