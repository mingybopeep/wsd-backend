const mockValidateToken = jest.fn();
jest.mock("../../helpers/auth", () => ({
  validateToken: mockValidateToken,
}));

const mockPrismaFindMany = jest.fn();
const mockPrismaFindFirst = jest.fn();
const mockPrimsa = jest.fn();
mockPrimsa.mockImplementation(() => ({
  permissionAssignment: {
    findFirst: mockPrismaFindFirst,
  },
  odds: {
    findMany: mockPrismaFindMany,
  },
}));
jest.mock("@prisma/client", () => ({
  PrismaClient: mockPrimsa,
}));

const mockValidatePayload = jest.fn();
jest.mock("../../helpers/payload-validator", () => ({
  validatePayload: mockValidatePayload,
}));

import { APIGatewayEvent } from "aws-lambda";
import { handler } from "./get-odds";

describe("get-odds", () => {
  const mockEvent: APIGatewayEvent = {
    headers: {
      Authorization: "dummy-auth-token",
    },
    pathParameters: {
      fixtureId: "10",
    },
    queryStringParameters: {
      offset: "0",
      limit: "50",
      fromDate: "2023-10-10",
      toDate: "2023-10-11",
    },
  } as unknown as APIGatewayEvent;

  const dummyToken = {
    parsed: {
      userId: "dummy-id",
    },
  };

  const dummyFindManyResult = [{ mock: "true" }];
  const dummyFindFirstResult = { mock: "true" };

  beforeEach(() => {
    jest.clearAllMocks();

    mockValidateToken.mockImplementation(() => dummyToken);
    mockPrismaFindMany.mockImplementation(() => dummyFindManyResult);
    mockPrismaFindFirst.mockImplementation(() => dummyFindFirstResult);
    mockValidatePayload.mockImplementation(() => []);
  });

  describe("success cases", () => {
    it("calls validateToken", async () => {
      await handler(mockEvent);

      expect(mockValidateToken).toHaveBeenCalledWith(
        mockEvent.headers.Authorization
      );
    });

    it("calls primsa findFirst", async () => {
      await handler(mockEvent);

      const expected = {
        where: {
          userId: dummyToken.parsed.userId,
          permission: {
            name: "ODDS",
          },
        },
      };

      expect(mockPrismaFindFirst).toHaveBeenCalledWith(expected);
    });

    it("calls validateToken", async () => {
      await handler(mockEvent);

      const expected1 = mockEvent.queryStringParameters;
      const expected2 = ["fromDate", "toDate", "limit", "offset", "type"];

      expect(mockValidatePayload).toHaveBeenCalledWith(expected1, expected2);
    });

    it("calls prismaFindMany", async () => {
      await handler(mockEvent);

      const expected = {
        take: +mockEvent.queryStringParameters!.limit!,
        skip: +mockEvent.queryStringParameters!.offset!,
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
      };

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining(expected)
      );
    });

    it("returns expected response JSON", async () => {
      const res = await handler(mockEvent);

      const expected = {
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": `"OPTIONS", "GET"`,
        },
        statusCode: 200,
        body: JSON.stringify(dummyFindManyResult),
      };

      expect(res).toEqual(expected);
    });
  });

  describe("error cases", () => {
    it("responds with 403 when permissions missing", async () => {
      mockPrismaFindFirst.mockImplementationOnce(() => null);

      const res = await handler(mockEvent);

      const expected = {
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": `"OPTIONS", "GET"`,
        },
        statusCode: 403,
        body: '"NOT_AUTHORIZED"',
      };

      expect(res).toEqual(expected);
    });

    it("responds with 400 when invalid payload", async () => {
      mockValidatePayload.mockImplementationOnce(() => ["example error"]);

      const res = await handler(mockEvent);

      const expected = {
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": `"OPTIONS", "GET"`,
        },
        statusCode: 400,
        body: JSON.stringify({
          message: "INVALID_REQUEST",
          errors: ["example error"],
        }),
      };

      expect(res).toEqual(expected);
    });

    it.each([
      { mock: mockValidateToken, label: "validateToken" },
      { mock: mockPrismaFindMany, label: "findMany" },
      { mock: mockPrismaFindFirst, label: "findFirst" },
      { mock: mockValidatePayload, label: "validateToken" },
    ])("responds 500 when $label throws", async ({ mock }) => {
      mock.mockImplementationOnce(() => {
        throw new Error("Some error");
      });

      const expected = {
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": `"OPTIONS", "GET"`,
        },
        statusCode: 500,
        body: '"INTERNAL_ERROR"',
      };

      const res = await handler(mockEvent);

      expect(res).toEqual(expect.objectContaining(expected));
    });
  });
});
