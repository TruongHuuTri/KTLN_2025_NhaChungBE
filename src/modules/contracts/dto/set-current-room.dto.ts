import { IsString, IsNumber, IsDateString } from 'class-validator';

export class SetCurrentRoomDto {
  @IsNumber()
  roomId: number;

  @IsNumber()
  landlordId: number;

  @IsNumber()
  contractId: number;

  @IsDateString()
  moveInDate: string;

  @IsNumber()
  monthlyRent: number;
}
