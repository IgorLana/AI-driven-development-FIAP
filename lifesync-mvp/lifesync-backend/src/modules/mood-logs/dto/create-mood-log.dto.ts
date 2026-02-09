import { IsInt, Min, Max, IsOptional, IsArray, MaxLength, IsString } from 'class-validator';

export class CreateMoodLogDto {
    @IsInt()
    @Min(1)
    @Max(5)
    mood: number;

    @IsOptional()
    @IsArray()
    @MaxLength(5, { each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}
