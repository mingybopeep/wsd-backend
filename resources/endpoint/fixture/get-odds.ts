import { PrismaClient } from "@prisma/client";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { validateToken } from "../../helpers/auth";
import { makeRes } from "../../helpers/make-res";
import { validatePayload } from "../../helpers/payload-validator";

const prisma = new PrismaClient();
export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsed } = validateToken(event.headers.Authorization!);
    if (!parsed) {
      return makeRes("GET", "NOT_AUTHENETICATED", 403);
    }

    const hasPermission = await prisma.permissionAssignment.findFirst({
      where: {
        userId: parsed.userId,
        permission: {
          name: "ODDS",
        },
      },
    });
    if (!hasPermission) {
      return makeRes("GET", "NOT_AUTHORIZED", 403);
    }

    const { queryStringParameters, pathParameters } = event;
    const { fixtureId } = pathParameters!;
    const { offset, limit, fromDate, toDate } = queryStringParameters!;

    const invalidFields = validatePayload(queryStringParameters as QsPayload, [
      "fromDate",
      "toDate",
      "limit",
      "offset",
      "type",
    ]);

    if (invalidFields.length) {
      return makeRes(
        "GET",
        {
          message: "INVALID_REQUEST",
          errors: invalidFields,
        },
        400
      );
    }

    const odds = await prisma.odds.findMany({
      where: {
        fixtureId: +fixtureId!,
        timestamp: {
          gt: new Date(+fromDate!),
          lt: new Date(+toDate!),
        },
        Price: {
          some: {
            id: { gt: 0 },
          },
        },
      },
      take: +limit!,
      skip: +offset!,
      include: {
        booky: true,
        type: true,
        Price: {
          include: {
            priceName: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    return makeRes("GET", odds, 200);
  } catch (e) {
    console.error(e);
    return makeRes("GET", "INTERNAL_ERROR", 500);
  }
};
