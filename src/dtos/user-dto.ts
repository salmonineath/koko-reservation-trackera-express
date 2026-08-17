// Explicit response shape for a User. Listed field-by-field so it's obvious
// at a glance what leaves the API - most importantly, that passwordHash never
// does. Adding a column to schema.prisma never silently exposes it here.
export type UserDto = {
  id: number;
  email: string;
  createdAt: Date;
};

// Accepts anything with at least these fields (e.g. a Prisma `select` result
// that already omits passwordHash) rather than requiring the full User model.
export const toUserDto = (user: UserDto): UserDto => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt,
});
