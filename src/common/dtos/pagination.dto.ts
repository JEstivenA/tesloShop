import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsPositive, Min,  } from "class-validator";


export class PaginationDto {

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsPositive()
  @Type(() => Number) //Transforma el valor a number
  limit?: number;
}