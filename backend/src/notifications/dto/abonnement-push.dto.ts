import { IsNotEmpty, IsObject, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ClesPush {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class AbonnementPushDto {
  // L'adresse fournie par le service de push du navigateur. `require_protocol`
  // est indispensable : sans lui, une simple chaîne de texte passerait pour
  // une adresse valide.
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https', 'http'] })
  endpoint: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ClesPush)
  keys: ClesPush;
}

export class DesabonnementPushDto {
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https', 'http'] })
  endpoint: string;
}
