import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/shared/errors";
import { toUserDto, type UserDto } from "./user.dto";

export const getCurrentUser = async (userId: number): Promise<UserDto> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, username: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return toUserDto(user);
};
