export class ClickEventDto {
  userId!: number;
  postId?: number | string; // Post ID (luôn có khi user click vào kết quả search)
  roomId?: number | string; // Room ID (optional, nếu Post có roomId)
  amenities?: string[]; // Optional: nếu FE đã có sẵn thì gửi luôn, không cần query ES
}

