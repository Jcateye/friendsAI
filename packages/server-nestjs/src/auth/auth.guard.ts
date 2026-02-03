import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }
    
    const token = authHeader.substring(7);
    
    // Parse token format: token_{userId}_{timestamp}
    const parts = token.split('_');
    if (parts.length < 3 || parts[0] !== 'token') {
      throw new UnauthorizedException('Invalid token format');
    }
    
    const userId = parts[1];
    
    // Attach user to request
    request.user = { id: userId };
    
    return true;
  }
}
