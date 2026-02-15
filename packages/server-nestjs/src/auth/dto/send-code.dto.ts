import { ApiProperty } from '@nestjs/swagger';

export class SendCodeDto {
    @ApiProperty({ description: 'Email or phone number to send verification code' })
    emailOrPhone: string;
}
