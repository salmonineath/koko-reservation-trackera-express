import type { UserDto } from "@/modules/users/user.dto";

// Shape of the JWT access token's payload. Also declared globally on
// `Express.Request.user` - see src/types/express.d.ts.
export interface AuthTokenPayload {
  sub: number;
  email: string;
}

// What a successful login/refresh hands back to the controller: a token pair
// plus the user they belong to.
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
