import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = "fooo";

export const generateToken = (
  email: string,
  username: string,
  userId: number
) => {
  const token = jwt.sign(
    {
      email,
      username,
      userId,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  return token;
};

export const validateToken = (token: string) => {
  try {
    const parsed = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return {
      parsed: {
        email: parsed.email,
        username: parsed.username,
        userId: Number(parsed.userId),
        superUserId: Number(parsed.superUserId),
      },
    };
  } catch (e) {
    return { parsed: undefined };
  }
};
