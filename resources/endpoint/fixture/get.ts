import { PrismaClient } from "@prisma/client";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { validateToken } from "../../helpers/auth";
import { makeRes } from "../../helpers/make-res";
import { validatePayload } from "../../helpers/payload-validator";

const prisma = new PrismaClient();
export const handler = async (
  event: APIGatewayEvent,
  _context
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsed } = validateToken(event.headers.Authorization!);
    if (!parsed) {
      return makeRes("GET", "NOT_AUTHENTICATED", 403);
    }

    const { queryStringParameters } = event;
    const invalidFields = validatePayload(queryStringParameters as QsPayload, [
      "offset",
      "limit",
      "fromDate",
      "toDate",
      "searchTerm",
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

    const {
      offset,
      limit,
      fromDate,
      toDate,
      searchTerm: search,
    } = queryStringParameters!;

    const searchTermObj = {
      search,
    };

    const fixtures = await prisma.fixture.findMany({
      where: {
        ...(search
          ? {
              competition: searchTermObj,
              countryName: searchTermObj,
              home: searchTermObj,
              away: searchTermObj,
            }
          : {}),
        startTime: {
          gt: new Date(+fromDate!),
          lt: new Date(+toDate!),
        },
      },
      take: +limit!,
      skip: +offset!,
      orderBy: {
        startTime: "desc",
      },
    });

    return makeRes("GET", fixtures, 200);
  } catch (e) {
    console.error(e);
    return makeRes("GET", "INTERNAL_ERROR", 500);
  }
};
