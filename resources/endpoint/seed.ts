import { PrismaClient } from "@prisma/client";
import { scryptSync } from "crypto";
import bookmakers from "../assets/bookmakers.json";
import odds from "../assets/odds.json";
import fixtures from "../assets/fixtures.json";

const prisma = new PrismaClient();
export const handler = async (): Promise<void> => {
  try {
    await prisma.$transaction(
      async (tx) => {
        // seed user
        const salt = Date.now().toString();
        await tx.user.create({
          data: {
            username: "free",
            email: "freeuser@gmail.com",
            password: scryptSync("password123", salt, 32).toString("hex"),
            salt: salt,
          },
        });
        const user2 = await tx.user.create({
          data: {
            username: "paid",
            email: "paiduser@gmail.com",
            password: scryptSync("password123", salt, 32).toString("hex"),
            salt: salt,
          },
        });

        const newPermission = await tx.permission.create({
          data: {
            name: "ODDS",
          },
        });

        await tx.permissionAssignment.create({
          data: {
            userId: user2.id,
            permissionId: newPermission.id,
          },
        });

        await tx.booky.createMany({
          data: bookmakers.map((b) => ({
            id: +b.bookmaker_id,
            name: b.name,
          })),
        });

        await tx.fixture.createMany({
          data: fixtures.map((f) => ({
            id: +f.fixture_id,
            startTime: new Date(f.start_time),
            countryName: f.country_name,
            competition: f.competition,
            home: f.home,
            away: f.away,
          })),
        });

        await tx.oddsType.createMany({
          data: [
            {
              id: 3,
              name: "Match",
            },
            {
              id: 1,
              name: "OU Goals",
            },
          ],
        });

        await tx.odds.createMany({
          data: odds.map((o, idx) => ({
            id: idx + 1,
            bookyId: +o.bookmaker_id,
            typeId: +o.odds_type,
            fixtureId: +o.fixture_id,
            timestamp: new Date(+o.timestamp),
            marketParams: o.market_parameters.replace("line=", ""),
          })),
        });

        const priceNames = [
          { name: "part1", id: 1 },
          { name: "part2", id: 2 },
          { name: "draw", id: 3 },
          { name: "under", id: 4 },
          { name: "over", id: 5 },
        ];
        await tx.priceName.createMany({
          data: priceNames,
        });

        await tx.price.createMany({
          data: odds
            .map((o, oIdx) => {
              const parsedPrices: number[] = JSON.parse(o.prices);
              const parsedPriceNames = JSON.parse(o.price_names);

              return parsedPrices.map((p, pIdx) => ({
                oddsId: oIdx + 1,
                priceNameId: priceNames.find(
                  (pn) => pn.name === parsedPriceNames[pIdx]
                )!.id,
                value: +p,
              }));
            })
            .flat(),
        });
      },
      {
        timeout: 20000,
      }
    );

    console.log("seeding success");
  } catch (e) {
    console.error("error seeding", e);
  }
};
