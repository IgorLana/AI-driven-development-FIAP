import { IsString, IsNotEmpty, MinLength, MaxLength, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Category } from '../../../common/enums/category.enum';

export class CreateChallengeDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(100)
    title: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(500)
    description: string;

    @IsEnum(Category)
    @IsNotEmpty()
    category: Category;

    @IsInt()
    @Min(1)
    @Max(100)
    xpReward: number;
}
