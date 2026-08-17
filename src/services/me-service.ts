import { prisma } from "@/config/database";
import { toUserDto } from "@/dtos/user-dto";
import { HttpError } from "@/lib/http-error";

export const getCurrentUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true },
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return toUserDto(user);
};
