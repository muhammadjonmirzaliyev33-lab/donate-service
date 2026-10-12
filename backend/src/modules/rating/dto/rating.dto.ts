export interface RatingEntryDto {
  rank: number;
  displayName: string;
  totalAmount: number;
  isMe: boolean;
}

export interface RatingResponseDto {
  top: RatingEntryDto[];
  me: RatingEntryDto | null;
}
