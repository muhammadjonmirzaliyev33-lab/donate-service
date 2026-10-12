import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { parseCookies } from '../../../common/utils/cookies';
import { AppException, ErrorCode } from '../../../common/errors';
import { adminLoginSchema, type AdminLoginInput } from '../schemas/admin-login.schema';
import { AdminAccountsService } from '../services/admin-accounts.service';
import { AdminSessionService, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '../services/admin-session.service';
import { AdminRefreshTokensRepository } from '../repositories/admin-refresh-tokens.repository';
import { AuditLogService } from '../../audit-log/services/audit-log.service';

const ACCESS_COOKIE = 'admin_access';
const REFRESH_COOKIE = 'admin_refresh';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/admin-auth',
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
};

/** admin.komakpay.uz uchun — Telegram initData'ga bog'liq bo'lmagan login/parol kirish. */
@Controller('admin-auth')
export class AdminAuthController {
  constructor(
    private readonly accounts: AdminAccountsService,
    private readonly sessions: AdminSessionService,
    private readonly refreshTokens: AdminRefreshTokensRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post('login')
  async login(@Body(new ZodValidationPipe(adminLoginSchema)) body: AdminLoginInput, @Res({ passthrough: true }) res: Response) {
    const accountId = await this.accounts.verifyCredentials(body.username, body.password);
    if (accountId === null) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    await this.issueTokenPair(res, accountId, body.username);
    await this.auditLog.log({
      action: 'auth.admin_login',
      actorType: 'admin',
      actorId: String(accountId),
      actorUsername: body.username,
    });
    return { username: body.username };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = parseCookies(req.header('cookie'))[REFRESH_COOKIE];
    const session = token ? this.sessions.verify(token, 'refresh') : null;
    const stillValid = session && (await this.refreshTokens.isValid(token!));

    if (!token || !session || !stillValid) {
      this.clearCookies(res);
      throw new AppException(ErrorCode.AUTH_INVALID_SESSION);
    }

    await this.refreshTokens.revoke(token);
    await this.issueTokenPair(res, session.accountId, session.username);
    return { username: session.username };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = parseCookies(req.header('cookie'))[REFRESH_COOKIE];
    if (token) {
      // revoke'dan OLDIN verify qilamiz — audit yozuvida kim chiqqanini bilish uchun
      // (token o'zi endi kerak emas, faqat undan accountId/username o'qib olinadi).
      const session = this.sessions.verify(token, 'refresh');
      await this.refreshTokens.revoke(token);
      if (session) {
        await this.auditLog.log({
          action: 'auth.admin_logout',
          actorType: 'admin',
          actorId: String(session.accountId),
          actorUsername: session.username,
        });
      }
    }
    this.clearCookies(res);
    return { ok: true };
  }

  private async issueTokenPair(res: Response, accountId: number, username: string): Promise<void> {
    const accessToken = this.sessions.issueAccess(accountId, username);
    const refreshToken = this.sessions.issueRefresh(accountId, username);
    await this.refreshTokens.create(accountId, refreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000));
    res.cookie(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  }

  private clearCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/admin-auth' });
  }
}
